from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from app.models.question_bank import (
    QuestionBankCreate, QuestionBankUpdate, QuestionBankResponse,
    QuestionBankItemCreate, QuestionBankItemUpdate, QuestionBankItemResponse,
    ShareQuestionBankRequest, ShareQuestionBankResponse
)
from app.api.deps import get_current_user
from supabase import Client
from app.core.supabase import get_supabase_admin, get_supabase

router = APIRouter()

@router.post("/", response_model=QuestionBankResponse)
async def create_question_bank(
    data: QuestionBankCreate,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_admin)
):
    """Tạo ngân hàng câu hỏi mới"""
    try:
        # Track analytics
        supabase.rpc('track_action', {
            'p_user_id': current_user['id'],
            'p_action_type': 'create_question_bank',
            'p_metadata': {'name': data.name}
        }).execute()
        
        result = supabase.table('question_banks').insert({
            'user_id': current_user['id'],
            'name': data.name,
            'description': data.description,
            'is_public': data.is_public
        }).execute()
        
        return result.data[0]
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/", response_model=List[QuestionBankResponse])
async def get_question_banks(
    is_public: Optional[bool] = None,
    search: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_admin)
):
    """Lấy danh sách ngân hàng câu hỏi"""
    try:
        query = supabase.table('question_banks').select('*, items:question_bank_items(count)')
        
        # Filter by user's banks or public banks
        if is_public is None:
            query = query.or_(f"user_id.eq.{current_user['id']},is_public.eq.true")
        elif is_public:
            query = query.eq('is_public', True)
        else:
            query = query.eq('user_id', current_user['id'])
        
        # Search by name
        if search:
            query = query.ilike('name', f'%{search}%')
        
        result = query.order('created_at', desc=True).execute()
        
        # Add items_count to each bank
        banks = []
        for bank in result.data:
            bank['items_count'] = len(bank.get('items', []))
            banks.append(bank)
        
        return banks
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{bank_id}", response_model=QuestionBankResponse)
async def get_question_bank(
    bank_id: str,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_admin)
):
    """Lấy chi tiết ngân hàng câu hỏi"""
    try:
        result = supabase.table('question_banks').select('*').eq('id', bank_id).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Question bank not found")
        
        bank = result.data[0]
        
        # Check permission
        if bank['user_id'] != current_user['id'] and not bank['is_public']:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Get items count
        items = supabase.table('question_bank_items').select('id').eq('question_bank_id', bank_id).execute()
        bank['items_count'] = len(items.data)
        
        return bank
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/{bank_id}", response_model=QuestionBankResponse)
async def update_question_bank(
    bank_id: str,
    data: QuestionBankUpdate,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_admin)
):
    """Cập nhật ngân hàng câu hỏi"""
    try:
        # Check ownership
        bank = supabase.table('question_banks').select('*').eq('id', bank_id).execute()
        if not bank.data or bank.data[0]['user_id'] != current_user['id']:
            raise HTTPException(status_code=403, detail="Access denied")
        
        update_data = data.dict(exclude_unset=True)
        update_data['updated_at'] = 'now()'
        
        result = supabase.table('question_banks').update(update_data).eq('id', bank_id).execute()
        
        return result.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/{bank_id}")
async def delete_question_bank(
    bank_id: str,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_admin)
):
    """Xóa ngân hàng câu hỏi"""
    try:
        # Check ownership
        bank = supabase.table('question_banks').select('*').eq('id', bank_id).execute()
        if not bank.data or bank.data[0]['user_id'] != current_user['id']:
            raise HTTPException(status_code=403, detail="Access denied")
        
        supabase.table('question_banks').delete().eq('id', bank_id).execute()
        
        return {"message": "Question bank deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{bank_id}/items", response_model=QuestionBankItemResponse)
async def add_question_to_bank(
    bank_id: str,
    data: QuestionBankItemCreate,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_admin)
):
    """Thêm câu hỏi vào ngân hàng"""
    try:
        # Check ownership
        bank = supabase.table('question_banks').select('*').eq('id', bank_id).execute()
        if not bank.data or bank.data[0]['user_id'] != current_user['id']:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Track analytics
        supabase.rpc('track_action', {
            'p_user_id': current_user['id'],
            'p_action_type': 'add_question_to_bank',
            'p_metadata': {'bank_id': bank_id}
        }).execute()
        
        result = supabase.table('question_bank_items').insert({
            'question_bank_id': bank_id,
            **data.dict()
        }).execute()
        
        return result.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{bank_id}/items", response_model=List[QuestionBankItemResponse])
