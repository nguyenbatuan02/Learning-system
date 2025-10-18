from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
from app.models.question_bank import PracticeSessionCreate, PracticeSessionResponse
from app.api.deps import get_current_user
from supabase import Client
from app.core.supabase import get_supabase

router = APIRouter()


@router.post("/sessions", response_model=PracticeSessionResponse)
async def create_practice_session(
    data: PracticeSessionCreate,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """Tạo session ôn luyện"""
    try:
        question_ids = []
        
        if data.session_type == "wrong_answers":
            # Get questions user answered incorrectly
            result = supabase.table('user_answers').select('question_id').eq('user_id', current_user['id']).eq('is_correct', False).execute()
            question_ids = list(set([answer['question_id'] for answer in result.data]))
            
        elif data.session_type == "weak_topics":
            # Get questions from weak categories
            # First, find weak categories
            weak_stats = supabase.table('user_statistics').select('weak_categories').eq('user_id', current_user['id']).execute()
            
            if weak_stats.data and weak_stats.data[0].get('weak_categories'):
                weak_categories = weak_stats.data[0]['weak_categories']
                
                # Get questions from these categories
                for cat in weak_categories[:3]:  # Top 3 weak categories
                    questions = supabase.table('question_bank_items').select('id').eq('category_id', cat).limit(10).execute()
                    question_ids.extend([q['id'] for q in questions.data])
            else:
                raise HTTPException(status_code=400, detail="No weak topics found")
                
        elif data.session_type == "custom":
            if not data.question_ids:
                raise HTTPException(status_code=400, detail="question_ids required for custom session")
            question_ids = data.question_ids
        
        if not question_ids:
            raise HTTPException(status_code=400, detail="No questions found for practice")
        
        # Create session
        result = supabase.table('practice_sessions').insert({
            'user_id': current_user['id'],
            'session_type': data.session_type,
            'question_ids': question_ids,
            'status': 'in_progress'
        }).execute()
        
        # Track analytics
        supabase.rpc('track_action', {
            'p_user_id': current_user['id'],
            'p_action_type': 'start_practice_session',
            'p_metadata': {
                'session_type': data.session_type,
                'num_questions': len(question_ids)
            }
        }).execute()
        
        return result.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/sessions", response_model=List[PracticeSessionResponse])
async def get_practice_sessions(
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """Lấy danh sách practice sessions"""
    try:
        query = supabase.table('practice_sessions').select('*').eq('user_id', current_user['id'])
        
        if status:
            query = query.eq('status', status)
        
        result = query.order('started_at', desc=True).execute()
        return result.data
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/sessions/{session_id}", response_model=PracticeSessionResponse)
async def get_practice_session(
    session_id: str,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """Lấy chi tiết practice session"""
    try:
        result = supabase.table('practice_sessions').select('*').eq('id', session_id).eq('user_id', current_user['id']).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Practice session not found")
        
        return result.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/sessions/{session_id}/questions")
async def get_practice_questions(
    session_id: str,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """Lấy câu hỏi trong practice session"""
    try:
        # Get session
        session = supabase.table('practice_sessions').select('*').eq('id', session_id).eq('user_id', current_user['id']).execute()
        
        if not session.data:
            raise HTTPException(status_code=404, detail="Practice session not found")
        
        question_ids = session.data[0]['question_ids']
        
        # Get questions (from questions table or question_bank_items)
        questions = []
        
        # Try from questions table first
        for q_id in question_ids:
            q = supabase.table('questions').select('*').eq('id', q_id).execute()
            if q.data:
                questions.append(q.data[0])
            else:
                # Try from question_bank_items
                q = supabase.table('question_bank_items').select('*').eq('id', q_id).execute()
                if q.data:
                    questions.append(q.data[0])
        
        return {
            'session_id': session_id,
            'questions': questions,
            'total': len(questions),
            'completed': len(session.data[0]['completed_question_ids'])
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/sessions/{session_id}/complete-question/{question_id}")
async def mark_question_completed(
    session_id: str,
    question_id: str,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """Đánh dấu câu hỏi đã hoàn thành"""
    try:
        # Get session
        session = supabase.table('practice_sessions').select('*').eq('id', session_id).eq('user_id', current_user['id']).execute()
        
        if not session.data:
            raise HTTPException(status_code=404, detail="Practice session not found")
        
        completed_ids = session.data[0]['completed_question_ids']
        
        if question_id not in completed_ids:
            completed_ids.append(question_id)
            
            # Update session
            update_data = {
                'completed_question_ids': completed_ids
            }
            
            # Check if all questions completed
            if len(completed_ids) >= len(session.data[0]['question_ids']):
                update_data['status'] = 'completed'
                update_data['completed_at'] = 'now()'
            
            supabase.table('practice_sessions').update(update_data).eq('id', session_id).execute()
        
        return {"message": "Question marked as completed"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/sessions/{session_id}/complete")
async def complete_practice_session(
    session_id: str,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """Hoàn thành practice session"""
    try:
        result = supabase.table('practice_sessions').update({
            'status': 'completed',
            'completed_at': 'now()'
        }).eq('id', session_id).eq('user_id', current_user['id']).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Practice session not found")
        
        return {"message": "Practice session completed"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# ============ PRACTICE SUGGESTIONS ============

@router.get("/suggestions")
async def get_practice_suggestions(
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """Lấy gợi ý ôn luyện"""
    try:
        suggestions = []
        
        # 1. Wrong answers count
        wrong_answers = supabase.table('user_answers').select('question_id').eq('user_id', current_user['id']).eq('is_correct', False).execute()
        
        if wrong_answers.data:
            suggestions.append({
                'type': 'wrong_answers',
                'title': 'Review Wrong Answers',
                'description': f'You have {len(wrong_answers.data)} questions to review',
                'count': len(wrong_answers.data),
                'priority': 'high'
            })
        
        # 2. Weak topics
        stats = supabase.table('user_statistics').select('weak_categories').eq('user_id', current_user['id']).execute()
        
        if stats.data and stats.data[0].get('weak_categories'):
            weak_cats = stats.data[0]['weak_categories'][:3]
            suggestions.append({
                'type': 'weak_topics',
                'title': 'Practice Weak Topics',
                'description': f'Focus on {len(weak_cats)} topics that need improvement',
                'categories': weak_cats,
                'priority': 'medium'
            })
        
        # 3. Not practiced recently
        recent_practice = supabase.table('practice_sessions').select('*').eq('user_id', current_user['id']).gte('started_at', 'now() - interval \'7 days\'').execute()
        
        if not recent_practice.data:
            suggestions.append({
                'type': 'regular_practice',
                'title': 'Regular Practice',
                'description': 'Keep your skills sharp with regular practice',
                'priority': 'low'
            })
        
        return {
            'suggestions': suggestions,
            'total': len(suggestions)
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))