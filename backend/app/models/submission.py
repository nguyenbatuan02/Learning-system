from pydantic import BaseModel
from typing import List, Optional, Dict, Union, Any
from datetime import datetime

class StartExamRequest(BaseModel):
    exam_id: str

class StartExamResponse(BaseModel):
    user_exam_id: str
    exam_id: str
    started_at: datetime
    duration: Optional[int] = None  # minutes

class SubmitAnswerRequest(BaseModel):
    user_exam_id: str
    question_id: str
    user_answer: Union[str, List[str], Any]  

class SubmitExamRequest(BaseModel):
    user_exam_id: str

class QuestionResult(BaseModel):
    question_id: str
    question_text: str
    user_answer: str  
    correct_answer: str  
    is_correct: bool
    marks_obtained: float
    marks: float  
    explanation: Optional[str] = None
    ai_feedback: Optional[str] = None

class ExamResultResponse(BaseModel):
    user_exam_id: str
    exam_title: str
    total_score: float
    max_score: float  
    percentage: float
    time_spent: int  # seconds
    submitted_at: datetime
    questions: List[QuestionResult]