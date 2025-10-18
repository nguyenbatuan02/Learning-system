from pydantic import BaseModel
from typing import List, Optional, Dict

class AnalyzeTextRequest(BaseModel):
    text: str
    language: str = "vi"

class QuestionExtracted(BaseModel):
    question_text: str
    question_type: str
    options: Optional[Dict[str, str]] = None
    correct_answer: str
    explanation: Optional[str] = None

class AnalyzeTextResponse(BaseModel):
    exam_title: Optional[str] = None
    exam_description: Optional[str] = None
    questions: List[QuestionExtracted]

class GenerateSimilarRequest(BaseModel):
    question: str
    count: int = 3

class GradeEssayRequest(BaseModel):
    question: str
    student_answer: str
    correct_answer: str

class GradeEssayResponse(BaseModel):
    score: float
    feedback: str
    strengths: List[str]
    improvements: List[str]