async def get_questions_from_bank(
    bank_id: str,
    category_id: Optional[str] = None,
    difficulty: Optional[str] = None,
    tags: Optional[str] = Query(None),  # Comma-separated
    search: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_admin)
):
    """Lấy câu hỏi từ ngân hàng"""
    try:
        # Check access
        bank = supabase.table('question_banks').select('*').eq('id', bank_id).execute()
        if not bank.data:
            raise HTTPException(status_code=404, detail="Question bank not found")
        if bank.data[0]['user_id'] != current_user['id'] and not bank.data[0]['is_public']:
            raise HTTPException(status_code=403, detail="Access denied")
        
        query = supabase.table('question_bank_items').select('*').eq('question_bank_id', bank_id)
        
        # Apply filters
        if category_id:
            query = query.eq('category_id', category_id)
        if difficulty:
            query = query.eq('difficulty', difficulty)
        if tags:
            tag_list = tags.split(',')
            query = query.contains('tags', tag_list)
        if search:
            query = query.ilike('question_text', f'%{search}%')
        
        result = query.order('created_at', desc=True).execute()
        
        return result.data
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/{bank_id}/items/{item_id}", response_model=QuestionBankItemResponse)
async def update_question_in_bank(
    bank_id: str,
    item_id: str,
    data: QuestionBankItemUpdate,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_admin)
):
    """Cập nhật câu hỏi trong ngân hàng"""
    try:
        # Check ownership
        bank = supabase.table('question_banks').select('*').eq('id', bank_id).execute()
        if not bank.data or bank.data[0]['user_id'] != current_user['id']:
            raise HTTPException(status_code=403, detail="Access denied")
        
        update_data = data.dict(exclude_unset=True)
        update_data['updated_at'] = 'now()'
        
        result = supabase.table('question_bank_items').update(update_data).eq('id', item_id).eq('question_bank_id', bank_id).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Question not found")
        
        return result.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/{bank_id}/items/{item_id}")
async def delete_question_from_bank(
    bank_id: str,
    item_id: str,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_admin)
):
    """Xóa câu hỏi khỏi ngân hàng"""
    try:
        # Check ownership
        bank = supabase.table('question_banks').select('*').eq('id', bank_id).execute()
        if not bank.data or bank.data[0]['user_id'] != current_user['id']:
            raise HTTPException(status_code=403, detail="Access denied")
        
        supabase.table('question_bank_items').delete().eq('id', item_id).eq('question_bank_id', bank_id).execute()
        
        return {"message": "Question deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{bank_id}/share", response_model=ShareQuestionBankResponse)
async def share_question_bank(
    bank_id: str,
    data: ShareQuestionBankRequest,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_admin)
):
    """Chia sẻ ngân hàng câu hỏi"""
    try:
        # Check ownership
        bank = supabase.table('question_banks').select('*').eq('id', bank_id).execute()
        if not bank.data or bank.data[0]['user_id'] != current_user['id']:
            raise HTTPException(status_code=403, detail="Access denied")
        
        share_code = bank.data[0]['shared_code']
        
        # Track analytics
        supabase.rpc('track_action', {
            'p_user_id': current_user['id'],
            'p_action_type': 'share_question_bank',
            'p_metadata': {'bank_id': bank_id}
        }).execute()
        
        return {
            'share_code': share_code,
            'share_url': f"/question-banks/import/{share_code}"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/import/{share_code}")
async def import_shared_bank(
    share_code: str,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_admin)
):
    """Import ngân hàng câu hỏi được chia sẻ"""
    try:
        # Find bank by share code
        bank = supabase.table('question_banks').select('*').eq('shared_code', share_code).execute()
        
        if not bank.data:
            raise HTTPException(status_code=404, detail="Question bank not found")
        
        original_bank = bank.data[0]
        
        # Check if already imported
        existing = supabase.table('question_banks').select('*').eq('user_id', current_user['id']).ilike('name', f"%{original_bank['name']}%").execute()
        
        new_name = f"{original_bank['name']} (Copy)" if existing.data else original_bank['name']
        
        # Create copy of bank
        new_bank = supabase.table('question_banks').insert({
            'user_id': current_user['id'],
            'name': new_name,
            'description': original_bank['description'],
            'is_public': False
        }).execute()
        
        # Copy all questions
        questions = supabase.table('question_bank_items').select('*').eq('question_bank_id', original_bank['id']).execute()
        
        for q in questions.data:
            q_copy = q.copy()
            q_copy.pop('id', None)
            q_copy.pop('created_at', None)
            q_copy.pop('updated_at', None)
            q_copy['question_bank_id'] = new_bank.data[0]['id']
            q_copy['times_used'] = 0
            q_copy['times_correct'] = 0
            q_copy['times_incorrect'] = 0
            
            supabase.table('question_bank_items').insert(q_copy).execute()
        
        # Track analytics
        supabase.rpc('track_action', {
            'p_user_id': current_user['id'],
            'p_action_type': 'import_question_bank',
            'p_metadata': {'original_bank_id': original_bank['id'], 'new_bank_id': new_bank.data[0]['id']}
        }).execute()
        
        return {
            'message': 'Question bank imported successfully',
            'bank_id': new_bank.data[0]['id'],
            'questions_imported': len(questions.data)
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))