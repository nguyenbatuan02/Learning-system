from fastapi import APIRouter, Depends, HTTPException, status
from supabase import Client
from app.core.supabase import get_supabase, get_supabase_admin
from app.api.deps import get_current_user
from app.models.submission import (
    StartExamRequest, StartExamResponse,
    SubmitAnswerRequest, SubmitExamRequest,
    ExamResultResponse, QuestionResult
)
from app.services.grading_service import grading_service
from datetime import datetime, timezone
import logging
import traceback
import json

router = APIRouter()
logger = logging.getLogger(__name__)


def serialize_answer(answer):
    """Convert answer to string for consistent API response"""
    if answer is None:
        return ""
    if isinstance(answer, list):
        return ", ".join(str(item) for item in answer)
    if isinstance(answer, dict):
        return json.dumps(answer)
    return str(answer)


@router.post("/start", response_model=StartExamResponse)
async def start_exam(
    data: StartExamRequest,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_admin)
):
    """
    Bắt đầu làm bài thi
    """
    try:
        # Get exam details
        exam = supabase.table("exams")\
            .select("*")\
            .eq("id", data.exam_id)\
            .single()\
            .execute()
        
        if not exam.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Exam not found"
            )
        
        # Check if exam is published
        if not exam.data.get("is_published", False):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Exam is not published yet"
            )
        
        # Create user_exam record
        user_exam = {
            "user_id": current_user["id"],
            "exam_id": data.exam_id,
            "status": "in_progress"
        }
        
        response = supabase.table("user_exams").insert(user_exam).execute()
        
        logger.info(f"User {current_user['email']} started exam {data.exam_id}")
        
        return StartExamResponse(
            user_exam_id=response.data[0]["id"],
            exam_id=data.exam_id,
            started_at=response.data[0]["started_at"],
            duration=exam.data.get("duration_minutes")
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Start exam error: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/answer")
async def submit_answer(
    data: SubmitAnswerRequest,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_admin)
):
    """
    Lưu câu trả lời (không chấm điểm ngay)
    """
    try:
        # Verify ownership
        user_exam = supabase.table("user_exams")\
            .select("*")\
            .eq("id", data.user_exam_id)\
            .eq("user_id", current_user["id"])\
            .single()\
            .execute()
        
        if not user_exam.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Exam session not found"
            )
        
        if user_exam.data["status"] != "in_progress":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Exam is already submitted"
            )
        
        # Convert user_answer to appropriate format for storage
        user_answer_value = data.user_answer
        if isinstance(user_answer_value, list):
            user_answer_value = json.dumps(user_answer_value)
        
        # Check if answer already exists
        existing = supabase.table("user_answers")\
            .select("id")\
            .eq("user_exam_id", data.user_exam_id)\
            .eq("question_id", data.question_id)\
            .execute()
        
        if existing.data:
            # Update existing answer
            supabase.table("user_answers")\
                .update({"user_answer": user_answer_value})\
                .eq("id", existing.data[0]["id"])\
                .execute()
        else:
            # Insert new answer
            answer = {
                "user_exam_id": data.user_exam_id,
                "question_id": data.question_id,
                "user_answer": user_answer_value
            }
            supabase.table("user_answers").insert(answer).execute()
        
        return {"message": "Answer saved"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Submit answer error: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/submit", response_model=ExamResultResponse)
async def submit_exam(
    data: SubmitExamRequest,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_admin)
):
    """
    Nộp bài thi và chấm điểm
    """
    try:
        # Get user_exam
        user_exam = supabase.table("user_exams")\
            .select("*")\
            .eq("id", data.user_exam_id)\
            .eq("user_id", current_user["id"])\
            .execute()
        
        if not user_exam.data or len(user_exam.data) == 0:
            all_exams = supabase.table("user_exams")\
                .select("id, exam_id, status, created_at")\
                .eq("user_id", current_user["id"])\
                .order("created_at", desc=True)\
                .limit(10)\
                .execute()
            
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Exam session {data.user_exam_id} not found"
            )
        
        user_exam_data = user_exam.data[0]
        
        if user_exam_data["status"] != "in_progress":
            logger.warning(f"⚠️ Exam status is {user_exam_data['status']}, not in_progress")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Exam is already {user_exam_data['status']}"
            )
        
        # Get exam details
        exam = supabase.table("exams")\
            .select("*")\
            .eq("id", user_exam_data["exam_id"])\
            .execute()
        
        if not exam.data or len(exam.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Exam not found"
            )
        
        exam_data = exam.data[0]
        
        # Get questions from exam_questions with question_bank_items
        exam_questions = supabase.table("exam_questions")\
            .select("*, question_bank_items(*)")\
            .eq("exam_id", user_exam_data["exam_id"])\
            .order("order_index")\
            .execute()
        
        if not exam_questions.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No questions found for this exam"
            )
        
        # Get user answers
        user_answers = supabase.table("user_answers")\
            .select("*")\
            .eq("user_exam_id", data.user_exam_id)\
            .execute()
        
        answer_map = {ans["question_id"]: ans for ans in user_answers.data}
        
        # Grade each question
        total_score = 0
        results = []
        
        for exam_question in exam_questions.data:
            question = exam_question.get("question_bank_items")
            
            if not question:
                logger.warning(f"⚠️ Question bank item not found for exam_question {exam_question['id']}")
                continue
            
            user_answer_record = answer_map.get(exam_question["id"])
            user_answer_text = user_answer_record["user_answer"] if user_answer_record else ""
            
            # Parse user_answer if it's a JSON string
            if user_answer_text and isinstance(user_answer_text, str):
                try:
                    parsed = json.loads(user_answer_text)
                    user_answer_text = parsed
                except:
                    pass
            
            if not user_answer_text:
                is_correct = False
                marks_obtained = 0
                feedback = "Chưa trả lời"
            else:
                is_correct, marks_obtained, feedback = grading_service.grade_answer(
                    question["question_type"],
                    question["question_text"],
                    user_answer_text,
                    question["correct_answer"],
                    exam_question["marks"]
                )
            
            total_score += marks_obtained
            
            if user_answer_record:
                supabase.table("user_answers")\
                    .update({
                        "is_correct": is_correct,
                        "marks_obtained": marks_obtained,
                        "ai_feedback": feedback
                    })\
                    .eq("id", user_answer_record["id"])\
                    .execute()
            
            results.append(QuestionResult(
                question_id=exam_question["id"],
                question_text=question["question_text"],
                user_answer=serialize_answer(user_answer_text),
                correct_answer=serialize_answer(question["correct_answer"]),
                is_correct=is_correct,
                marks_obtained=marks_obtained,
                marks=float(exam_question["marks"]),
                explanation=question.get("explanation"),
                ai_feedback=feedback
            ))
        
        # Calculate time spent
        try:
            started_at_str = user_exam_data["started_at"]
            
            if isinstance(started_at_str, str):
                started_at_str = started_at_str.replace('Z', '+00:00')
                started_at = datetime.fromisoformat(started_at_str)
            else:
                started_at = started_at_str
            
            if started_at.tzinfo is None:
                started_at = started_at.replace(tzinfo=timezone.utc)
            
            submitted_at = datetime.now(timezone.utc)
            time_spent = int((submitted_at - started_at).total_seconds())
        
        except Exception as e:
            logger.error(f"Time calculation error: {str(e)}")
            time_spent = 0
            submitted_at = datetime.now(timezone.utc)
        update_result = supabase.table("user_exams")\
            .update({
                "submitted_at": submitted_at.isoformat(),
                "total_score": total_score,
                "time_spent": time_spent,
                "status": "graded"
            })\
            .eq("id", data.user_exam_id)\
            .execute()
        
        # Update user statistics
        _update_user_statistics(current_user["id"], total_score, time_spent, supabase)
        response = ExamResultResponse(
            user_exam_id=data.user_exam_id, 
            exam_title=exam_data["title"],
            total_score=total_score,
            max_score=float(exam_data["total_marks"]),
            percentage=(total_score / exam_data["total_marks"] * 100) if exam_data["total_marks"] > 0 else 0,
            time_spent=time_spent,
            submitted_at=submitted_at,
            questions=results
        )
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Submit exam error: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
    
