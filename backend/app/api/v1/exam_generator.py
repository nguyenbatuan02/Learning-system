from fastapi import APIRouter, Depends, HTTPException
from typing import List
import random
from app.models.question_bank import (
    GenerateRandomExamRequest, GenerateRandomExamResponse,
    ExamTemplateCreate, ExamTemplateResponse
)
from app.api.deps import get_current_user
from supabase import Client
from app.core.supabase import get_supabase

router = APIRouter()


@router.post("/generate-random", response_model=GenerateRandomExamResponse)
async def generate_random_exam(
    data: GenerateRandomExamRequest,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """Tạo đề thi ngẫu nhiên từ question banks"""
    try:
        # Validate question banks access
        all_questions = []
        
        for bank_id in data.question_bank_ids:
            # Check access to bank
            bank = supabase.table('question_banks').select('*').eq('id', bank_id).execute()
            if not bank.data:
                raise HTTPException(status_code=404, detail=f"Question bank {bank_id} not found")
            if bank.data[0]['user_id'] != current_user['id'] and not bank.data[0]['is_public']:
                raise HTTPException(status_code=403, detail=f"Access denied to question bank {bank_id}")
            
            # Get questions from this bank
            query = supabase.table('question_bank_items').select('*').eq('question_bank_id', bank_id)
            
            # Apply filters
            if data.category_ids:
                query = query.in_('category_id', data.category_ids)
            if data.difficulty_levels:
                query = query.in_('difficulty', data.difficulty_levels)
            if data.tags:
                query = query.contains('tags', data.tags)
            
            questions = query.execute()
            all_questions.extend(questions.data)
        
        if not all_questions:
            raise HTTPException(status_code=400, detail="No questions found matching the criteria")
        
        # Check if enough questions available
        if len(all_questions) < data.num_questions:
            raise HTTPException(
                status_code=400, 
                detail=f"Not enough questions. Found {len(all_questions)}, requested {data.num_questions}"
            )
        
        # Randomly select questions
        selected_questions = random.sample(all_questions, data.num_questions)
        
        # Create exam
        exam_title = data.exam_title or f"Random Exam - {data.num_questions} questions"
        exam_description = data.exam_description or "Randomly generated exam"
        
        exam = supabase.table('exams').insert({
            'title': exam_title,
            'description': exam_description,
            'duration': data.duration,
            'created_by': current_user['id'],
            'total_marks': sum(q['marks'] for q in selected_questions)
        }).execute()
        
        exam_id = exam.data[0]['id']
        
        # Add questions to exam
        for idx, question in enumerate(selected_questions):
            supabase.table('questions').insert({
                'exam_id': exam_id,
                'question_text': question['question_text'],
                'question_type': question['question_type'],
                'options': question['options'],
                'correct_answer': question['correct_answer'],
                'explanation': question['explanation'],
                'marks': question['marks'],
                'order_number': idx + 1
            }).execute()
            
            # Update usage stats
            supabase.table('question_bank_items').update({
                'times_used': question['times_used'] + 1
            }).eq('id', question['id']).execute()
        
        # Track analytics
        supabase.rpc('track_action', {
            'p_user_id': current_user['id'],
            'p_action_type': 'generate_random_exam',
            'p_metadata': {
                'exam_id': exam_id,
                'num_questions': data.num_questions,
                'question_bank_ids': data.question_bank_ids
            }
        }).execute()
        
        return {
            'exam_id': exam_id,
            'exam_title': exam_title,
            'total_questions': data.num_questions,
            'selected_questions': [q['id'] for q in selected_questions]
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/templates", response_model=ExamTemplateResponse)
async def create_exam_template(
    data: ExamTemplateCreate,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """Tạo template để generate exam sau này"""
    try:
        result = supabase.table('exam_templates').insert({
            'user_id': current_user['id'],
            **data.dict()
        }).execute()
        
        return result.data[0]
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/templates", response_model=List[ExamTemplateResponse])
async def get_exam_templates(
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """Lấy danh sách templates"""
    try:
        result = supabase.table('exam_templates').select('*').eq('user_id', current_user['id']).order('created_at', desc=True).execute()
        return result.data
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/templates/{template_id}", response_model=ExamTemplateResponse)
async def get_exam_template(
    template_id: str,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """Lấy chi tiết template"""
    try:
        result = supabase.table('exam_templates').select('*').eq('id', template_id).eq('user_id', current_user['id']).execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Template not found")
        return result.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/templates/{template_id}/generate", response_model=GenerateRandomExamResponse)
async def generate_exam_from_template(
    template_id: str,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """Generate exam từ template"""
    try:
        # Get template
        template = supabase.table('exam_templates').select('*').eq('id', template_id).eq('user_id', current_user['id']).execute()
        if not template.data:
            raise HTTPException(status_code=404, detail="Template not found")
        
        template_data = template.data[0]
        
        # Create request from template
        request = GenerateRandomExamRequest(
            question_bank_ids=template_data['question_bank_ids'],
            num_questions=template_data['num_questions'],
            duration=template_data['duration'],
            category_ids=template_data['category_ids'],
            difficulty_levels=template_data['difficulty_levels'],
            tags=template_data['tags'],
            exam_title=f"{template_data['name']} - {template_data['created_at'][:10]}"
        )
        
        # Generate exam
        return await generate_random_exam(request, current_user, supabase)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/templates/{template_id}")
async def delete_exam_template(
    template_id: str,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """Xóa template"""
    try:
        supabase.table('exam_templates').delete().eq('id', template_id).eq('user_id', current_user['id']).execute()
        return {"message": "Template deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))