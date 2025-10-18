from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from datetime import datetime, timedelta
from app.api.deps import get_current_admin
from supabase import Client
from app.core.supabase import get_supabase

router = APIRouter()

@router.get("/feature-usage")
async def get_feature_usage(
    days: int = Query(30, ge=1, le=90),
    current_user: dict = Depends(get_current_admin),
    supabase: Client = Depends(get_supabase)
):
    """Thống kê sử dụng các tính năng"""
    try:
        # Get actions from last N days
        result = supabase.table('system_analytics').select('action_type, created_at').gte('created_at', f'now() - interval \'{days} days\'').execute()
        
        # Count by action type
        from collections import defaultdict
        action_counts = defaultdict(int)
        daily_actions = defaultdict(lambda: defaultdict(int))
        
        for action in result.data:
            action_type = action['action_type']
            date = action['created_at'][:10]
            
            action_counts[action_type] += 1
            daily_actions[date][action_type] += 1
        
        # Sort by count
        sorted_actions = sorted(action_counts.items(), key=lambda x: x[1], reverse=True)
        
        return {
            'period_days': days,
            'total_actions': len(result.data),
            'action_counts': dict(sorted_actions),
            'daily_breakdown': {k: dict(v) for k, v in daily_actions.items()},
            'top_features': sorted_actions[:10]
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/feature-usage/details")
async def get_feature_usage_details(
    action_type: str,
    days: int = Query(7, ge=1, le=30),
    current_user: dict = Depends(get_current_admin),
    supabase: Client = Depends(get_supabase)
):
    """Chi tiết sử dụng một tính năng cụ thể"""
    try:
        result = supabase.table('system_analytics').select('user_id, metadata, created_at').eq('action_type', action_type).gte('created_at', f'now() - interval \'{days} days\'').order('created_at', desc=True).execute()
        
        return {
            'action_type': action_type,
            'total_usage': len(result.data),
            'unique_users': len(set(a['user_id'] for a in result.data if a['user_id'])),
            'recent_activities': result.data[:50]
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/user-engagement")
async def get_user_engagement(
    days: int = Query(30, ge=1, le=90),
    current_user: dict = Depends(get_current_admin),
    supabase: Client = Depends(get_supabase)
):
    """Phân tích mức độ tương tác của users"""
    try:
        # Get all users
        users = supabase.table('profiles').select('id, created_at').execute()
        total_users = len(users.data)
        
        # Active users (had any activity in last N days)
        active = supabase.table('system_analytics').select('user_id').gte('created_at', f'now() - interval \'{days} days\'').execute()
        unique_active = len(set(a['user_id'] for a in active.data if a['user_id']))
        
        # New users in period
        new_users = supabase.table('profiles').select('id', count='exact').gte('created_at', f'now() - interval \'{days} days\'').execute()
        
        # User activity levels
        from collections import defaultdict
        user_actions = defaultdict(int)
        
        for action in active.data:
            if action['user_id']:
                user_actions[action['user_id']] += 1
        
        # Categorize by activity level
        very_active = sum(1 for count in user_actions.values() if count >= 20)
        active_users = sum(1 for count in user_actions.values() if 10 <= count < 20)
        casual = sum(1 for count in user_actions.values() if 1 <= count < 10)
        
        return {
            'period_days': days,
            'total_users': total_users,
            'active_users': unique_active,
            'new_users': new_users.count,
            'engagement_rate': round(unique_active / total_users * 100, 2) if total_users > 0 else 0,
            'activity_levels': {
                'very_active': very_active,
                'active': active_users,
                'casual': casual,
                'inactive': total_users - unique_active
            }
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/user-engagement/retention")
async def get_user_retention(
    current_user: dict = Depends(get_current_admin),
    supabase: Client = Depends(get_supabase)
):
    """Phân tích retention của users"""
    try:
        # Users who joined in the last 30 days
        new_users = supabase.table('profiles').select('id, created_at').gte('created_at', 'now() - interval \'30 days\'').execute()
        
        retention = {
            'day_1': 0,
            'day_7': 0,
            'day_30': 0
        }
        
        for user in new_users.data:
            user_id = user['id']
            joined = datetime.fromisoformat(user['created_at'].replace('Z', '+00:00'))
            
            # Check activity after 1, 7, 30 days
            day_1_activity = supabase.table('system_analytics').select('id').eq('user_id', user_id).gte('created_at', joined + timedelta(days=1)).lte('created_at', joined + timedelta(days=2)).execute()
            
            day_7_activity = supabase.table('system_analytics').select('id').eq('user_id', user_id).gte('created_at', joined + timedelta(days=7)).lte('created_at', joined + timedelta(days=8)).execute()
            
            day_30_activity = supabase.table('system_analytics').select('id').eq('user_id', user_id).gte('created_at', joined + timedelta(days=30)).execute()
            
            if day_1_activity.data:
                retention['day_1'] += 1
            if day_7_activity.data:
                retention['day_7'] += 1
            if day_30_activity.data:
                retention['day_30'] += 1
        
        total = len(new_users.data)
        
        return {
            'cohort_size': total,
            'retention_rates': {
                'day_1': round(retention['day_1'] / total * 100, 2) if total > 0 else 0,
                'day_7': round(retention['day_7'] / total * 100, 2) if total > 0 else 0,
                'day_30': round(retention['day_30'] / total * 100, 2) if total > 0 else 0
            },
            'retention_counts': retention
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/content-stats")
async def get_content_stats(
    current_user: dict = Depends(get_current_admin),
    supabase: Client = Depends(get_supabase)
):
    """Thống kê nội dung (exams, questions, etc.)"""
    try:
        # Exams
        total_exams = supabase.table('exams').select('id', count='exact').execute()
        
        # Questions
        total_questions = supabase.table('questions').select('id', count='exact').execute()
        
        # Question banks
        total_banks = supabase.table('question_banks').select('id', count='exact').execute()
        public_banks = supabase.table('question_banks').select('id', count='exact').eq('is_public', True).execute()
        
        # Question bank items
        total_bank_items = supabase.table('question_bank_items').select('id', count='exact').execute()
        
        # Files uploaded
        total_files = supabase.table('uploaded_files').select('id', count='exact').execute()
        
        # User exams (submissions)
        total_submissions = supabase.table('user_exams').select('id', count='exact').execute()
        completed = supabase.table('user_exams').select('id', count='exact').eq('status', 'completed').execute()
        
        # Average score
        scores = supabase.table('user_exams').select('score').eq('status', 'completed').execute()
        avg_score = sum(s['score'] for s in scores.data if s['score']) / len(scores.data) if scores.data else 0
        
        return {
            'exams': {
                'total': total_exams.count,
                'submissions': total_submissions.count,
                'completed': completed.count,
                'average_score': round(avg_score, 2)
            },
            'questions': {
                'total': total_questions.count
            },
            'question_banks': {
                'total': total_banks.count,
                'public': public_banks.count,
                'items': total_bank_items.count
            },
            'files': {
                'total': total_files.count
            }
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/content-stats/popular-exams")
async def get_popular_exams(
    limit: int = Query(10, ge=1, le=50),
    current_user: dict = Depends(get_current_admin),
    supabase: Client = Depends(get_supabase)
):
    """Đề thi phổ biến nhất"""
    try:
        # Count submissions per exam
        result = supabase.table('user_exams').select('exam_id, exams(title)').execute()
        
        from collections import defaultdict
        exam_counts = defaultdict(int)
        exam_titles = {}
        
        for record in result.data:
            exam_id = record['exam_id']
            exam_counts[exam_id] += 1
            if record['exams']:
                exam_titles[exam_id] = record['exams']['title']
        
        # Sort by count
        popular = sorted(exam_counts.items(), key=lambda x: x[1], reverse=True)[:limit]
        
        return {
            'popular_exams': [
                {
                    'exam_id': exam_id,
                    'title': exam_titles.get(exam_id, 'Unknown'),
                    'attempts': count
                }
                for exam_id, count in popular
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/system-health")
async def get_system_health(
    current_user: dict = Depends(get_current_admin),
    supabase: Client = Depends(get_supabase)
):
    """Kiểm tra sức khỏe hệ thống"""
    try:
        # Error rate (from reports)
        total_reports = supabase.table('reports').select('id', count='exact').execute()
        bug_reports = supabase.table('reports').select('id', count='exact').eq('report_type', 'bug').execute()
        
        # Recent activity (last hour)
        recent_actions = supabase.table('system_analytics').select('id', count='exact').gte('created_at', 'now() - interval \'1 hour\'').execute()
        
        # Database size indicators
        db_stats = {
            'profiles': supabase.table('profiles').select('id', count='exact').execute().count,
            'exams': supabase.table('exams').select('id', count='exact').execute().count,
            'questions': supabase.table('questions').select('id', count='exact').execute().count,
            'user_exams': supabase.table('user_exams').select('id', count='exact').execute().count,
            'files': supabase.table('uploaded_files').select('id', count='exact').execute().count
        }
        
        return {
            'status': 'healthy',
            'reports': {
                'total': total_reports.count,
                'bugs': bug_reports.count,
                'error_rate': round(bug_reports.count / total_reports.count * 100, 2) if total_reports.count > 0 else 0
            },
            'activity': {
                'last_hour': recent_actions.count
            },
            'database': db_stats
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))