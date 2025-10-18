from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class QuestionCreate(BaseModel):
    question_text: str
    question_type: str  # multiple_choice, true_false, short_answer, essay
    options: Optional[dict] = None  # {"A": "...", "B": "...", ...}
    correct_answer: str
    marks: int = 1
    explanation: Optional[str] = None
    order_index: int = 0

class QuestionResponse(BaseModel):
    id: str
    exam_id: str
    question_text: str
    question_type: str
    options: Optional[dict]
    correct_answer: str
    marks: int
    explanation: Optional[str]
    order_index: int
    created_at: datetime

class ExamCreate(BaseModel):
    title: str
    description: Optional[str] = None
    duration: Optional[int] = None  # phút
    is_published: bool = False

class ExamUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    duration: Optional[int] = None
    is_published: Optional[bool] = None

class ExamResponse(BaseModel):
    id: str
    title: str
    description: Optional[str]
    duration: Optional[int]
    total_marks: int
    created_by: str
    is_published: bool
    created_at: datetime
    updated_at: datetime
    questions_count: Optional[int] = 0

class ExamDetailResponse(ExamResponse):
    questions: List[QuestionResponse] = []