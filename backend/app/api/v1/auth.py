from fastapi import APIRouter, Depends, HTTPException, status, Header
from supabase import Client
from app.core.supabase import get_supabase
from app.models.user import UserRegister, UserLogin, AuthResponse, UserResponse, ForgotPasswordRequest, ResetPasswordRequest
from typing import Dict, Optional
import os

router = APIRouter()

@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register(
    user_data: UserRegister,
    supabase: Client = Depends(get_supabase)
):
    """
    Đăng ký user mới
    """
    try:
        # Đăng ký với Supabase Auth
        auth_response = supabase.auth.sign_up({
            "email": user_data.email,
            "password": user_data.password,
            "options": {
                "data": {
                    "full_name": user_data.full_name
                }
            }
        })
        
        if not auth_response.user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Registration failed"
            )
        
        # Lấy profile vừa tạo (tự động tạo bởi trigger)
        profile = supabase.table("profiles").select("*").eq("id", auth_response.user.id).single().execute()
        
        return AuthResponse(
            user=UserResponse(**profile.data),
            access_token=auth_response.session.access_token,
            refresh_token=auth_response.session.refresh_token
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Registration error: {str(e)}"
        )

@router.post("/login", response_model=AuthResponse)
async def login(
    credentials: UserLogin,
    supabase: Client = Depends(get_supabase)
):
    """
    Đăng nhập
    """
    try:
        # Đăng nhập với Supabase
        auth_response = supabase.auth.sign_in_with_password({
            "email": credentials.email,
            "password": credentials.password
        })
        
        if not auth_response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )
        
        # Lấy profile
        profile = supabase.table("profiles").select("*").eq("id", auth_response.user.id).single().execute()
        
        return AuthResponse(
            user=UserResponse(**profile.data),
            access_token=auth_response.session.access_token,
            refresh_token=auth_response.session.refresh_token
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

@router.post("/logout")
async def logout(supabase: Client = Depends(get_supabase)):
    """
    Đăng xuất
    """
    try:
        supabase.auth.sign_out()
        return {"message": "Logged out successfully"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Logout error: {str(e)}"
        )

@router.post("/refresh", response_model=Dict[str, str])
async def refresh_token(
    refresh_token: str,
    supabase: Client = Depends(get_supabase)
):
    """
    Refresh access token
    """
    try:
        auth_response = supabase.auth.refresh_session(refresh_token)
        
        return {
            "access_token": auth_response.session.access_token,
            "refresh_token": auth_response.session.refresh_token
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )

@router.post("/forgot-password")
async def forgot_password(
    request: ForgotPasswordRequest,
    supabase: Client = Depends(get_supabase)
):
    """
    Gửi email reset password
    """
    try:
        
        # Gửi email reset password
        response = supabase.auth.reset_password_for_email(
            request.email,
            options={
                "redirect_to": f"{os.getenv('FRONTEND_URL', 'http://localhost:5173')}/reset-password"
            }
        )
        
        return {
            "message": "Nếu email tồn tại, chúng tôi đã gửi link đặt lại mật khẩu"
        }
        
    except Exception as e:
        print(f"❌ Forgot password error: {str(e)}")
        # Không show lỗi chi tiết cho security
        return {
            "message": "Nếu email tồn tại, chúng tôi đã gửi link đặt lại mật khẩu"
        }

@router.post("/reset-password")
async def reset_password(
    request: ResetPasswordRequest,
    authorization: Optional[str] = Header(None),  # Lấy token từ header
    supabase: Client = Depends(get_supabase)
):
    """
    Reset password với token từ email
    """
    try:
        # Lấy access token từ Authorization header
        if not authorization or not authorization.startswith('Bearer '):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Missing or invalid authorization token"
            )
        
        access_token = authorization.replace('Bearer ', '')
        
        # Set session với access token
        supabase.auth.set_session(access_token, access_token) 
        
        # Validate password length
        if len(request.new_password) < 6:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Mật khẩu phải có ít nhất 6 ký tự"
            )
        
        # Update password
        response = supabase.auth.update_user({
            "password": request.new_password
        })
        
        if not response.user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired reset token"
            )
        
        return {"message": "Mật khẩu đã được đặt lại thành công"}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Reset password error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Không thể đặt lại mật khẩu. Link có thể đã hết hạn."
        )