@router.get("/result/{user_exam_id}", response_model=ExamResultResponse)
async def get_exam_result(
    user_exam_id: str,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_admin)
):
    """
    Xem kết quả bài thi đã làm
    """
    try:
        user_exam = supabase.table("user_exams")\
            .select("*")\
            .eq("id", user_exam_id)\
            .eq("user_id", current_user["id"])\
            .execute() 
        if not user_exam.data or len(user_exam.data) == 0:
            all_user_exams = supabase.table("user_exams")\
                .select("id, user_id, exam_id, status")\
                .eq("user_id", current_user["id"])\
                .execute()
            
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Result not found for exam {user_exam_id}"
            )
        
        user_exam_data = user_exam.data[0] 
        # Get exam
        exam = supabase.table("exams")\
            .select("*")\
            .eq("id", user_exam_data["exam_id"])\
            .execute()
        
        if not exam.data or len(exam.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Exam not found"
            )
        
        exam_data = exam.data[0]
        exam_questions = supabase.table("exam_questions")\
            .select("*, question_bank_items(*)")\
            .eq("exam_id", user_exam_data["exam_id"])\
            .order("order_index")\
            .execute()
        
        user_answers = supabase.table("user_answers")\
            .select("*")\
            .eq("user_exam_id", user_exam_id)\
            .execute()
        
        answer_map = {ans["question_id"]: ans for ans in user_answers.data}
        
        results = []
        for exam_question in exam_questions.data:
            question = exam_question.get("question_bank_items")
            
            if not question:
                logger.warning(f"⚠️ Question bank item not found for exam_question {exam_question['id']}")
                continue
            
            answer = answer_map.get(exam_question["id"])
            
            user_answer_text = ""
            if answer and answer.get("user_answer"):
                user_answer_text = answer["user_answer"]
                if isinstance(user_answer_text, str):
                    try:
                        parsed = json.loads(user_answer_text)
                        user_answer_text = parsed
                    except:
                        pass
            
            results.append(QuestionResult(
                question_id=exam_question["id"],
                question_text=question.get("question_text", ""),
                user_answer=serialize_answer(user_answer_text),
                correct_answer=serialize_answer(question.get("correct_answer", "")),
                is_correct=answer.get("is_correct", False) if answer else False,
                marks_obtained=float(answer.get("marks_obtained", 0)) if answer else 0.0,
                marks=float(exam_question.get("marks", 0)),
                explanation=question.get("explanation"),
                ai_feedback=answer.get("ai_feedback") if answer else None
            ))
        
        total_score = float(user_exam_data.get("total_score") or 0)
        max_score = float(exam_data.get("total_marks") or 1)
        time_spent = int(user_exam_data.get("time_spent") or 0)
        
        submitted_at = user_exam_data.get("submitted_at")
        if submitted_at and isinstance(submitted_at, str):
            try:
                submitted_at = datetime.fromisoformat(submitted_at.replace('Z', '+00:00'))
            except:
                submitted_at = datetime.now(timezone.utc)
        elif not submitted_at:
            submitted_at = datetime.now(timezone.utc)
        
        return ExamResultResponse(
            user_exam_id=user_exam_id,
            exam_title=exam_data.get("title", "Untitled Exam"),
            total_score=total_score,
            max_score=max_score,
            percentage=(total_score / max_score * 100) if max_score > 0 else 0,
            time_spent=time_spent,
            submitted_at=submitted_at,
            questions=results
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Get result error: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

def _update_user_statistics(user_id: str, score: float, time_spent: int, supabase: Client):
    """Update user statistics after exam"""
    try:
        # Get existing stats
        stats = supabase.table("user_statistics")\
            .select("*")\
            .eq("user_id", user_id)\
            .execute()
        
        if stats.data:
            # Update existing
            current = stats.data[0]
            new_total = current["total_exams_taken"] + 1
            new_avg = ((current["average_score"] * current["total_exams_taken"]) + score) / new_total
            
            supabase.table("user_statistics")\
                .update({
                    "total_exams_taken": new_total,
                    "total_exams_completed": current["total_exams_completed"] + 1,
                    "average_score": new_avg,
                    "total_time_spent": current["total_time_spent"] + time_spent,
                    "last_activity": datetime.now(timezone.utc).isoformat()
                })\
                .eq("user_id", user_id)\
                .execute()
        else:
            # Create new
            supabase.table("user_statistics").insert({
                "user_id": user_id,
                "total_exams_taken": 1,
                "total_exams_completed": 1,
                "average_score": score,
                "total_time_spent": time_spent,
                "last_activity": datetime.now(timezone.utc).isoformat()
            }).execute()
            
    except Exception as e:
        logger.error(f"Update statistics error: {str(e)}")
        logger.error(traceback.format_exc())