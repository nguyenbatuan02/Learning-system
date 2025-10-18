from fastapi import APIRouter, Depends, HTTPException, status
from supabase import Client
from app.core.supabase import get_supabase, get_supabase_admin
from app.api.deps import get_current_user
from app.models.user import UserResponse, ProfileUpdate, ChangePasswordRequest

router = APIRouter()

@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(
    current_user: dict = Depends(get_current_user)
):
    """
    Lấy thông tin user hiện tại
    """
    return UserResponse(**current_user)

@router.put("/me", response_model=UserResponse)
async def update_profile(
    profile_data: ProfileUpdate,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
    supabase_admin: Client = Depends(get_supabase_admin)
):
    """
    Cập nhật profile
    """
    try:
        update_data = profile_data.dict(exclude_unset=True)
        
        response = supabase.table("profiles").update(update_data).eq("id", current_user["id"]).execute()
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Profile not found"
            )
        return UserResponse(**response.data[0])
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Update failed: {str(e)}"
        )
    
@router.put("/me/password")
async def change_password(
    password_data: ChangePasswordRequest,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
    supabase_admin: Client = Depends(get_supabase_admin)
):
    """
    Đổi mật khẩu
    """
    try:
        try:
            supabase.auth.sign_in_with_password({
                "email": current_user["email"],
                "password": password_data.current_password
            })
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Mật khẩu hiện tại không đúng"
            )
        
        # Update password
        supabase.auth.admin.update_user_by_id(
            current_user["id"],
            {"password": password_data.new_password}
        )
        
        return {"message": "Đổi mật khẩu thành công"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


