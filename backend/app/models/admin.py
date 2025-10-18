from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class UserListResponse(BaseModel):
    id: str
    email: str
    full_name: Optional[str]
    role: str
    created_at: datetime

class UserUpdateRole(BaseModel):
    role: str  # "admin" hoặc "user"

class DashboardStats(BaseModel):
    total_users: int
    total_admins: int
    total_exams: int
    total_questions: int
    total_submissions: int