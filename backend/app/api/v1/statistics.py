from fastapi import APIRouter, Depends, HTTPException, status, Query
from supabase import Client
from app.core.supabase import get_supabase
from app.api.deps import get_current_user
from app.models.statistics import (
    UserStats, ExamHistoryItem, ScoreDataPoint,
    QuestionTypeStats, WeakAreaItem
)
from typing import List
from datetime import datetime, timedelta
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/overview", response_model=UserStats)
async def get_user_statistics(
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """
    Lấy thống kê tổng quan của user
    """
    try:
        # Get stats from user_statistics table
        stats = supabase.table("user_statistics")\
            .select("*")\
            .eq("user_id", current_user["id"])\
            .execute()
        
        if stats.data and len(stats.data) > 0:
            return UserStats(**stats.data[0])
        else:
            # Return default stats if no data
            return UserStats(
                total_exams_taken=0,
                total_exams_completed=0,
                average_score=0.0,
                total_time_spent=0,
                last_activity=None
            )
            
    except Exception as e:
        logger.error(f"Get statistics error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/history", response_model=List[ExamHistoryItem])
async def get_exam_history(
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
    limit: int = Query(50, ge=1, le=100)
):
    """
    Lấy lịch sử làm bài của user
    """
    try:
        # Get user exams with exam details
        user_exams = supabase.table("user_exams")\
            .select("*, exams(title)")\
            .eq("user_id", current_user["id"])\
            .order("submitted_at", desc=True)\
            .limit(limit)\
            .execute()
        
        history = []
        for ue in user_exams.data:
            if ue.get("submitted_at"):  # Only completed exams
                # Get exam details
                exam = supabase.table("exams")\
                    .select("title, total_marks")\
                    .eq("id", ue["exam_id"])\
                    .single()\
                    .execute()
                
                history.append(ExamHistoryItem(
                    user_exam_id=ue["id"],
                    exam_id=ue["exam_id"],
                    exam_title=exam.data["title"],
                    total_score=ue.get("total_score", 0),
                    max_score=exam.data["total_marks"],
                    percentage=(ue.get("total_score", 0) / exam.data["total_marks"] * 100) if exam.data["total_marks"] > 0 else 0,
                    time_spent=ue.get("time_spent", 0),
                    submitted_at=ue["submitted_at"],
                    status=ue["status"]
                ))
        
        return history
        
    except Exception as e:
        logger.error(f"Get history error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/scores-chart", response_model=List[ScoreDataPoint])
async def get_scores_for_chart(
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
    days: int = Query(30, ge=7, le=365)
):
    """
    Lấy dữ liệu điểm số để vẽ biểu đồ
    """
    try:
        # Get exams from last N days
        from datetime import timezone
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=days)
        
        user_exams = supabase.table("user_exams")\
            .select("*, exams(title, total_marks)")\
            .eq("user_id", current_user["id"])\
            .eq("status", "graded")\
            .gte("submitted_at", cutoff_date.isoformat())\
            .order("submitted_at")\
            .execute()
        
        scores = []
        for ue in user_exams.data:
            if ue.get("submitted_at") and ue.get("total_score") is not None:
                exam = supabase.table("exams")\
                    .select("title, total_marks")\
                    .eq("id", ue["exam_id"])\
                    .single()\
                    .execute()
                
                # Calculate percentage
                percentage = (ue["total_score"] / exam.data["total_marks"] * 100) if exam.data["total_marks"] > 0 else 0
                
                scores.append(ScoreDataPoint(
                    date=ue["submitted_at"][:10],  # YYYY-MM-DD
                    score=round(percentage, 2),
                    exam_title=exam.data["title"]
                ))
        
        return scores
        
    except Exception as e:
        logger.error(f"Get scores chart error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/question-types", response_model=List[QuestionTypeStats])
async def get_question_type_statistics(
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """
    Thống kê độ chính xác theo loại câu hỏi
    """
    try:
        # Get all user answers with question details
        user_exams = supabase.table("user_exams")\
            .select("id")\
            .eq("user_id", current_user["id"])\
            .eq("status", "graded")\
            .execute()
        
        user_exam_ids = [ue["id"] for ue in user_exams.data]
        
        if not user_exam_ids:
            return []
        
        # Get answers
        answers = supabase.table("user_answers")\
            .select("*, questions(question_type)")\
            .in_("user_exam_id", user_exam_ids)\
            .execute()
        
        # Group by question type
        type_stats = {}
        for ans in answers.data:
            question = supabase.table("questions")\
                .select("question_type")\
                .eq("id", ans["question_id"])\
                .single()\
                .execute()
            
            q_type = question.data["question_type"]
            
            if q_type not in type_stats:
                type_stats[q_type] = {"total": 0, "correct": 0}
            
            type_stats[q_type]["total"] += 1
            if ans.get("is_correct"):
                type_stats[q_type]["correct"] += 1
        
        # Convert to response format
        result = []
        for q_type, stats in type_stats.items():
            accuracy = (stats["correct"] / stats["total"] * 100) if stats["total"] > 0 else 0
            result.append(QuestionTypeStats(
                question_type=q_type,
                total=stats["total"],
                correct=stats["correct"],
                accuracy=round(accuracy, 2)
            ))
        
        return result
        
    except Exception as e:
        logger.error(f"Get question type stats error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/weak-areas", response_model=List[WeakAreaItem])
async def get_weak_areas(
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
    limit: int = Query(10, ge=1, le=50)
):
    """
    Phân tích điểm yếu - Các câu hỏi hay sai
    """
    try:
        # Get all user answers
        user_exams = supabase.table("user_exams")\
            .select("id")\
            .eq("user_id", current_user["id"])\
            .eq("status", "graded")\
            .execute()
        
        user_exam_ids = [ue["id"] for ue in user_exams.data]
        
        if not user_exam_ids:
            return []
        
        answers = supabase.table("user_answers")\
            .select("*")\
            .in_("user_exam_id", user_exam_ids)\
            .execute()
        
        # Group by question_id
        question_stats = {}
        for ans in answers.data:
            q_id = ans["question_id"]
            if q_id not in question_stats:
                question_stats[q_id] = {
                    "attempted": 0,
                    "correct": 0
                }
            
            question_stats[q_id]["attempted"] += 1
            if ans.get("is_correct"):
                question_stats[q_id]["correct"] += 1
        
        # Calculate accuracy and sort
        weak_areas = []
        for q_id, stats in question_stats.items():
            accuracy = (stats["correct"] / stats["attempted"] * 100) if stats["attempted"] > 0 else 0
            
            # Only include questions with low accuracy
            if accuracy < 70:
                # Get question text
                question = supabase.table("questions")\
                    .select("question_text")\
                    .eq("id", q_id)\
                    .single()\
                    .execute()
                
                weak_areas.append({
                    "question_text": question.data["question_text"],
                    "times_attempted": stats["attempted"],
                    "times_correct": stats["correct"],
                    "accuracy": round(accuracy, 2)
                })
        
        # Sort by accuracy (lowest first)
        weak_areas.sort(key=lambda x: x["accuracy"])
        
        return [WeakAreaItem(**wa) for wa in weak_areas[:limit]]
        
    except Exception as e:
        logger.error(f"Get weak areas error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )