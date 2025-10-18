from fastapi import APIRouter, Depends, HTTPException, status, Query
from supabase import Client
from app.core.supabase import get_supabase
from app.api.deps import get_current_admin
from app.models.admin import UserListResponse, UserUpdateRole, DashboardStats
from typing import List

router = APIRouter()

@router.get("/stats", response_model=DashboardStats)
async def get_dashboard_stats(
    current_admin: dict = Depends(get_current_admin),
    supabase: Client = Depends(get_supabase)
):
    """
    Lấy thống kê tổng quan cho dashboard
    """
    try:
        # Count users
        users = supabase.table("profiles").select("id, role", count="exact").execute()
        total_users = users.count
        total_admins = len([u for u in users.data if u.get("role") == "admin"])
        
        # Count exams
        exams = supabase.table("exams").select("id", count="exact").execute()
        total_exams = exams.count
        
        # Count questions
        questions = supabase.table("questions").select("id", count="exact").execute()
        total_questions = questions.count
        
        # Count submissions
        submissions = supabase.table("user_exams").select("id", count="exact").execute()
        total_submissions = submissions.count
        
        return DashboardStats(
            total_users=total_users,
            total_admins=total_admins,
            total_exams=total_exams,
            total_questions=total_questions,
            total_submissions=total_submissions
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get stats: {str(e)}"
        )

@router.get("/users", response_model=List[UserListResponse])
async def get_all_users(
    current_admin: dict = Depends(get_current_admin),
    supabase: Client = Depends(get_supabase),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100)
):
    """
    Lấy danh sách tất cả users (chỉ admin)
    """
    try:
        response = supabase.table("profiles")\
            .select("*")\
            .order("created_at", desc=True)\
            .range(skip, skip + limit - 1)\
            .execute()
        
        return [UserListResponse(**user) for user in response.data]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to fetch users: {str(e)}"
        )

@router.put("/users/{user_id}/role", response_model=UserListResponse)
async def update_user_role(
    user_id: str,
    role_data: UserUpdateRole,
    current_admin: dict = Depends(get_current_admin),
    supabase: Client = Depends(get_supabase)
):
    """
    Cập nhật role của user (admin/user)
    """
    if role_data.role not in ["admin", "user"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Role must be 'admin' or 'user'"
        )
    
    try:
        response = supabase.table("profiles")\
            .update({"role": role_data.role})\
            .eq("id", user_id)\
            .execute()
        
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        return UserListResponse(**response.data[0])
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to update role: {str(e)}"
        )

@router.delete("/users/{user_id}")
async def delete_user(
    user_id: str,
    current_admin: dict = Depends(get_current_admin),
    supabase: Client = Depends(get_supabase)
):
    """
    Xóa user (chỉ xóa profile, không xóa auth.users)
    """
    try:
        # Không cho phép tự xóa chính mình
        if user_id == current_admin["id"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete yourself"
            )
        
        response = supabase.table("profiles").delete().eq("id", user_id).execute()
        
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        return {"message": "User deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to delete user: {str(e)}"
        )