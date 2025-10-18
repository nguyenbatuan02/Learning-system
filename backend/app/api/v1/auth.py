from fastapi import APIRouter, Depends, HTTPException, status
from supabase import Client
from app.core.supabase import get_supabase
from app.models.user import UserRegister, UserLogin, AuthResponse, UserResponse
from typing import Dict

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