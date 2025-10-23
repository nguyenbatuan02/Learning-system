from fastapi import APIRouter, Depends, HTTPException, Query
from supabase import Client
from app.core.supabase import get_supabase_admin
from app.api.deps import get_current_user
from typing import List, Optional
import random
import logging

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/")
async def get_all_exams(
    is_published: Optional[bool] = None,
    search: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_admin)
):
    """Lấy danh sách đề thi của user"""
    try:
        # User chỉ thấy đề của mình
        query = supabase.table("exams")\
            .select("*, question_banks(name, id)")\
            .eq("created_by", current_user["id"])
        
        if is_published is not None:
            query = query.eq("is_published", is_published)
        
        if search:
            query = query.ilike("title", f"%{search}%")
        
        result = query.order("created_at", desc=True).execute()
        
        # Count questions for each exam
        exams = []
        for exam in result.data:
            questions_count = supabase.table("exam_questions")\
                .select("id", count="exact")\
                .eq("exam_id", exam["id"])\
                .execute()
            
            exam["questions_count"] = questions_count.count
            exams.append(exam)
        
        return exams
        
    except Exception as e:
        logger.error(f"Get exams error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{exam_id}")
async def get_exam_detail(
    exam_id: str,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_admin)
):
    """Lấy chi tiết đề thi kèm câu hỏi"""
    try:
        # Get exam
        exam = supabase.table("exams")\
            .select("*, question_banks(name, id)")\
            .eq("id", exam_id)\
            .single()\
            .execute()
        
        if not exam.data:
            raise HTTPException(status_code=404, detail="Exam not found")
        
        # Check permission
        if exam.data["created_by"] != current_user["id"]:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Get questions through exam_questions
        exam_questions = supabase.table("exam_questions")\
            .select("*, question_bank_items(*)")\
            .eq("exam_id", exam_id)\
            .order("order_index")\
            .execute()
        
        questions = [
            {
                **eq["question_bank_items"],
                "exam_question_id": eq["id"],
                "order_index": eq["order_index"],
                "marks": eq["marks"]
            }
            for eq in exam_questions.data
        ]
        
        return {
            **exam.data,
            "questions_count": len(questions),
            "questions": questions
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get exam detail error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    
@router.get("/{exam_id}/take")
async def take_exam(
    exam_id: str,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_admin)
):
    """
    Endpoint cho học sinh làm bài thi
    Trả về đề thi với câu hỏi (không có đáp án đúng)
    """
    try:
        # Get exam
        exam = supabase.table("exams")\
            .select("*, question_banks(name, id)")\
            .eq("id", exam_id)\
            .execute()
        
        if not exam.data or len(exam.data) == 0:
            raise HTTPException(status_code=404, detail="Exam not found")
        
        exam_data = exam.data[0]
        #  Check if published
        if not exam_data.get("is_published", False):
            raise HTTPException(status_code=403, detail="Exam is not published yet")
        
        # Get questions (without correct answers and explanations)
        exam_questions = supabase.table("exam_questions")\
            .select("*, question_bank_items(*)")\
            .eq("exam_id", exam_id)\
            .order("order_index")\
            .execute()
        
        # Remove correct answers and explanations from questions
        questions = []
        for eq in exam_questions.data:
            q = eq["question_bank_items"].copy()
            # Remove sensitive data
            q.pop("correct_answer", None)
            q.pop("explanation", None)
            q.pop("times_correct", None)
            q.pop("times_incorrect", None)
            q.pop("times_used", None)
            
            questions.append({
                **q,
                "exam_question_id": eq["id"],
                "order_index": eq["order_index"],
                "marks": eq["marks"]
            })
            # Shuffle questions if enabled
        if exam_data.get("shuffle_questions", False):
            import random
            random.shuffle(questions)
            # Re-index after shuffle
            for idx, q in enumerate(questions):
                q["order_index"] = idx
        
        return {
            "id": exam_data["id"],
            "title": exam_data["title"],
            "description": exam_data.get("description"),
            "duration_minutes": exam_data["duration_minutes"],
            "total_marks": exam_data["total_marks"],
            "passing_marks": exam_data.get("passing_marks"),
            "shuffle_options": exam_data.get("shuffle_options", False),
            "is_published": exam_data["is_published"],
            "questions": questions,
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Take exam error: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/create-from-bank")
async def create_exam_from_question_bank(
    data: dict,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_admin)
):
    """
    Tạo đề thi từ ngân hàng câu hỏi - RANDOM MODE
    
    Body:
    {
        "title": "Tên đề thi",
        "description": "Mô tả",
        "duration_minutes": 60,
        "question_bank_id": "uuid",
        "question_count": 20,
        "difficulty_filter": "medium" (optional),
        "category_filter": "string" (optional),
        "shuffle_questions": true,
        "shuffle_options": true
    }
    """
    try:
        logger.info(f"📝 Creating exam from bank (RANDOM)...")
        
        # Validate required fields
        required_fields = ["title", "duration_minutes", "question_bank_id", "question_count"]
        for field in required_fields:
            if field not in data:
                raise HTTPException(status_code=400, detail=f"Missing field: {field}")
        
        # 1. Verify question bank
        bank = supabase.table("question_banks")\
            .select("*")\
            .eq("id", data["question_bank_id"])\
            .single()\
            .execute()
        
        if not bank.data:
            raise HTTPException(status_code=404, detail="Question bank not found")
        
        # Check permission
        if bank.data['user_id'] != current_user['id'] and not bank.data['is_public']:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # 2. Get questions with filters
        query = supabase.table("question_bank_items")\
            .select("*")\
            .eq("question_bank_id", data["question_bank_id"])
        
        if data.get("difficulty_filter"):
            query = query.eq("difficulty", data["difficulty_filter"])
        
        if data.get("category_filter"):
            query = query.eq("category", data["category_filter"])
        
        available_questions = query.execute().data
        
        if not available_questions:
            raise HTTPException(status_code=400, detail="No questions found matching filters")
        
        # 3. Random select questions
        question_count = data["question_count"]
        if len(available_questions) < question_count:
            raise HTTPException(
                status_code=400,
                detail=f"Not enough questions. Available: {len(available_questions)}, Requested: {question_count}"
            )
        
        selected_questions = random.sample(available_questions, question_count)
        
        # 4. Calculate total marks
        total_marks = sum(q.get('marks', 1) for q in selected_questions)
        
        # 5. Create exam
        exam_data = {
            "title": data["title"],
            "description": data.get("description"),
            "created_by": current_user["id"],
            "question_bank_id": data["question_bank_id"],
            "duration_minutes": data["duration_minutes"],
            "total_marks": total_marks,
            "passing_marks": int(data.get("passing_marks", total_marks * 0.7)),
            "shuffle_questions": data.get("shuffle_questions", True),
            "shuffle_options": data.get("shuffle_options", True),
            "show_results_immediately": data.get("show_results_immediately", True),
            "allow_review": data.get("allow_review", True),
            "is_published": False
        }
        
        exam_response = supabase.table("exams").insert(exam_data).execute()
        exam_id = exam_response.data[0]["id"]
        
        # 6. Link questions to exam
        exam_questions = []
        for idx, question in enumerate(selected_questions):
            exam_questions.append({
                "exam_id": exam_id,
                "question_bank_item_id": question["id"],
                "order_index": idx,
                "marks": question.get("marks", 1)
            })
        
        supabase.table("exam_questions").insert(exam_questions).execute()
        
        # 7. Update question usage stats
        for q in selected_questions:
            supabase.table("question_bank_items")\
                .update({"times_used": (q.get('times_used', 0) + 1)})\
                .eq("id", q["id"])\
                .execute()
        
        logger.info(f"✅ Exam created: {exam_id} with {len(selected_questions)} questions")
        
        return {
            **exam_response.data[0],
            "questions_count": len(selected_questions)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Create exam error: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Failed to create exam: {str(e)}")


@router.post("/create-from-selected")
async def create_exam_from_selected_questions(
    data: dict,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_admin)
):
    """
    Tạo đề thi từ DANH SÁCH CÂU HỎI CỤ THỂ - SELECT MODE
    
    Body:
    {
        "title": "Tên đề thi",
        "description": "Mô tả",
        "duration_minutes": 60,
        "question_bank_id": "uuid",
        "question_ids": ["uuid1", "uuid2", ...],
        "shuffle_questions": true,
        "shuffle_options": true
    }
    """
    try:
        logger.info(f"📝 Creating exam from selected questions...")
        
        # Validate required fields
        required_fields = ["title", "duration_minutes", "question_bank_id", "question_ids"]
        for field in required_fields:
            if field not in data:
                raise HTTPException(status_code=400, detail=f"Missing field: {field}")
        
        if not data["question_ids"] or len(data["question_ids"]) == 0:
            raise HTTPException(status_code=400, detail="No questions selected")
        
        # 1. Verify question bank
        bank = supabase.table("question_banks")\
            .select("*")\
            .eq("id", data["question_bank_id"])\
            .single()\
            .execute()
        
        if not bank.data:
            raise HTTPException(status_code=404, detail="Question bank not found")
        
        if bank.data['user_id'] != current_user['id'] and not bank.data['is_public']:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # 2. Get selected questions
        selected_questions = supabase.table("question_bank_items")\
            .select("*")\
            .eq("question_bank_id", data["question_bank_id"])\
            .in_("id", data["question_ids"])\
            .execute()
        
        if len(selected_questions.data) != len(data["question_ids"]):
            raise HTTPException(status_code=400, detail="Some questions not found")
        
        # 3. Calculate total marks
        total_marks = sum(q.get('marks', 1) for q in selected_questions.data)
        
        # 4. Create exam
        exam_data = {
            "title": data["title"],
            "description": data.get("description"),
            "created_by": current_user["id"],
            "question_bank_id": data["question_bank_id"],
            "duration_minutes": data["duration_minutes"],
            "total_marks": total_marks,
            "passing_marks": int(data.get("passing_marks", total_marks * 0.7)),
            "shuffle_questions": data.get("shuffle_questions", True),
            "shuffle_options": data.get("shuffle_options", True),
            "show_results_immediately": data.get("show_results_immediately", True),
            "allow_review": data.get("allow_review", True),
            "is_published": False
        }
        
        exam_response = supabase.table("exams").insert(exam_data).execute()
        exam_id = exam_response.data[0]["id"]
        
        # 5. Link questions to exam (preserve user's selection order)
        exam_questions = []
        for idx, question_id in enumerate(data["question_ids"]):
            # Find question in selected_questions
            question = next((q for q in selected_questions.data if q["id"] == question_id), None)
            if question:
                exam_questions.append({
                    "exam_id": exam_id,
                    "question_bank_item_id": question["id"],
                    "order_index": idx,
                    "marks": question.get("marks", 1)
                })
        
        supabase.table("exam_questions").insert(exam_questions).execute()
        
        # 6. Update question usage stats
        for q in selected_questions.data:
            supabase.table("question_bank_items")\
                .update({"times_used": (q.get('times_used', 0) + 1)})\
                .eq("id", q["id"])\
                .execute()
        
        logger.info(f"✅ Exam created: {exam_id} with {len(exam_questions)} questions")
        
        return {
            **exam_response.data[0],
            "questions_count": len(exam_questions)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Create exam error: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{exam_id}")
async def update_exam(
    exam_id: str,
    data: dict,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_admin)
):
    """Cập nhật đề thi"""
    try:
        # Check ownership
        exam = supabase.table("exams")\
            .select("created_by")\
            .eq("id", exam_id)\
            .single()\
            .execute()
        
        if not exam.data or exam.data["created_by"] != current_user["id"]:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Update
        result = supabase.table("exams")\
            .update(data)\
            .eq("id", exam_id)\
            .execute()
        
        return result.data[0]
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{exam_id}")
async def delete_exam(
    exam_id: str,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_admin)
):
    """Xóa đề thi"""
    try:
        exam_query = supabase.table("exams")\
            .select("*")\
            .eq("id", exam_id)\
            .execute()
        
        if not exam_query.data or len(exam_query.data) == 0:
            raise HTTPException(status_code=404, detail="Exam not found")
        
        exam = exam_query.data[0]
        if exam["created_by"] != current_user["id"]:
            raise HTTPException(status_code=403, detail="Access denied")
        

        exam_delete = supabase.table("exams")\
            .delete()\
            .eq("id", exam_id)\
            .execute()
        
        
    except HTTPException as he:
        raise
    except Exception as e:
        import traceback
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))
        
    

@router.post("/{exam_id}/publish")
async def publish_exam(
    exam_id: str,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_admin)
):
    """Publish đề thi"""
    try:
        result = supabase.table("exams")\
            .update({"is_published": True})\
            .eq("id", exam_id)\
            .eq("created_by", current_user["id"])\
            .execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Exam not found")
        
        return {"message": "Exam published successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{exam_id}/unpublish")
async def unpublish_exam(
    exam_id: str,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_admin)
):
    """Unpublish đề thi"""
    try:
        result = supabase.table("exams")\
            .update({"is_published": False})\
            .eq("id", exam_id)\
            .eq("created_by", current_user["id"])\
            .execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Exam not found")
        
        return {"message": "Exam unpublished successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))