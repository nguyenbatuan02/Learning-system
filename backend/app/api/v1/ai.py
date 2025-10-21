from fastapi import APIRouter, Depends, HTTPException, status
from supabase import Client
from app.core.supabase import get_supabase, get_supabase_admin
from app.api.deps import get_current_user
from app.models.ai import (
    AnalyzeTextRequest, AnalyzeTextResponse,
    GenerateSimilarRequest, GradeEssayRequest, GradeEssayResponse
)
from app.services.chatgpt_service import chatgpt_service
import logging
import json

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/analyze-text", response_model=AnalyzeTextResponse)
async def analyze_text(
    data: AnalyzeTextRequest,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_admin)
):
    """
    Phân tích text và trích xuất câu hỏi
    """
    try:
        if not data.text.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Text cannot be empty"
            )
        
        # Call ChatGPT
        result = chatgpt_service.analyze_questions(data.text, data.language)
        
        if not result.get("questions"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No questions found in the text"
            )
        
        bank_name = result.get("exam_title") or f"Ngân hàng từ AI - {current_user['email'][:20]}"
        bank_description = result.get("exam_description") or "Tự động tạo từ AI"
        

        logger.info(f"💾 Creating question bank...")
        
        bank_data = {
            "user_id": current_user["id"],
            "name": bank_name,
            "description": bank_description,
            "is_public": False
        }
        
        bank_response = supabase.table("question_banks").insert(bank_data).execute()
        bank_id = bank_response.data[0]["id"]
    
        questions_to_insert = []
        allowed_types = ['multiple_choice', 'multiple_answer', 'true_false', 
                        'short_answer', 'essay', 'fill_blank', 'ordering']
        
        for idx, q in enumerate(result["questions"]):
            q_type = q.get("question_type", "multiple_choice")
            
            if q_type not in allowed_types:
                logger.warning(f"Unknown question type '{q_type}', defaulting to 'multiple_choice'")
                q_type = "multiple_choice"
            
            correct_ans = q["correct_answer"]
            
            question_item = {
                "question_bank_id": bank_id,
                "question_text": q["question_text"],
                "question_type": q_type,
                "options": q.get("options"),
                "correct_answer": correct_ans,
                "marks": 1,
                "explanation": q.get("explanation"),
                "difficulty": "medium",
                "tags": [],
                "times_used": 0,
                "times_correct": 0,
                "times_incorrect": 0
            }
            questions_to_insert.append(question_item)
        
        # Insert questions
        questions_response = supabase.table("question_bank_items").insert(questions_to_insert).execute()
        question_items = questions_response.data

    
        
        # Track analytics
        try:
            supabase.rpc('track_action', {
                'p_user_id': current_user['id'],
                'p_action_type': 'ai_create_question_bank',
                'p_metadata': {
                    'bank_id': bank_id,
                    'questions_count': len(question_items)
                }
            }).execute()
        except Exception as analytics_error:
            logger.warning(f"Analytics tracking failed: {str(analytics_error)}")
            pass

        result["bank_id"] = bank_id
        result["bank_name"] = bank_name
        return AnalyzeTextResponse(**result)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Analysis error: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to analyze text: {str(e)}"
        )


@router.post("/analyze-file/{file_id}")
async def analyze_uploaded_file(
    file_id: str,
    language: str = "vi",
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_admin)
):
    """
    Phân tích file đã upload và tạo exam tự động
    """
    try:
        logger.info(f"📄 Analyzing file: {file_id}")
        
        # Get file record
        file_record = supabase.table("uploaded_files")\
            .select("*")\
            .eq("id", file_id)\
            .eq("user_id", current_user["id"])\
            .single()\
            .execute()
        
        if not file_record.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="File not found"
            )
        
        file_data = file_record.data
        
        if not file_data.get("extracted_text"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File has not been processed yet. Please process it first."
            )
        
        # Analyze with ChatGPT
        logger.info(f"🤖 Sending to ChatGPT...")
        analysis_result = chatgpt_service.analyze_questions(
            file_data["extracted_text"], 
            language
        )
        
        if not analysis_result.get("questions"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No questions found in the text"
            )
        
        # Create exam
        logger.info(f"📝 Creating exam...")
        exam_data = {
            "title": analysis_result.get("exam_title") or f"Exam from {file_data['file_name']}",
            "description": analysis_result.get("exam_description") or "Auto-generated from uploaded file",
            "created_by": current_user["id"],
            "is_published": False,
            "total_marks": len(analysis_result["questions"])
        }
        
        exam_response = supabase.table("exams").insert(exam_data).execute()
        exam_id = exam_response.data[0]["id"]
        
        # Add questions
        logger.info(f"❓ Adding {len(analysis_result['questions'])} questions...")
        questions_to_insert = []
        
        for idx, q in enumerate(analysis_result["questions"]):
            question = {
                "exam_id": exam_id,
                "question_text": q["question_text"],
                "question_type": q.get("question_type", "multiple_choice"),
                "options": q.get("options"),
                "correct_answer": q["correct_answer"],
                "marks": 1,
                "explanation": q.get("explanation"),
                "order_index": idx
            }
            questions_to_insert.append(question)
        
        supabase.table("questions").insert(questions_to_insert).execute()
        
        # Update file record
        supabase.table("uploaded_files")\
            .update({"exam_id": exam_id})\
            .eq("id", file_id)\
            .execute()
        
        logger.info(f"✅ Exam created: {exam_id}")
        
        return {
            "message": "Exam created successfully",
            "exam_id": exam_id,
            "questions_count": len(analysis_result["questions"]),
            "exam_title": exam_data["title"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ File analysis error: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to analyze file: {str(e)}"
        )

@router.post("/generate-similar")
async def generate_similar_questions(
    data: GenerateSimilarRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Tạo câu hỏi tương tự
    """
    try:
        questions = chatgpt_service.generate_similar_questions(
            data.question, 
            data.count
        )
        
        return {"questions": questions}
        
    except Exception as e:
        logger.error(f"❌ Generate similar error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.post("/grade-essay", response_model=GradeEssayResponse)
async def grade_essay(
    data: GradeEssayRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Chấm bài tự luận bằng AI
    """
    try:
        result = chatgpt_service.grade_essay(
            data.question,
            data.student_answer,
            data.correct_answer
        )
        
        return GradeEssayResponse(**result)
        
    except Exception as e:
        logger.error(f"❌ Essay grading error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )