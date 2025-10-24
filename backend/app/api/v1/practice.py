from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from app.api.deps import get_current_user
from supabase import Client
from app.core.supabase import get_supabase, get_supabase_admin
from datetime import datetime, timezone
from pydantic import BaseModel
import logging
import uuid

router = APIRouter()
logger = logging.getLogger(__name__)

# ============ MODELS ============

class PracticeSessionCreate(BaseModel):
    session_type: str
    question_ids: Optional[List[str]] = None
    num_questions: Optional[int] = 10
    categories: Optional[List[str]] = []
    difficulty: Optional[str] = None

class PracticeSessionResponse(BaseModel):
    id: str
    user_id: str
    session_type: str
    question_ids: List[str]
    completed_question_ids: List[str]
    status: str
    started_at: datetime
    completed_at: Optional[datetime] = None

# ============ PRACTICE SUGGESTIONS ============

@router.get("/suggestions")
async def get_practice_suggestions(
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_admin)
):
    """Lấy gợi ý ôn luyện"""
    try:
        logger.info(f"📊 Getting practice suggestions for user {current_user['id']}")
        suggestions = []
        
        # 1. Get wrong answers count
        try:
            # Get all user_exam_ids for this user
            user_exams = supabase.table('user_exams')\
                .select('id')\
                .eq('user_id', current_user['id'])\
                .eq('status', 'graded')\
                .execute()
            
            if user_exams.data:
                user_exam_ids = [ue['id'] for ue in user_exams.data]
                
                # Count wrong answers
                wrong_answers = supabase.table('user_answers')\
                    .select('id', count='exact')\
                    .in_('user_exam_id', user_exam_ids)\
                    .eq('is_correct', False)\
                    .execute()
                
                wrong_count = wrong_answers.count or 0
                
                if wrong_count > 0:
                    suggestions.append({
                        'type': 'wrong_answers',
                        'title': 'Ôn lại câu sai',
                        'description': f'Bạn có {wrong_count} câu cần ôn lại',
                        'count': wrong_count,
                        'priority': 'high'
                    })
                    logger.info(f"✅ Found {wrong_count} wrong answers")
            else:
                logger.info("No graded exams found")
        except Exception as e:
            logger.error(f"Error getting wrong answers: {str(e)}")
        
        # 2. Get weak topics based on question types
        try:
            if user_exams.data:
                user_exam_ids = [ue['id'] for ue in user_exams.data]
                
                # Get question type statistics
                type_stats = {}
                
                answers = supabase.table('user_answers')\
                    .select('exam_question_id, is_correct')\
                    .in_('user_exam_id', user_exam_ids)\
                    .execute()
                
                for ans in answers.data:
                    try:
                        # Get question type
                        exam_question = supabase.table('exam_questions')\
                            .select('question_bank_item_id')\
                            .eq('id', ans['exam_question_id'])\
                            .single()\
                            .execute()
                        
                        if exam_question.data:
                            question = supabase.table('question_bank_items')\
                                .select('question_type')\
                                .eq('id', exam_question.data['question_bank_item_id'])\
                                .single()\
                                .execute()
                            
                            if question.data:
                                q_type = question.data['question_type']
                                
                                if q_type not in type_stats:
                                    type_stats[q_type] = {'total': 0, 'correct': 0}
                                
                                type_stats[q_type]['total'] += 1
                                if ans.get('is_correct'):
                                    type_stats[q_type]['correct'] += 1
                    except:
                        continue
                
                # Find weak topics (accuracy < 70%)
                weak_topics = []
                for q_type, stats in type_stats.items():
                    if stats['total'] >= 3:  # At least 3 attempts
                        accuracy = (stats['correct'] / stats['total']) * 100
                        if accuracy < 70:
                            weak_topics.append({
                                'type': q_type,
                                'accuracy': round(accuracy, 1)
                            })
                
                if weak_topics:
                    suggestions.append({
                        'type': 'weak_topics',
                        'title': 'Luyện điểm yếu',
                        'description': f'Tập trung vào {len(weak_topics)} loại câu cần cải thiện',
                        'categories': [t['type'] for t in weak_topics],
                        'priority': 'medium'
                    })
                    logger.info(f"✅ Found {len(weak_topics)} weak topics")
        except Exception as e:
            logger.error(f"Error getting weak topics: {str(e)}")
        
        # 3. Regular practice reminder
        suggestions.append({
            'type': 'regular_practice',
            'title': 'Luyện tập thường xuyên',
            'description': 'Giữ vững kỹ năng với việc luyện tập đều đặn',
            'priority': 'low'
        })
        
        logger.info(f"📊 Returning {len(suggestions)} suggestions")
        
        return {
            'suggestions': suggestions,
            'total': len(suggestions)
        }
    except Exception as e:
        logger.error(f"❌ Get suggestions error: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


# ============ PRACTICE SESSIONS ============

@router.post("/sessions")
async def create_practice_session(
    data: PracticeSessionCreate,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_admin)
):
    """Tạo session ôn luyện"""
    try:
        logger.info(f"📝 Creating practice session type: {data.session_type}")
        question_ids = []
        
        if data.session_type == "wrong_answers":
            # Get questions user answered incorrectly
            user_exams = supabase.table('user_exams')\
                .select('id')\
                .eq('user_id', current_user['id'])\
                .eq('status', 'graded')\
                .execute()
            
            if user_exams.data:
                user_exam_ids = [ue['id'] for ue in user_exams.data]
                
                wrong_answers = supabase.table('user_answers')\
                    .select('exam_question_id')\
                    .in_('user_exam_id', user_exam_ids)\
                    .eq('is_correct', False)\
                    .limit(20)\
                    .execute()
                
                # Get unique question_bank_item_ids
                seen = set()
                for ans in wrong_answers.data:
                    try:
                        exam_q = supabase.table('exam_questions')\
                            .select('question_bank_item_id')\
                            .eq('id', ans['exam_question_id'])\
                            .single()\
                            .execute()
                        
                        if exam_q.data:
                            qb_id = exam_q.data['question_bank_item_id']
                            if qb_id not in seen:
                                question_ids.append(qb_id)
                                seen.add(qb_id)
                    except:
                        continue
            
            if not question_ids:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Không tìm thấy câu sai nào để ôn luyện"
                )
                
        elif data.session_type == "weak_topics":
            # Get random questions from question bank
            questions = supabase.table('question_bank_items')\
                .select('id')\
                .limit(data.num_questions or 15)\
                .execute()
            
            question_ids = [q['id'] for q in questions.data]
            
            if not question_ids:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Không tìm thấy câu hỏi phù hợp"
                )
                
        elif data.session_type == "custom":
            if not data.question_ids:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Vui lòng chọn câu hỏi"
                )
            question_ids = data.question_ids
        
        if not question_ids:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Không tìm thấy câu hỏi nào"
            )
        
        # Create session in database
        session = supabase.table('practice_sessions').insert({
            'user_id': current_user['id'],
            'session_type': data.session_type,
            'question_ids': question_ids,
            'completed_question_ids': [],
            'status': 'in_progress'
        }).execute()
        
        if not session.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create practice session"
            )
        
        logger.info(f"✅ Created practice session {session.data[0]['id']} with {len(question_ids)} questions")
        
        return session.data[0]
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Create session error: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/sessions")
async def get_practice_sessions(
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_admin)
):
    """Lấy danh sách practice sessions"""
    try:
        logger.info(f"📜 Getting practice sessions for user {current_user['id']}")
        
        query = supabase.table('practice_sessions')\
            .select('*')\
            .eq('user_id', current_user['id'])
        
        if status:
            query = query.eq('status', status)
        
        result = query.order('started_at', desc=True).limit(10).execute()
        
        logger.info(f"📜 Found {len(result.data) if result.data else 0} sessions")
        
        return result.data or []
        
    except Exception as e:
        logger.error(f"❌ Get sessions error: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        return []


@router.get("/sessions/{session_id}")
async def get_practice_session(
    session_id: str,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_admin)
):
    """Lấy chi tiết practice session"""
    try:
        result = supabase.table('practice_sessions')\
            .select('*')\
            .eq('id', session_id)\
            .eq('user_id', current_user['id'])\
            .single()\
            .execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Practice session not found"
            )
        
        return result.data
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Get session error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/sessions/{session_id}/questions")
async def get_practice_questions(
    session_id: str,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_admin)
):
    """Lấy câu hỏi trong practice session"""
    try:
        # Get session
        session = supabase.table('practice_sessions')\
            .select('*')\
            .eq('id', session_id)\
            .eq('user_id', current_user['id'])\
            .single()\
            .execute()
        
        if not session.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Practice session not found"
            )
        
        question_ids = session.data['question_ids']
        
        # Get questions from question_bank_items
        questions = []
        for q_id in question_ids:
            q = supabase.table('question_bank_items')\
                .select('*')\
                .eq('id', q_id)\
                .execute()
            
            if q.data:
                questions.append(q.data[0])
        
        return {
            'session_id': session_id,
            'questions': questions,
            'total': len(questions),
            'completed': len(session.data['completed_question_ids'])
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Get practice questions error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
    
@router.post("/sessions/{session_id}/complete-question/{question_id}")
async def mark_question_completed(
    session_id: str,
    question_id: str,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_admin)
):
    """Đánh dấu câu hỏi đã hoàn thành"""
    try:
        logger.info(f"📝 Marking question {question_id} as completed in session {session_id}")
        
        # Get session
        session = supabase.table('practice_sessions')\
            .select('*')\
            .eq('id', session_id)\
            .eq('user_id', current_user['id'])\
            .single()\
            .execute()
        
        if not session.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Practice session not found"
            )
        
        completed_ids = session.data.get('completed_question_ids', []) or []
        
        # Add question_id if not already completed
        if question_id not in completed_ids:
            completed_ids.append(question_id)
            
            # Update session
            update_data = {
                'completed_question_ids': completed_ids
            }
            
            # Check if all questions completed
            total_questions = len(session.data.get('question_ids', []))
            if len(completed_ids) >= total_questions:
                update_data['status'] = 'completed'
                update_data['completed_at'] = datetime.now(timezone.utc).isoformat()
            
            result = supabase.table('practice_sessions')\
                .update(update_data)\
                .eq('id', session_id)\
                .execute()
            
            logger.info(f"✅ Question marked as completed. Progress: {len(completed_ids)}/{total_questions}")
        
        return {
            "message": "Question marked as completed",
            "completed": len(completed_ids),
            "total": len(session.data.get('question_ids', []))
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Mark question completed error: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/sessions/{session_id}/complete")
async def complete_practice_session(
    session_id: str,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_admin)
):
    """Hoàn thành practice session"""
    try:
        result = supabase.table('practice_sessions')\
            .update({
                'status': 'completed',
                'completed_at': datetime.now(timezone.utc).isoformat()
            })\
            .eq('id', session_id)\
            .eq('user_id', current_user['id'])\
            .execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Practice session not found"
            )
        
        return {"message": "Practice session completed"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Complete session error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )