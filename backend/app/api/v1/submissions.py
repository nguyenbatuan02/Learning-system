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

router = APIRouter()
logger = logging.getLogger(__name__)

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
        if not exam.data["is_published"]:
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
            duration=exam.data.get("duration")
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Start exam error: {str(e)}")
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
        
        # Check if answer already exists
        existing = supabase.table("user_answers")\
            .select("id")\
            .eq("user_exam_id", data.user_exam_id)\
            .eq("question_id", data.question_id)\
            .execute()
        
        if existing.data:
            # Update existing answer
            supabase.table("user_answers")\
                .update({"user_answer": data.user_answer})\
                .eq("id", existing.data[0]["id"])\
                .execute()
        else:
            # Insert new answer
            answer = {
                "user_exam_id": data.user_exam_id,
                "question_id": data.question_id,
                "user_answer": data.user_answer
            }
            supabase.table("user_answers").insert(answer).execute()
        
        return {"message": "Answer saved"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Submit answer error: {str(e)}")
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
        logger.info(f"Submitting exam: {data.user_exam_id}")
        
        # Get user_exam
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
        
        # Get exam details
        exam = supabase.table("exams")\
            .select("*")\
            .eq("id", user_exam.data["exam_id"])\
            .single()\
            .execute()
        
        # Get questions
        questions = supabase.table("questions")\
            .select("*")\
            .eq("exam_id", user_exam.data["exam_id"])\
            .order("order_index")\
            .execute()
        
        # Get user answers
        user_answers = supabase.table("user_answers")\
            .select("*")\
            .eq("user_exam_id", data.user_exam_id)\
            .execute()
        
        # Create answer map
        answer_map = {ans["question_id"]: ans for ans in user_answers.data}
        
        # Grade each question
        total_score = 0
        results = []
        
        for question in questions.data:
            user_answer_record = answer_map.get(question["id"])
            user_answer_text = user_answer_record["user_answer"] if user_answer_record else ""
            
            if not user_answer_text:
                # No answer provided
                is_correct = False
                marks_obtained = 0
                feedback = "Chưa trả lời"
            else:
                # Grade the answer
                is_correct, marks_obtained, feedback = grading_service.grade_answer(
                    question["question_type"],
                    question["question_text"],
                    user_answer_text,
                    question["correct_answer"],
                    question["marks"]
                )
            
            total_score += marks_obtained
            
            # Update user_answer with grading result
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
                question_id=question["id"],
                question_text=question["question_text"],
                user_answer=user_answer_text,
                correct_answer=question["correct_answer"],
                is_correct=is_correct,
                marks_obtained=marks_obtained,
                marks=question["marks"],
                explanation=question.get("explanation"),
                ai_feedback=feedback
            ))
        
        # Calculate time spent
        try:
            started_at_str = user_exam.data["started_at"]
            logger.info(f"⏰ started_at: {started_at_str}")
            # Parse started_at with timezone
            if isinstance(started_at_str, str):
                started_at_str = started_at_str.replace('Z', '+00:00')
                started_at = datetime.fromisoformat(started_at_str)
            else:
                started_at = started_at_str
            
            # Ensure started_at has timezone
            if started_at.tzinfo is None:
                started_at = started_at.replace(tzinfo=timezone.utc)

            
            # submitted_at MUST have timezone
            submitted_at = datetime.now(timezone.utc)
            
            # Now both have timezone, can subtract
            time_spent = int((submitted_at - started_at).total_seconds())
            logger.info(f"⏱️ Time spent: {time_spent} seconds")
        
        except Exception as e:
            logger.error(f"Time calculation error: {str(e)}")
            time_spent = 0
            submitted_at = datetime.now(timezone.utc)
                
        # Update user_exam with results
        supabase.table("user_exams")\
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
        
        logger.info(f"Exam graded: {total_score}/{exam.data['total_marks']}")
        
        return ExamResultResponse(
            user_exam_id=data.user_exam_id,
            exam_title=exam.data["title"],
            total_score=total_score,
            max_score=exam.data["total_marks"],
            percentage=(total_score / exam.data["total_marks"] * 100) if exam.data["total_marks"] > 0 else 0,
            time_spent=time_spent,
            submitted_at=submitted_at,
            questions=results
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Submit exam error: {str(e)}")
        import traceback
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
                    "last_activity": datetime.now().isoformat()
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
                "last_activity": datetime.now().isoformat()
            }).execute()
            
    except Exception as e:
        logger.error(f"Update statistics error: {str(e)}")

@router.get("/result/{user_exam_id}", response_model=ExamResultResponse)
async def get_exam_result(
    user_exam_id: str,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """
    Xem kết quả bài thi đã làm
    """
    try:
        # Get user_exam with results
        user_exam = supabase.table("user_exams")\
            .select("*")\
            .eq("id", user_exam_id)\
            .eq("user_id", current_user["id"])\
            .single()\
            .execute()
        if not user_exam.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Result not found"
            )
        
        # Get exam
        exam = supabase.table("exams")\
            .select("*")\
            .eq("id", user_exam.data["exam_id"])\
            .single()\
            .execute()
        
        # Get questions with answers
        questions = supabase.table("questions")\
            .select("*")\
            .eq("exam_id", user_exam.data["exam_id"])\
            .order("order_index")\
            .execute()
        
        user_answers = supabase.table("user_answers")\
            .select("*")\
            .eq("user_exam_id", user_exam_id)\
            .execute()
        
        answer_map = {ans["question_id"]: ans for ans in user_answers.data}
        
        results = []
        for question in questions.data:
            answer = answer_map.get(question["id"])
            
            results.append(QuestionResult(
                question_id=question["id"],
                question_text=question["question_text"],
                user_answer=answer["user_answer"] if answer else "",
                correct_answer=question["correct_answer"],
                is_correct=answer["is_correct"] if answer else False,
                marks_obtained=answer["marks_obtained"] if answer else 0,
                marks=question["marks"],
                explanation=question.get("explanation"),
                ai_feedback=answer.get("ai_feedback") if answer else None
            ))
        
        return ExamResultResponse(
            user_exam_id=user_exam_id,
            exam_title=exam.data["title"],
            total_score=user_exam.data["total_score"] or 0,
            max_score=exam.data["total_marks"],
            percentage=(user_exam.data["total_score"] / exam.data["total_marks"] * 100) if exam.data["total_marks"] > 0 else 0,
            time_spent=user_exam.data.get("time_spent", 0),
            submitted_at=user_exam.data["submitted_at"],
            questions=results
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get result error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )