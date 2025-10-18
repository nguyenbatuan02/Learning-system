from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from app.models.question_bank import ReportCreate, ReportUpdate, ReportResponse
from app.api.deps import get_current_user, get_current_admin
from supabase import Client
from app.core.supabase import get_supabase

router = APIRouter()

@router.post("/", response_model=ReportResponse)
async def create_report(
    data: ReportCreate,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """Tạo báo cáo lỗi"""
    try:
        result = supabase.table('reports').insert({
            'reporter_id': current_user['id'],
            'report_type': data.report_type,
            'related_type': data.related_type,
            'related_id': data.related_id,
            'title': data.title,
            'description': data.description,
            'status': 'pending'
        }).execute()
        
        # Track analytics
        supabase.rpc('track_action', {
            'p_user_id': current_user['id'],
            'p_action_type': 'create_report',
            'p_metadata': {
                'report_type': data.report_type,
                'related_type': data.related_type
            }
        }).execute()
        
        return result.data[0]
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/my-reports", response_model=List[ReportResponse])
async def get_my_reports(
    status: Optional[str] = None,
    report_type: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """Lấy danh sách báo cáo của user"""
    try:
        query = supabase.table('reports').select('*').eq('reporter_id', current_user['id'])
        
        if status:
            query = query.eq('status', status)
        if report_type:
            query = query.eq('report_type', report_type)
        
        result = query.order('created_at', desc=True).execute()
        return result.data
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/my-reports/{report_id}", response_model=ReportResponse)
async def get_my_report(
    report_id: str,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """Lấy chi tiết báo cáo"""
    try:
        result = supabase.table('reports').select('*').eq('id', report_id).eq('reporter_id', current_user['id']).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Report not found")
        
        return result.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# ============ ADMIN REPORTS MANAGEMENT ============

@router.get("/admin/all", response_model=List[ReportResponse])
async def get_all_reports(
    status: Optional[str] = None,
    report_type: Optional[str] = None,
    limit: int = Query(50, le=100),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(get_current_admin),
    supabase: Client = Depends(get_supabase)
):
    """Lấy tất cả báo cáo (Admin only)"""
    try:
        query = supabase.table('reports').select('*, reporter:profiles!reporter_id(email, full_name)')
        
        if status:
            query = query.eq('status', status)
        if report_type:
            query = query.eq('report_type', report_type)
        
        result = query.order('created_at', desc=True).range(offset, offset + limit - 1).execute()
        return result.data
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/admin/{report_id}", response_model=ReportResponse)
async def get_report_detail(
    report_id: str,
    current_user: dict = Depends(get_current_admin),
    supabase: Client = Depends(get_supabase)
):
    """Lấy chi tiết báo cáo (Admin only)"""
    try:
        result = supabase.table('reports').select('*, reporter:profiles!reporter_id(email, full_name)').eq('id', report_id).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Report not found")
        
        return result.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/admin/{report_id}", response_model=ReportResponse)
async def update_report(
    report_id: str,
    data: ReportUpdate,
    current_user: dict = Depends(get_current_admin),
    supabase: Client = Depends(get_supabase)
):
    """Cập nhật báo cáo (Admin only)"""
    try:
        update_data = data.dict(exclude_unset=True)
        
        # If resolving, add resolved info
        if data.status == 'resolved':
            update_data['resolved_by'] = current_user['id']
            update_data['resolved_at'] = 'now()'
        
        result = supabase.table('reports').update(update_data).eq('id', report_id).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Report not found")
        
        return result.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/admin/{report_id}")
async def delete_report(
    report_id: str,
    current_user: dict = Depends(get_current_admin),
    supabase: Client = Depends(get_supabase)
):
    """Xóa báo cáo (Admin only)"""
    try:
        supabase.table('reports').delete().eq('id', report_id).execute()
        return {"message": "Report deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# ============ REPORT STATISTICS ============

@router.get("/admin/stats/summary")
async def get_report_stats(
    current_user: dict = Depends(get_current_admin),
    supabase: Client = Depends(get_supabase)
):
    """Thống kê báo cáo (Admin only)"""
    try:
        # Total reports
        total = supabase.table('reports').select('id', count='exact').execute()
        
        # By status
        pending = supabase.table('reports').select('id', count='exact').eq('status', 'pending').execute()
        reviewing = supabase.table('reports').select('id', count='exact').eq('status', 'reviewing').execute()
        resolved = supabase.table('reports').select('id', count='exact').eq('status', 'resolved').execute()
        rejected = supabase.table('reports').select('id', count='exact').eq('status', 'rejected').execute()
        
        # By type
        types_result = supabase.table('reports').select('report_type').execute()
        types_count = {}
        for report in types_result.data:
            report_type = report['report_type']
            types_count[report_type] = types_count.get(report_type, 0) + 1
        
        # Recent reports (last 7 days)
        recent = supabase.table('reports').select('id', count='exact').gte('created_at', 'now() - interval \'7 days\'').execute()
        
        return {
            'total': total.count,
            'by_status': {
                'pending': pending.count,
                'reviewing': reviewing.count,
                'resolved': resolved.count,
                'rejected': rejected.count
            },
            'by_type': types_count,
            'recent_7_days': recent.count
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/admin/stats/trends")
async def get_report_trends(
    days: int = Query(30, ge=1, le=90),
    current_user: dict = Depends(get_current_admin),
    supabase: Client = Depends(get_supabase)
):
    """Xu hướng báo cáo theo thời gian (Admin only)"""
    try:
        # Get reports from last N days
        result = supabase.table('reports').select('created_at, report_type').gte('created_at', f'now() - interval \'{days} days\'').execute()
        
        # Group by date
        from collections import defaultdict
        from datetime import datetime
        
        daily_counts = defaultdict(int)
        type_trends = defaultdict(lambda: defaultdict(int))
        
        for report in result.data:
            date = report['created_at'][:10]  # YYYY-MM-DD
            report_type = report['report_type']
            
            daily_counts[date] += 1
            type_trends[report_type][date] += 1
        
        return {
            'period_days': days,
            'daily_counts': dict(daily_counts),
            'type_trends': {k: dict(v) for k, v in type_trends.items()}
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))