from pydantic import BaseModel
from typing import Optional, List, Dict, Union
from datetime import datetime

# Question Bank
class QuestionBankCreate(BaseModel):
    name: str
    description: Optional[str] = None
    is_public: bool = False

class QuestionBankUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_public: Optional[bool] = None

class QuestionBankResponse(BaseModel):
    id: str
    user_id: str
    name: str
    description: Optional[str]
    is_public: bool
    shared_code: str
    created_at: datetime
    updated_at: datetime
    items_count: Optional[int] = 0

# Question Bank Item
class QuestionBankItemCreate(BaseModel):
    question_text: str
    question_type: str  
    options: Optional[dict] = None
    correct_answer: Union[str, List[str]]
    explanation: Optional[str] = None
    difficulty: Optional[str] = None  # easy, medium, hard
    marks: int = 1
    category_id: Optional[str] = None
    tags: Optional[List[str]] = None

class QuestionBankItemUpdate(BaseModel):
    question_text: Optional[str] = None
    question_type: Optional[str] = None
    options: Optional[dict] = None
    correct_answer: Optional[Union[str, List[str]]] = None
    explanation: Optional[str] = None
    difficulty: Optional[str] = None
    marks: Optional[int] = None
    category_id: Optional[str] = None
    tags: Optional[List[str]] = None

class QuestionBankItemResponse(BaseModel):
    id: str
    question_bank_id: str
    question_text: str
    question_type: str
    options: Optional[dict]
    correct_answer: Union[str, List[str]]
    explanation: Optional[str]
    difficulty: Optional[str]
    marks: int
    category_id: Optional[str]
    tags: Optional[List[str]]
    times_used: int
    times_correct: int
    times_incorrect: int
    created_at: datetime
    updated_at: datetime

# Category
class CategoryCreate(BaseModel):
    name: str
    description: Optional[str] = None
    parent_id: Optional[str] = None

class CategoryResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    parent_id: Optional[str]
    created_at: datetime

# Share
class ShareQuestionBankRequest(BaseModel):
    access_level: str = "view"  # view or copy

class ShareQuestionBankResponse(BaseModel):
    share_code: str
    share_url: str

# Random Exam Generator
class GenerateRandomExamRequest(BaseModel):
    question_bank_ids: List[str]
    num_questions: int
    duration: Optional[int] = None
    category_ids: Optional[List[str]] = None
    difficulty_levels: Optional[List[str]] = None
    tags: Optional[List[str]] = None
    exam_title: Optional[str] = None
    exam_description: Optional[str] = None

class GenerateRandomExamResponse(BaseModel):
    exam_id: str
    exam_title: str
    total_questions: int
    selected_questions: List[str]

# Exam Template
class ExamTemplateCreate(BaseModel):
    name: str
    description: Optional[str] = None
    num_questions: int
    duration: Optional[int] = None
    question_bank_ids: List[str]
    category_ids: Optional[List[str]] = None
    difficulty_levels: Optional[List[str]] = None
    tags: Optional[List[str]] = None
    shuffle_questions: bool = True
    show_answers_after_submit: bool = True
    allow_retake: bool = True
    pass_percentage: Optional[float] = None

class ExamTemplateResponse(BaseModel):
    id: str
    user_id: str
    name: str
    description: Optional[str]
    num_questions: int
    duration: Optional[int]
    question_bank_ids: List[str]
    category_ids: Optional[List[str]]
    difficulty_levels: Optional[List[str]]
    tags: Optional[List[str]]
    shuffle_questions: bool
    show_answers_after_submit: bool
    allow_retake: bool
    pass_percentage: Optional[float]
    created_at: datetime
    updated_at: datetime

# Report
class ReportCreate(BaseModel):
    report_type: str  # ocr_error, question_error, answer_error, bug, feature_request, other
    related_type: Optional[str] = None  # question, exam, file, system
    related_id: Optional[str] = None
    title: str
    description: str

class ReportUpdate(BaseModel):
    status: Optional[str] = None  # pending, reviewing, resolved, rejected
    admin_note: Optional[str] = None

class ReportResponse(BaseModel):
    id: str
    reporter_id: str
    report_type: str
    related_type: Optional[str]
    related_id: Optional[str]
    title: str
    description: str
    status: str
    admin_note: Optional[str]
    resolved_by: Optional[str]
    resolved_at: Optional[datetime]
    created_at: datetime

# Practice Session
class PracticeSessionCreate(BaseModel):
    session_type: str = "wrong_answers"  # wrong_answers, weak_topics, custom
    question_ids: Optional[List[str]] = None  # For custom

class PracticeSessionResponse(BaseModel):
    id: str
    user_id: str
    session_type: str
    question_ids: List[str]
    completed_question_ids: List[str]
    status: str
    started_at: datetime
    completed_at: Optional[datetime]