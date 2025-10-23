from fastapi import APIRouter, Depends, HTTPException, status, Query
from supabase import Client
from app.core.supabase import get_supabase, get_supabase_admin
from app.api.deps import get_current_user
from app.models.statistics import (
    UserStats, ExamHistoryItem, ScoreDataPoint,
    QuestionTypeStats, WeakAreaItem
)
from typing import List
from datetime import datetime, timedelta, timezone
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/overview", response_model=UserStats)
async def get_user_statistics(
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_admin)
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
        
        # Count total published exams (available question banks)
        exams_count = supabase.table("exams")\
            .select("id", count="exact")\
            .eq("is_published", True)\
            .execute()
        
        total_question_banks = exams_count.count or 0
        
        if stats.data and len(stats.data) > 0:
            stats_data = stats.data[0]
            
            # Add additional stats
            stats_data["total_question_banks"] = total_question_banks
            
            # Calculate score trend
            score_trend = await _calculate_score_trend(current_user["id"], supabase)
            stats_data["score_trend"] = score_trend
            
            # Count wrong answers
            wrong_count = await _count_wrong_answers(current_user["id"], supabase)
            stats_data["wrong_answers_count"] = wrong_count

            # Calculate streak days
            streak = await _calculate_streak_days(current_user["id"], supabase)
            stats_data["streak_days"] = streak
            
            
            return UserStats(**stats_data)
        else:
            streak = await _calculate_streak_days(current_user["id"], supabase)
            # Return default stats if no data
            return UserStats(
                user_id=current_user["id"],
                total_exams_taken=0,
                total_exams_completed=0,
                average_score=0.0,
                total_time_spent=0,
                last_activity=None,
                total_question_banks=total_question_banks,
                score_trend=0,
                wrong_answers_count=0,
                streaks_day=streak
            )
            
    except Exception as e:
        logger.error(f"Get statistics error: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

async def _calculate_score_trend(user_id: str, supabase: Client) -> float:
    """Calculate score trend comparing recent vs previous period"""
    try:
        now = datetime.now(timezone.utc)
        last_7_days = now - timedelta(days=7)
        prev_7_days = now - timedelta(days=14)
        
        # Get scores from last 7 days
        recent = supabase.table("user_exams")\
            .select("exam_id, total_score")\
            .eq("user_id", user_id)\
            .eq("status", "graded")\
            .gte("submitted_at", last_7_days.isoformat())\
            .execute()
        
        if not recent.data:
            return 0
        
        # Calculate average percentage for recent period
        recent_scores = []
        for ue in recent.data:
            try:
                exam = supabase.table("exams")\
                    .select("total_marks")\
                    .eq("id", ue["exam_id"])\
                    .single()\
                    .execute()
                
                if exam.data and exam.data.get("total_marks", 0) > 0:
                    total_score = float(ue.get("total_score", 0))
                    max_score = float(exam.data["total_marks"])
                    percentage = (total_score / max_score) * 100
                    recent_scores.append(percentage)
            except Exception as e:
                logger.error(f"Error calculating score for exam {ue.get('exam_id')}: {str(e)}")
                continue
        
        if not recent_scores:
            return 0
        
        recent_avg = sum(recent_scores) / len(recent_scores)
        
        # Get scores from previous 7 days
        previous = supabase.table("user_exams")\
            .select("exam_id, total_score")\
            .eq("user_id", user_id)\
            .eq("status", "graded")\
            .gte("submitted_at", prev_7_days.isoformat())\
            .lt("submitted_at", last_7_days.isoformat())\
            .execute()
        
        if not previous.data:
            return round(recent_avg, 1) if recent_avg > 50 else 0
        
        # Calculate average percentage for previous period
        previous_scores = []
        for ue in previous.data:
            try:
                exam = supabase.table("exams")\
                    .select("total_marks")\
                    .eq("id", ue["exam_id"])\
                    .single()\
                    .execute()
                
                if exam.data and exam.data.get("total_marks", 0) > 0:
                    total_score = float(ue.get("total_score", 0))
                    max_score = float(exam.data["total_marks"])
                    percentage = (total_score / max_score) * 100
                    previous_scores.append(percentage)
            except Exception as e:
                logger.error(f"Error calculating score for exam {ue.get('exam_id')}: {str(e)}")
                continue
        
        if not previous_scores:
            return round(recent_avg, 1) if recent_avg > 50 else 0
        
        previous_avg = sum(previous_scores) / len(previous_scores)
        trend = recent_avg - previous_avg
        
        return round(trend, 1)
        
    except Exception as e:
        logger.error(f"Calculate trend error: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        return 0

async def _count_wrong_answers(user_id: str, supabase: Client) -> int:
    """Count wrong answers that need review"""
    try:
        # Get all user exam IDs
        user_exams = supabase.table("user_exams")\
            .select("id")\
            .eq("user_id", user_id)\
            .eq("status", "graded")\
            .execute()
        
        if not user_exams.data:
            return 0
        
        user_exam_ids = [ue["id"] for ue in user_exams.data]
        
        # Count wrong answers
        wrong_answers = supabase.table("user_answers")\
            .select("id", count="exact")\
            .in_("user_exam_id", user_exam_ids)\
            .eq("is_correct", False)\
            .execute()
        
        return wrong_answers.count or 0
        
    except Exception as e:
        logger.error(f"Count wrong answers error: {str(e)}")
        return 0

@router.get("/history", response_model=List[ExamHistoryItem])
async def get_exam_history(
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_admin),
    limit: int = Query(50, ge=1, le=100)
):
    """
    Lấy lịch sử làm bài của user
    """
    try:
        # Get user exams that have been submitted
        user_exams = supabase.table("user_exams")\
            .select("*")\
            .eq("user_id", current_user["id"])\
            .not_.is_("submitted_at", "null")\
            .order("submitted_at", desc=True)\
            .limit(limit)\
            .execute()
        
        history = []
        for ue in user_exams.data:
            try:
                # Get exam details
                exam = supabase.table("exams")\
                    .select("title, total_marks, passing_marks")\
                    .eq("id", ue["exam_id"])\
                    .single()\
                    .execute()
                
                if not exam.data:
                    continue
                
                total_score = float(ue.get("total_score") or 0)
                max_score = float(exam.data.get("total_marks") or 1)
                passing_marks = float(exam.data.get("passing_marks") or 0)
                percentage = (total_score / max_score * 100) if max_score > 0 else 0
                is_passed = total_score >= passing_marks
                
                history.append(ExamHistoryItem(
                    user_exam_id=ue["id"],
                    exam_id=ue["exam_id"],
                    exam_title=exam.data.get("title", "Untitled"),
                    total_score=total_score,
                    max_score=max_score,
                    percentage=round(percentage, 2),
                    time_spent=ue.get("time_spent", 0),
                    submitted_at=ue["submitted_at"],
                    status=ue["status"],
                    passing_marks=passing_marks,
                    is_passed=is_passed
                ))
            except Exception as e:
                logger.error(f"Error processing exam history {ue.get('id')}: {str(e)}")
                continue
        
        return history
        
    except Exception as e:
        logger.error(f"Get history error: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/scores-chart", response_model=List[ScoreDataPoint])
async def get_scores_for_chart(
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_admin),
    days: int = Query(30, ge=7, le=365)
):
    """
    Lấy dữ liệu điểm số để vẽ biểu đồ
    """
    try:
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=days)
        
        logger.info(f"📊 Getting chart data for user {current_user['id']} from {cutoff_date}")
        
        # Get user exams from last N days
        user_exams = supabase.table("user_exams")\
            .select("id, exam_id, total_score, submitted_at")\
            .eq("user_id", current_user["id"])\
            .eq("status", "graded")\
            .gte("submitted_at", cutoff_date.isoformat())\
            .order("submitted_at")\
            .execute()
        
        logger.info(f"📊 Found {len(user_exams.data) if user_exams.data else 0} graded exams")
        
        if not user_exams.data:
            logger.warning("📊 No exam data found for chart")
            return []
        
        scores = []
        for ue in user_exams.data:
            try:
                # Validate data
                if not ue.get("submitted_at"):
                    logger.warning(f"⚠️ Exam {ue.get('id')} has no submitted_at")
                    continue
                
                if ue.get("total_score") is None:
                    logger.warning(f"⚠️ Exam {ue.get('id')} has no total_score")
                    continue
                
                # Get exam details
                exam = supabase.table("exams")\
                    .select("title, total_marks")\
                    .eq("id", ue["exam_id"])\
                    .single()\
                    .execute()
                
                if not exam.data:
                    logger.warning(f"⚠️ Exam {ue['exam_id']} not found in exams table")
                    continue
                
                if not exam.data.get("total_marks") or exam.data["total_marks"] <= 0:
                    logger.warning(f"⚠️ Exam {ue['exam_id']} has invalid total_marks: {exam.data.get('total_marks')}")
                    continue
                
                # Calculate percentage
                total_score = float(ue["total_score"])
                max_score = float(exam.data["total_marks"])
                percentage = (total_score / max_score) * 100
                
                # Format date
                submitted_at = ue["submitted_at"]
                if isinstance(submitted_at, str):
                    # Handle different datetime formats
                    if 'T' in submitted_at:
                        date_str = submitted_at.split('T')[0]
                    else:
                        date_str = submitted_at[:10]
                else:
                    date_str = submitted_at.strftime("%Y-%m-%d")
                
                score_point = ScoreDataPoint(
                    date=date_str,
                    score=round(percentage, 2),
                    exam_title=exam.data.get("title", "Untitled Exam")
                )
                scores.append(score_point)
                
                logger.info(f"✅ Score point: {date_str} | {percentage:.2f}% | {exam.data.get('title')}")
                
            except Exception as e:
                logger.error(f"❌ Error processing exam {ue.get('id')}: {str(e)}")
                import traceback
                logger.error(traceback.format_exc())
                continue
        
        logger.info(f"📊 Returning {len(scores)} score points")
        return scores
        
    except Exception as e:
        logger.error(f"❌ Get scores chart error: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/question-types", response_model=List[QuestionTypeStats])
