from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from datetime import datetime, timedelta
from app.api.deps import get_current_admin
from supabase import Client
from app.core.supabase import get_supabase
from collections import defaultdict
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

# ============================================================================
# FEATURE USAGE ENDPOINTS
# ============================================================================

@router.get("/feature-usage")
async def get_feature_usage(
    days: int = Query(30, ge=1, le=90, description="Số ngày thống kê"),
    start_date: Optional[datetime] = Query(None, description="Ngày bắt đầu (custom)"),
    end_date: Optional[datetime] = Query(None, description="Ngày kết thúc (custom)"),
    current_user: dict = Depends(get_current_admin),
    supabase: Client = Depends(get_supabase)
):
    """
    Thống kê sử dụng các tính năng trong hệ thống
    - upload_file: Nhập đề
    - take_exam: Làm bài
    - practice_session: Ôn luyện
    - view_results: Xem kết quả
    """
    try:
        # Validate date range
        if start_date and end_date:
            if start_date > end_date:
                raise HTTPException(400, "start_date phải nhỏ hơn end_date")
            filter_start = start_date.isoformat()
            filter_end = end_date.isoformat()
            period_days = (end_date - start_date).days
        else:
            filter_start = (datetime.utcnow() - timedelta(days=days)).isoformat()
            filter_end = datetime.utcnow().isoformat()
            period_days = days
        
        # Query analytics
        result = supabase.table('system_analytics')\
            .select('action_type, created_at, user_id')\
            .gte('created_at', filter_start)\
            .lte('created_at', filter_end)\
            .execute()
        
        if not result.data:
            return {
                'period_days': period_days,
                'start_date': filter_start,
                'end_date': filter_end,
                'total_actions': 0,
                'unique_users': 0,
                'action_counts': {},
                'daily_breakdown': {},
                'top_features': []
            }
        
        # Process data
        action_counts = defaultdict(int)
        daily_actions = defaultdict(lambda: defaultdict(int))
        unique_users = set()
        
        for action in result.data:
            action_type = action['action_type']
            date = action['created_at'][:10]
            user_id = action.get('user_id')
            
            action_counts[action_type] += 1
            daily_actions[date][action_type] += 1
            
            if user_id:
                unique_users.add(user_id)
        
        # Sort by count
        sorted_actions = sorted(action_counts.items(), key=lambda x: x[1], reverse=True)
        
        return {
            'period_days': period_days,
            'start_date': filter_start,
            'end_date': filter_end,
            'total_actions': len(result.data),
            'unique_users': len(unique_users),
            'action_counts': dict(sorted_actions),
            'daily_breakdown': {k: dict(v) for k, v in sorted(daily_actions.items())},
            'top_features': sorted_actions[:10]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in get_feature_usage: {str(e)}")
        raise HTTPException(status_code=500, detail="Không thể lấy thống kê sử dụng tính năng")


@router.get("/feature-usage/details")
async def get_feature_usage_details(
    action_type: str = Query(..., description="Loại action cần xem chi tiết"),
    days: int = Query(7, ge=1, le=30),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(get_current_admin),
    supabase: Client = Depends(get_supabase)
):
    """Chi tiết sử dụng một tính năng cụ thể"""
    try:
        start_date = (datetime.utcnow() - timedelta(days=days)).isoformat()
        
        result = supabase.table('system_analytics')\
            .select('user_id, metadata, created_at, profiles(email, full_name)')\
            .eq('action_type', action_type)\
            .gte('created_at', start_date)\
            .order('created_at', desc=True)\
            .range(offset, offset + limit - 1)\
            .execute()
        
        # Count total for pagination
        count_result = supabase.table('system_analytics')\
            .select('id', count='exact')\
            .eq('action_type', action_type)\
            .gte('created_at', start_date)\
            .execute()
        
        return {
            'action_type': action_type,
            'period_days': days,
            'total_usage': count_result.count,
            'unique_users': len(set(a['user_id'] for a in result.data if a.get('user_id'))),
            'limit': limit,
            'offset': offset,
            'activities': result.data
        }
        
    except Exception as e:
        logger.error(f"Error in get_feature_usage_details: {str(e)}")
        raise HTTPException(status_code=500, detail="Không thể lấy chi tiết tính năng")


# ============================================================================
# USER ENGAGEMENT ENDPOINTS
# ============================================================================

@router.get("/user-engagement")
async def get_user_engagement(
    days: int = Query(30, ge=1, le=90),
    current_user: dict = Depends(get_current_admin),
    supabase: Client = Depends(get_supabase)
):
    """Phân tích mức độ tương tác của users"""
    try:
        start_date = (datetime.utcnow() - timedelta(days=days)).isoformat()
        
        # Get all users
        users = supabase.table('profiles').select('id, created_at').execute()
        total_users = len(users.data)
        
        # Active users (had any activity in period)
        active = supabase.table('system_analytics')\
            .select('user_id')\
            .gte('created_at', start_date)\
            .execute()
        
        unique_active = len(set(a['user_id'] for a in active.data if a.get('user_id')))
        
        # New users in period
        new_users = supabase.table('profiles')\
            .select('id', count='exact')\
            .gte('created_at', start_date)\
            .execute()
        
        # User activity levels
        user_actions = defaultdict(int)
        for action in active.data:
            if action.get('user_id'):
                user_actions[action['user_id']] += 1
        
        # Categorize by activity level
        very_active = sum(1 for count in user_actions.values() if count >= 50)
        active_users = sum(1 for count in user_actions.values() if 20 <= count < 50)
        casual = sum(1 for count in user_actions.values() if 5 <= count < 20)
        minimal = sum(1 for count in user_actions.values() if 1 <= count < 5)
        
        return {
            'period_days': days,
            'total_users': total_users,
            'active_users': unique_active,
            'new_users': new_users.count,
            'engagement_rate': round(unique_active / total_users * 100, 2) if total_users > 0 else 0,
            'activity_levels': {
                'very_active': very_active,      # >= 50 actions
                'active': active_users,           # 20-49 actions
                'casual': casual,                 # 5-19 actions
                'minimal': minimal,               # 1-4 actions
                'inactive': total_users - unique_active
            },
            'avg_actions_per_active_user': round(len(active.data) / unique_active, 2) if unique_active > 0 else 0
        }
        
    except Exception as e:
        logger.error(f"Error in get_user_engagement: {str(e)}")
        raise HTTPException(status_code=500, detail="Không thể lấy thống kê tương tác người dùng")


@router.get("/user-engagement/retention")
async def get_user_retention(
    cohort_days: int = Query(30, ge=7, le=90, description="Số ngày cohort"),
    current_user: dict = Depends(get_current_admin),
    supabase: Client = Depends(get_supabase)
):
    """Phân tích retention của users (tối ưu performance)"""
    try:
        start_date = (datetime.utcnow() - timedelta(days=cohort_days)).isoformat()
        
        # Get new users in cohort
        new_users_result = supabase.table('profiles')\
            .select('id, created_at')\
            .gte('created_at', start_date)\
            .execute()
        
        if not new_users_result.data:
            return {
                'cohort_days': cohort_days,
                'cohort_size': 0,
                'retention_rates': {},
                'retention_counts': {}
            }
        
        user_ids = [u['id'] for u in new_users_result.data]
        
        # Get ALL activities for these users in ONE query
        activities_result = supabase.table('system_analytics')\
            .select('user_id, created_at')\
            .in_('user_id', user_ids)\
            .gte('created_at', start_date)\
            .execute()
        
        # Build activity map: user_id -> [timestamps]
        user_activities = defaultdict(list)
        for activity in activities_result.data:
            uid = activity.get('user_id')
            if uid:
                try:
                    timestamp = datetime.fromisoformat(activity['created_at'].replace('Z', '+00:00'))
                    user_activities[uid].append(timestamp)
                except:
                    continue
        
        # Calculate retention
        retention_counts = {
            'day_1': set(),
            'day_7': set(),
            'day_14': set(),
            'day_30': set()
        }
        
        for user in new_users_result.data:
            user_id = user['id']
            try:
                joined = datetime.fromisoformat(user['created_at'].replace('Z', '+00:00'))
            except:
                continue
            
            if user_id not in user_activities:
                continue
            
            # Check activity in retention windows
            for activity_time in user_activities[user_id]:
                days_since_join = (activity_time - joined).days
                
                if 1 <= days_since_join < 2:
                    retention_counts['day_1'].add(user_id)
                if 7 <= days_since_join < 8:
                    retention_counts['day_7'].add(user_id)
                if 14 <= days_since_join < 15:
                    retention_counts['day_14'].add(user_id)
                if 30 <= days_since_join < 31:
                    retention_counts['day_30'].add(user_id)
        
        cohort_size = len(new_users_result.data)
        
        return {
            'cohort_days': cohort_days,
            'cohort_size': cohort_size,
            'start_date': start_date,
            'retention_rates': {
                'day_1': round(len(retention_counts['day_1']) / cohort_size * 100, 2) if cohort_size > 0 else 0,
                'day_7': round(len(retention_counts['day_7']) / cohort_size * 100, 2) if cohort_size > 0 else 0,
                'day_14': round(len(retention_counts['day_14']) / cohort_size * 100, 2) if cohort_size > 0 else 0,
                'day_30': round(len(retention_counts['day_30']) / cohort_size * 100, 2) if cohort_size > 0 else 0
            },
            'retention_counts': {
                'day_1': len(retention_counts['day_1']),
                'day_7': len(retention_counts['day_7']),
                'day_14': len(retention_counts['day_14']),
                'day_30': len(retention_counts['day_30'])
            }
        }
        
    except Exception as e:
        logger.error(f"Error in get_user_retention: {str(e)}")
        raise HTTPException(status_code=500, detail="Không thể lấy thống kê retention")


@router.get("/user-engagement/top-users")
async def get_top_users(
    days: int = Query(30, ge=1, le=90),
    limit: int = Query(10, ge=1, le=50),
    current_user: dict = Depends(get_current_admin),
    supabase: Client = Depends(get_supabase)
):
    """Người dùng tích cực nhất"""
    try:
        start_date = (datetime.utcnow() - timedelta(days=days)).isoformat()
        
        # Get all activities
        activities = supabase.table('system_analytics')\
            .select('user_id')\
            .gte('created_at', start_date)\
            .execute()
        
        # Count activities per user
        user_action_counts = defaultdict(int)
        for activity in activities.data:
            if activity.get('user_id'):
                user_action_counts[activity['user_id']] += 1
        
        # Sort and get top users
        top_user_ids = sorted(user_action_counts.items(), key=lambda x: x[1], reverse=True)[:limit]
        
        # Get user details
        if top_user_ids:
            user_ids = [uid for uid, _ in top_user_ids]
            users = supabase.table('profiles')\
                .select('id, email, full_name, created_at')\
                .in_('id', user_ids)\
                .execute()
            
            user_map = {u['id']: u for u in users.data}
            
            top_users = []
            for user_id, action_count in top_user_ids:
                user = user_map.get(user_id, {})
                top_users.append({
                    'user_id': user_id,
                    'email': user.get('email', 'Unknown'),
                    'full_name': user.get('full_name', 'Unknown'),
                    'action_count': action_count,
                    'member_since': user.get('created_at')
                })
            
            return {
                'period_days': days,
                'top_users': top_users
            }
        
        return {'period_days': days, 'top_users': []}
        
    except Exception as e:
        logger.error(f"Error in get_top_users: {str(e)}")
        raise HTTPException(status_code=500, detail="Không thể lấy danh sách top users")


# ============================================================================
# CONTENT STATISTICS ENDPOINTS
# ============================================================================

@router.get("/content-stats")
async def get_content_stats(
    current_user: dict = Depends(get_current_admin),
    supabase: Client = Depends(get_supabase)
):
    """Thống kê tổng quan về nội dung"""
    try:
        # Exams
        total_exams = supabase.table('exams').select('id', count='exact').execute()
        published_exams = supabase.table('exams').select('id', count='exact').eq('is_published', True).execute()
        
        # Questions (from exams)
        total_questions = supabase.table('questions').select('id', count='exact').execute()
        
        # Question banks
        total_banks = supabase.table('question_banks').select('id', count='exact').execute()
        public_banks = supabase.table('question_banks').select('id', count='exact').eq('is_public', True).execute()
        
        # Question bank items
        total_bank_items = supabase.table('question_bank_items').select('id', count='exact').execute()
        
        # Files uploaded
        total_files = supabase.table('uploaded_files').select('id', count='exact').execute()
        completed_files = supabase.table('uploaded_files').select('id', count='exact').eq('processing_status', 'completed').execute()
        failed_files = supabase.table('uploaded_files').select('id', count='exact').eq('processing_status', 'failed').execute()
        
        # User exams (submissions)
        total_submissions = supabase.table('user_exams').select('id', count='exact').execute()
        graded_submissions = supabase.table('user_exams').select('id', count='exact').eq('status', 'graded').execute()
        submitted_submissions = supabase.table('user_exams').select('id', count='exact').eq('status', 'submitted').execute()
        
        # Average score (only graded exams)
        scores = supabase.table('user_exams')\
            .select('total_score')\
            .eq('status', 'graded')\
            .execute()
        
        avg_score = 0
        if scores.data:
            valid_scores = [s['total_score'] for s in scores.data if s.get('total_score') is not None]
            avg_score = round(sum(valid_scores) / len(valid_scores), 2) if valid_scores else 0
        
        # Practice sessions
        total_practice = supabase.table('practice_sessions').select('id', count='exact').execute()
        completed_practice = supabase.table('practice_sessions').select('id', count='exact').eq('status', 'completed').execute()
        
        return {
            'exams': {
                'total': total_exams.count,
                'published': published_exams.count,
                'draft': total_exams.count - published_exams.count,
                'submissions': total_submissions.count,
                'graded': graded_submissions.count,
                'pending': submitted_submissions.count,
                'average_score': avg_score
            },
            'questions': {
                'total': total_questions.count,
                'in_exams': total_questions.count
            },
            'question_banks': {
                'total': total_banks.count,
                'public': public_banks.count,
                'private': total_banks.count - public_banks.count,
                'items': total_bank_items.count,
                'avg_items_per_bank': round(total_bank_items.count / total_banks.count, 2) if total_banks.count > 0 else 0
            },
            'files': {
                'total': total_files.count,
                'completed': completed_files.count,
                'failed': failed_files.count,
                'pending': total_files.count - completed_files.count - failed_files.count,
                'success_rate': round(completed_files.count / total_files.count * 100, 2) if total_files.count > 0 else 0
            },
            'practice': {
                'total_sessions': total_practice.count,
                'completed': completed_practice.count,
                'in_progress': total_practice.count - completed_practice.count
            }
        }
        
    except Exception as e:
        logger.error(f"Error in get_content_stats: {str(e)}")
        raise HTTPException(status_code=500, detail="Không thể lấy thống kê nội dung")


@router.get("/content-stats/popular-exams")
async def get_popular_exams(
    limit: int = Query(10, ge=1, le=50),
    offset: int = Query(0, ge=0),
    days: Optional[int] = Query(None, ge=1, le=365, description="Filter by recent days"),
    current_user: dict = Depends(get_current_admin),
    supabase: Client = Depends(get_supabase)
):
    """Đề thi phổ biến nhất (theo số lượt làm)"""
    try:
        # Build query
        query = supabase.table('user_exams').select('exam_id, exams(id, title, created_by, created_at)')
        
        if days:
            start_date = (datetime.utcnow() - timedelta(days=days)).isoformat()
            query = query.gte('created_at', start_date)
        
        result = query.execute()
        
        # Count submissions per exam
        exam_counts = defaultdict(int)
        exam_info = {}
        
        for record in result.data:
            exam_id = record.get('exam_id')
            if not exam_id:
                continue
                
            exam_counts[exam_id] += 1
            
            if exam_id not in exam_info and record.get('exams'):
                exam_info[exam_id] = record['exams']
        
        # Sort by count
        popular = sorted(exam_counts.items(), key=lambda x: x[1], reverse=True)
        
        # Apply pagination
        paginated = popular[offset:offset + limit]
        
        # Build response
        popular_exams = []
        for exam_id, attempt_count in paginated:
            exam = exam_info.get(exam_id, {})
            popular_exams.append({
                'exam_id': exam_id,
                'title': exam.get('title', 'Unknown'),
                'attempts': attempt_count,
                'created_by': exam.get('created_by'),
                'created_at': exam.get('created_at')
            })
        
        return {
            'total_exams': len(popular),
            'limit': limit,
            'offset': offset,
            'popular_exams': popular_exams
        }
        
    except Exception as e:
        logger.error(f"Error in get_popular_exams: {str(e)}")
        raise HTTPException(status_code=500, detail="Không thể lấy danh sách đề thi phổ biến")


@router.get("/content-stats/question-analytics")
async def get_question_analytics(
    current_user: dict = Depends(get_current_admin),
    supabase: Client = Depends(get_supabase)
):
    """Phân tích thống kê câu hỏi"""
    try:
        # Get all question bank items with stats
        items = supabase.table('question_bank_items')\
            .select('id, question_type, difficulty, times_used, times_correct, times_incorrect')\
            .execute()
        
        if not items.data:
            return {
                'total_questions': 0,
                'by_type': {},
                'by_difficulty': {},
                'accuracy_stats': {}
            }
        
        # Analyze by type
        by_type = defaultdict(int)
        by_difficulty = defaultdict(int)
        
        total_attempts = 0
        total_correct = 0
        
        for item in items.data:
            q_type = item.get('question_type', 'unknown')
            difficulty = item.get('difficulty', 'unknown')
            
            by_type[q_type] += 1
            by_difficulty[difficulty] += 1
            
            times_correct = item.get('times_correct', 0) or 0
            times_incorrect = item.get('times_incorrect', 0) or 0
            
            total_correct += times_correct
            total_attempts += (times_correct + times_incorrect)
        
        overall_accuracy = round(total_correct / total_attempts * 100, 2) if total_attempts > 0 else 0
        
        return {
            'total_questions': len(items.data),
            'by_type': dict(by_type),
            'by_difficulty': dict(by_difficulty),
            'accuracy_stats': {
                'total_attempts': total_attempts,
                'total_correct': total_correct,
                'overall_accuracy': overall_accuracy
            },
            'most_used_type': max(by_type.items(), key=lambda x: x[1])[0] if by_type else None,
            'most_common_difficulty': max(by_difficulty.items(), key=lambda x: x[1])[0] if by_difficulty else None
        }
        
    except Exception as e:
        logger.error(f"Error in get_question_analytics: {str(e)}")
        raise HTTPException(status_code=500, detail="Không thể lấy phân tích câu hỏi")


# ============================================================================
# REPORTS & ERROR TRACKING
# ============================================================================

@router.get("/reports")
async def get_reports_analytics(
    report_type: Optional[str] = Query(None, description="Lọc theo loại báo cáo"),
    status: Optional[str] = Query(None, description="Lọc theo trạng thái"),
    days: int = Query(30, ge=1, le=365),
    current_user: dict = Depends(get_current_admin),
    supabase: Client = Depends(get_supabase)
):
    """Thống kê báo lỗi và reports"""
    try:
        start_date = (datetime.utcnow() - timedelta(days=days)).isoformat()
        
        # Build query
        query = supabase.table('reports')\
            .select('id, report_type, status, created_at, related_type')\
            .gte('created_at', start_date)
        
        if report_type:
            query = query.eq('report_type', report_type)
        if status:
            query = query.eq('status', status)
        
        result = query.execute()
        
        # Analyze reports
        by_type = defaultdict(int)
        by_status = defaultdict(int)
        by_related_type = defaultdict(int)
        daily_reports = defaultdict(int)
        
        for report in result.data:
            by_type[report['report_type']] += 1
            by_status[report['status']] += 1
            
            if report.get('related_type'):
                by_related_type[report['related_type']] += 1
            
            date = report['created_at'][:10]
            daily_reports[date] += 1
        
        # Calculate resolution rate
        total_reports = len(result.data)
        resolved = by_status.get('resolved', 0)
        resolution_rate = round(resolved / total_reports * 100, 2) if total_reports > 0 else 0
        
        return {
            'period_days': days,
            'total_reports': total_reports,
            'by_type': dict(sorted(by_type.items(), key=lambda x: x[1], reverse=True)),
            'by_status': dict(by_status),
            'by_related_type': dict(by_related_type),
            'resolution_rate': resolution_rate,
            'daily_breakdown': dict(sorted(daily_reports.items())),
            'pending_reports': by_status.get('pending', 0),
            'most_reported_issue': max(by_type.items(), key=lambda x: x[1])[0] if by_type else None
        }
        
    except Exception as e:
        logger.error(f"Error in get_reports_analytics: {str(e)}")
        raise HTTPException(status_code=500, detail="Không thể lấy thống kê báo cáo")


@router.get("/reports/details")
async def get_reports_details(
    status: Optional[str] = Query(None),
    report_type: Optional[str] = Query(None),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(get_current_admin),
    supabase: Client = Depends(get_supabase)
):
    """Chi tiết danh sách các reports"""
    try:
        # Build query
        query = supabase.table('reports')\
            .select('*, profiles!reporter_id(email, full_name)')\
            .order('created_at', desc=True)\
            .range(offset, offset + limit - 1)
        
        if status:
            query = query.eq('status', status)
        if report_type:
            query = query.eq('report_type', report_type)
        
        result = query.execute()
        
        # Count total
        count_query = supabase.table('reports').select('id', count='exact')
        if status:
            count_query = count_query.eq('status', status)
        if report_type:
            count_query = count_query.eq('report_type', report_type)
        
        count_result = count_query.execute()
        
        return {
            'total': count_result.count,
            'limit': limit,
            'offset': offset,
            'reports': result.data
        }
        
    except Exception as e:
        logger.error(f"Error in get_reports_details: {str(e)}")
        raise HTTPException(status_code=500, detail="Không thể lấy chi tiết báo cáo")


# ============================================================================
# SYSTEM HEALTH & PERFORMANCE
# ============================================================================

@router.get("/system-health")
async def get_system_health(
    current_user: dict = Depends(get_current_admin),
    supabase: Client = Depends(get_supabase)
):
    """Kiểm tra sức khỏe hệ thống"""
    try:
        # Reports stats
        total_reports = supabase.table('reports').select('id', count='exact').execute()
        pending_reports = supabase.table('reports').select('id', count='exact').eq('status', 'pending').execute()
        bug_reports = supabase.table('reports').select('id', count='exact').eq('report_type', 'bug').execute()
        
        # Recent activity (last hour)
        one_hour_ago = (datetime.utcnow() - timedelta(hours=1)).isoformat()
        recent_actions = supabase.table('system_analytics')\
            .select('id', count='exact')\
            .gte('created_at', one_hour_ago)\
            .execute()
        
        # Recent activity (last 24 hours)
        one_day_ago = (datetime.utcnow() - timedelta(days=1)).isoformat()
        daily_actions = supabase.table('system_analytics')\
            .select('id', count='exact')\
            .gte('created_at', one_day_ago)\
            .execute()
        
        # File processing status
        processing_files = supabase.table('uploaded_files')\
            .select('id', count='exact')\
            .eq('processing_status', 'processing')\
            .execute()
        
        failed_files = supabase.table('uploaded_files')\
            .select('id', count='exact')\
            .eq('processing_status', 'failed')\
            .execute()
        
        # Database size indicators
        db_stats = {
            'profiles': supabase.table('profiles').select('id', count='exact').execute().count,
            'exams': supabase.table('exams').select('id', count='exact').execute().count,
            'questions': supabase.table('questions').select('id', count='exact').execute().count,
            'question_banks': supabase.table('question_banks').select('id', count='exact').execute().count,
            'question_bank_items': supabase.table('question_bank_items').select('id', count='exact').execute().count,
            'user_exams': supabase.table('user_exams').select('id', count='exact').execute().count,
            'files': supabase.table('uploaded_files').select('id', count='exact').execute().count,
            'system_analytics': supabase.table('system_analytics').select('id', count='exact').execute().count
        }
        
        # Determine system status
        status = 'healthy'
        warnings = []
        
        if pending_reports.count > 50:
            warnings.append(f'Có {pending_reports.count} báo cáo đang chờ xử lý')
            status = 'warning'
        
        if processing_files.count > 10:
            warnings.append(f'Có {processing_files.count} file đang xử lý')
        
        if failed_files.count > 20:
            warnings.append(f'Có {failed_files.count} file xử lý thất bại')
            status = 'warning'
        
        if recent_actions.count == 0:
            warnings.append('Không có hoạt động trong 1 giờ qua')
            status = 'warning'
        
        return {
            'status': status,
            'warnings': warnings,
            'timestamp': datetime.utcnow().isoformat(),
            'reports': {
                'total': total_reports.count,
                'pending': pending_reports.count,
                'bugs': bug_reports.count,
                'error_rate': round(bug_reports.count / total_reports.count * 100, 2) if total_reports.count > 0 else 0
            },
            'activity': {
                'last_hour': recent_actions.count,
                'last_24_hours': daily_actions.count,
                'avg_per_hour': round(daily_actions.count / 24, 2)
            },
            'file_processing': {
                'processing': processing_files.count,
                'failed': failed_files.count
            },
            'database': db_stats
        }
        
    except Exception as e:
        logger.error(f"Error in get_system_health: {str(e)}")
        raise HTTPException(status_code=500, detail="Không thể kiểm tra sức khỏe hệ thống")


# ============================================================================
# DASHBOARD SUMMARY
# ============================================================================

@router.get("/dashboard")
async def get_admin_dashboard(
    current_user: dict = Depends(get_current_admin),
    supabase: Client = Depends(get_supabase)
):
    """Dashboard tổng quan cho admin - tất cả metrics quan trọng"""
    try:
        # Time periods
        now = datetime.utcnow()
        last_7_days = (now - timedelta(days=7)).isoformat()
        last_30_days = (now - timedelta(days=30)).isoformat()
        
        # User stats
        total_users = supabase.table('profiles').select('id', count='exact').execute().count
        new_users_7d = supabase.table('profiles').select('id', count='exact').gte('created_at', last_7_days).execute().count
        new_users_30d = supabase.table('profiles').select('id', count='exact').gte('created_at', last_30_days).execute().count
        
        # Active users
        active_7d = supabase.table('system_analytics').select('user_id').gte('created_at', last_7_days).execute()
        unique_active_7d = len(set(a['user_id'] for a in active_7d.data if a.get('user_id')))
        
        active_30d = supabase.table('system_analytics').select('user_id').gte('created_at', last_30_days).execute()
        unique_active_30d = len(set(a['user_id'] for a in active_30d.data if a.get('user_id')))
        
        # Content stats
        total_exams = supabase.table('exams').select('id', count='exact').execute().count
        total_questions = supabase.table('question_bank_items').select('id', count='exact').execute().count
        
        # Activity stats
        total_submissions = supabase.table('user_exams').select('id', count='exact').execute().count
        submissions_7d = supabase.table('user_exams').select('id', count='exact').gte('created_at', last_7_days).execute().count
        
        # Reports
        pending_reports = supabase.table('reports').select('id', count='exact').eq('status', 'pending').execute().count
        reports_7d = supabase.table('reports').select('id', count='exact').gte('created_at', last_7_days).execute().count
        
        # System activity
        actions_7d = len(active_7d.data)
        
        return {
            'timestamp': now.isoformat(),
            'users': {
                'total': total_users,
                'new_7d': new_users_7d,
                'new_30d': new_users_30d,
                'active_7d': unique_active_7d,
                'active_30d': unique_active_30d,
                'engagement_rate_7d': round(unique_active_7d / total_users * 100, 2) if total_users > 0 else 0
            },
            'content': {
                'total_exams': total_exams,
                'total_questions': total_questions,
                'total_submissions': total_submissions,
                'submissions_7d': submissions_7d
            },
            'activity': {
                'actions_7d': actions_7d,
                'avg_actions_per_day': round(actions_7d / 7, 2),
                'avg_actions_per_active_user': round(actions_7d / unique_active_7d, 2) if unique_active_7d > 0 else 0
            },
            'reports': {
                'pending': pending_reports,
                'new_7d': reports_7d
            },
            'growth': {
                'user_growth_rate_7d': round(new_users_7d / total_users * 100, 2) if total_users > 0 else 0,
                'user_growth_rate_30d': round(new_users_30d / total_users * 100, 2) if total_users > 0 else 0
            }
        }
        
    except Exception as e:
        logger.error(f"Error in get_admin_dashboard: {str(e)}")
        raise HTTPException(status_code=500, detail="Không thể lấy dashboard admin")