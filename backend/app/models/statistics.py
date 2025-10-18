from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class UserStats(BaseModel):
    total_exams_taken: int
    total_exams_completed: int
    average_score: float
    total_time_spent: int  # seconds
    last_activity: Optional[datetime]

class ExamHistoryItem(BaseModel):
    user_exam_id: str
    exam_id: str
    exam_title: str
    total_score: float
    max_score: int
    percentage: float
    time_spent: int
    submitted_at: datetime
    status: str

class ScoreDataPoint(BaseModel):
    date: str
    score: float
    exam_title: str

class QuestionTypeStats(BaseModel):
    question_type: str
    total: int
    correct: int
    accuracy: float

class WeakAreaItem(BaseModel):
    question_text: str
    times_attempted: int
    times_correct: int
    accuracy: float