async def get_question_type_statistics(
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_admin)
):
    """
    Thống kê độ chính xác theo loại câu hỏi
    Hỗ trợ: multiple_choice, multiple_answer, true_false, short_answer, essay, fill_blank, ordering
    """
    try:
        # Get all user exam IDs
        user_exams = supabase.table("user_exams")\
            .select("id")\
            .eq("user_id", current_user["id"])\
            .eq("status", "graded")\
            .execute()
        
        if not user_exams.data:
            return []
        
        user_exam_ids = [ue["id"] for ue in user_exams.data]
        
        # Get all answers
        answers = supabase.table("user_answers")\
            .select("id, exam_question_id, is_correct")\
            .in_("user_exam_id", user_exam_ids)\
            .execute()
        
        if not answers.data:
            return []
        
        # Get question types for each answer
        type_stats = {}
        
        for ans in answers.data:
            try:
                # Get exam_question
                exam_question = supabase.table("exam_questions")\
                    .select("question_bank_item_id")\
                    .eq("id", ans["exam_question_id"])\
                    .single()\
                    .execute()
                
                if not exam_question.data:
                    continue
                
                # Get question from question_bank_items
                question = supabase.table("question_bank_items")\
                    .select("question_type")\
                    .eq("id", exam_question.data["question_bank_item_id"])\
                    .single()\
                    .execute()
                
                if not question.data:
                    continue
                
                q_type = question.data["question_type"]
                
                if q_type not in type_stats:
                    type_stats[q_type] = {"total": 0, "correct": 0}
                
                type_stats[q_type]["total"] += 1
                if ans.get("is_correct"):
                    type_stats[q_type]["correct"] += 1
                    
            except Exception as e:
                logger.error(f"Error processing answer {ans.get('id')}: {str(e)}")
                continue
        
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
        
        # Sort by total questions (most attempted first)
        result.sort(key=lambda x: x.total, reverse=True)
        
        return result
        
    except Exception as e:
        logger.error(f"Get question type stats error: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
  
       

@router.get("/weak-areas", response_model=List[WeakAreaItem])
async def get_weak_areas(
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_admin),
    limit: int = Query(10, ge=1, le=50)
):
    """
    Phân tích điểm yếu - Các câu hỏi hay sai
    """
    try:
        # Get all user exam IDs
        user_exams = supabase.table("user_exams")\
            .select("id")\
            .eq("user_id", current_user["id"])\
            .eq("status", "graded")\
            .execute()
        
        if not user_exams.data:
            return []
        
        user_exam_ids = [ue["id"] for ue in user_exams.data]
        
        # Get all answers
        answers = supabase.table("user_answers")\
            .select("*")\
            .in_("user_exam_id", user_exam_ids)\
            .execute()
        
        if not answers.data:
            return []
        
        # Group by question_bank_item_id (the actual question)
        question_stats = {}
        question_texts = {}
        
        for ans in answers.data:
            try:
                # Get exam_question
                exam_question = supabase.table("exam_questions")\
                    .select("question_bank_item_id")\
                    .eq("id", ans["exam_question_id"])\
                    .single()\
                    .execute()
                
                if not exam_question.data:
                    continue
                
                qb_item_id = exam_question.data["question_bank_item_id"]
                
                # Initialize stats for this question
                if qb_item_id not in question_stats:
                    question_stats[qb_item_id] = {
                        "attempted": 0,
                        "correct": 0
                    }
                    
                    # Get question text
                    question = supabase.table("question_bank_items")\
                        .select("question_text")\
                        .eq("id", qb_item_id)\
                        .single()\
                        .execute()
                    
                    if question.data:
                        question_texts[qb_item_id] = question.data.get("question_text", "Unknown question")
                
                question_stats[qb_item_id]["attempted"] += 1
                if ans.get("is_correct"):
                    question_stats[qb_item_id]["correct"] += 1
                    
            except Exception as e:
                logger.error(f"Error processing answer {ans.get('id')}: {str(e)}")
                continue
        
        # Calculate accuracy and filter
        weak_areas = []
        for qb_id, stats in question_stats.items():
            accuracy = (stats["correct"] / stats["attempted"] * 100) if stats["attempted"] > 0 else 0
            
            # Only include questions with low accuracy and attempted at least twice
            if accuracy < 70 and stats["attempted"] >= 2:
                weak_areas.append({
                    "question_text": question_texts.get(qb_id, "Unknown question"),
                    "times_attempted": stats["attempted"],
                    "times_correct": stats["correct"],
                    "accuracy": round(accuracy, 2)
                })
        
        # Sort by accuracy (lowest first)
        weak_areas.sort(key=lambda x: x["accuracy"])
        
        return [WeakAreaItem(**wa) for wa in weak_areas[:limit]]
        
    except Exception as e:
        logger.error(f"Get weak areas error: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


async def _calculate_streak_days(user_id: str, supabase: Client) -> int:
    """Calculate consecutive days user has taken exams"""
    try:
        # Get all graded exams sorted by date
        user_exams = supabase.table("user_exams")\
            .select("submitted_at")\
            .eq("user_id", user_id)\
            .eq("status", "graded")\
            .not_.is_("submitted_at", "null")\
            .order("submitted_at", desc=True)\
            .execute()
        
        if not user_exams.data:
            return 0
        
        # Extract unique dates
        dates = []
        for ue in user_exams.data:
            submitted_at = ue["submitted_at"]
            if isinstance(submitted_at, str):
                date_str = submitted_at.split('T')[0]
            else:
                date_str = submitted_at.strftime("%Y-%m-%d")
            
            if date_str not in dates:
                dates.append(date_str)
        
        if not dates:
            return 0
        
        # Convert to datetime objects and sort
        from datetime import datetime, timedelta, timezone
        date_objects = sorted([datetime.fromisoformat(d) for d in dates], reverse=True)
        
        # Calculate streak
        streak = 0
        today = datetime.now(timezone.utc).date()
        
        for i, date in enumerate(date_objects):
            date_only = date.date()
            
            if i == 0:
                # First date should be today or yesterday
                days_diff = (today - date_only).days
                if days_diff > 1:
                    return 0  # No active streak
                streak = 1
            else:
                # Check if consecutive
                prev_date = date_objects[i-1].date()
                days_diff = (prev_date - date_only).days
                
                if days_diff == 1:
                    streak += 1
                else:
                    break  # Streak broken
        
        return streak
        
    except Exception as e:
        logger.error(f"Calculate streak error: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        return 0