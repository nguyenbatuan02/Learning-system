from fastapi import APIRouter, Depends, HTTPException, status, Query
from supabase import Client
from app.core.supabase import get_supabase
from app.api.deps import get_current_user, get_current_admin
from app.models.exam import (
    ExamCreate, ExamUpdate, ExamResponse, ExamDetailResponse,
    QuestionCreate, QuestionResponse
)
from typing import List
import uuid

router = APIRouter()

@router.post("/", response_model=ExamResponse, status_code=status.HTTP_201_CREATED)
async def create_exam(
    exam_data: ExamCreate,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """
    Tạo đề thi mới
    """
    try:
        exam = {
            "title": exam_data.title,
            "description": exam_data.description,
            "duration": exam_data.duration,
            "is_published": exam_data.is_published,
            "created_by": current_user["id"],
            "total_marks": 0
        }
        
        response = supabase.table("exams").insert(exam).execute()
        
        return ExamResponse(**response.data[0])
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create exam: {str(e)}"
        )

@router.get("/", response_model=List[ExamResponse])
async def get_exams(
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100)
):
    """
    Lấy danh sách đề thi
    - User thường: chỉ thấy đề đã publish
    - Admin: thấy tất cả
    """
    try:
        query = supabase.table("exams").select("*")
        
        # User thường chỉ thấy đề published
        if current_user.get("role") != "admin":
            query = query.eq("is_published", True)
        
        response = query.order("created_at", desc=True)\
            .range(skip, skip + limit - 1)\
            .execute()
        
        # Get questions count for each exam
        exams_with_count = []
        for exam in response.data:
            questions = supabase.table("questions")\
                .select("id", count="exact")\
                .eq("exam_id", exam["id"])\
                .execute()
            
            exam["questions_count"] = questions.count
            exams_with_count.append(ExamResponse(**exam))
        
        return exams_with_count
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to fetch exams: {str(e)}"
        )

@router.get("/{exam_id}", response_model=ExamDetailResponse)
async def get_exam_detail(
    exam_id: str,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """
    Lấy chi tiết đề thi kèm câu hỏi
    """
    try:
        # Get exam
        exam_response = supabase.table("exams")\
            .select("*")\
            .eq("id", exam_id)\
            .single()\
            .execute()
        
        if not exam_response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Exam not found"
            )
        
        exam = exam_response.data
        
        # Check permission
        if current_user.get("role") != "admin" and not exam.get("is_published"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to view this exam"
            )
        
        # Get questions
        questions_response = supabase.table("questions")\
            .select("*")\
            .eq("exam_id", exam_id)\
            .order("order_index")\
            .execute()
        
        exam["questions"] = [QuestionResponse(**q) for q in questions_response.data]
        exam["questions_count"] = len(questions_response.data)
        
        return ExamDetailResponse(**exam)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to get exam: {str(e)}"
        )

@router.put("/{exam_id}", response_model=ExamResponse)
async def update_exam(
    exam_id: str,
    exam_data: ExamUpdate,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """
    Cập nhật thông tin đề thi
    """
    try:
        # Check ownership
        exam = supabase.table("exams").select("*").eq("id", exam_id).single().execute()
        
        if not exam.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Exam not found"
            )
        
        # Only creator or admin can update
        if exam.data["created_by"] != current_user["id"] and current_user.get("role") != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to update this exam"
            )
        
        update_data = exam_data.dict(exclude_unset=True)
        
        response = supabase.table("exams")\
            .update(update_data)\
            .eq("id", exam_id)\
            .execute()
        
        return ExamResponse(**response.data[0])
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to update exam: {str(e)}"
        )

@router.delete("/{exam_id}")
async def delete_exam(
    exam_id: str,
    current_admin: dict = Depends(get_current_admin),
    supabase: Client = Depends(get_supabase)
):
    """
    Xóa đề thi (chỉ admin)
    """
    try:
        response = supabase.table("exams").delete().eq("id", exam_id).execute()
        
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Exam not found"
            )
        
        return {"message": "Exam deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to delete exam: {str(e)}"
        )

# QUESTIONS ENDPOINTS

@router.post("/{exam_id}/questions", response_model=QuestionResponse, status_code=status.HTTP_201_CREATED)
async def add_question_to_exam(
    exam_id: str,
    question_data: QuestionCreate,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """
    Thêm câu hỏi vào đề thi
    """
    try:
        # Check exam exists and permission
        exam = supabase.table("exams").select("*").eq("id", exam_id).single().execute()
        
        if not exam.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Exam not found"
            )
        
        if exam.data["created_by"] != current_user["id"] and current_user.get("role") != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to add questions to this exam"
            )
        
        question = {
            "exam_id": exam_id,
            **question_data.dict()
        }
        
        response = supabase.table("questions").insert(question).execute()
        
        # Update total_marks
        new_marks = exam.data["total_marks"] + question_data.marks
        supabase.table("exams").update({"total_marks": new_marks}).eq("id", exam_id).execute()
        
        return QuestionResponse(**response.data[0])
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to add question: {str(e)}"
        )

@router.delete("/{exam_id}/questions/{question_id}")
async def delete_question(
    exam_id: str,
    question_id: str,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """
    Xóa câu hỏi khỏi đề thi
    """
    try:
        # Get question
        question = supabase.table("questions").select("*").eq("id", question_id).single().execute()
        
        if not question.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Question not found"
            )
        
        # Check exam ownership
        exam = supabase.table("exams").select("*").eq("id", exam_id).single().execute()
        
        if exam.data["created_by"] != current_user["id"] and current_user.get("role") != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission"
            )
        
        # Delete question
        supabase.table("questions").delete().eq("id", question_id).execute()
        
        # Update total_marks
        new_marks = exam.data["total_marks"] - question.data["marks"]
        supabase.table("exams").update({"total_marks": max(0, new_marks)}).eq("id", exam_id).execute()
        
        return {"message": "Question deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to delete question: {str(e)}"
        )