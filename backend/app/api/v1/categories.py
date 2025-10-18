from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
from app.models.question_bank import CategoryCreate, CategoryResponse
from app.api.deps import get_current_user, get_current_admin
from supabase import Client
from app.core.supabase import get_supabase

router = APIRouter()


@router.get("/", response_model=List[CategoryResponse])
async def get_categories(
    parent_id: Optional[str] = None,
    supabase: Client = Depends(get_supabase)
):
    """Lấy danh sách categories (Public)"""
    try:
        query = supabase.table('categories').select('*')
        
        if parent_id:
            query = query.eq('parent_id', parent_id)
        else:
            query = query.is_('parent_id', 'null')  # Root categories
        
        result = query.order('name').execute()
        return result.data
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{category_id}", response_model=CategoryResponse)
async def get_category(
    category_id: str,
    supabase: Client = Depends(get_supabase)
):
    """Lấy chi tiết category"""
    try:
        result = supabase.table('categories').select('*').eq('id', category_id).execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Category not found")
        return result.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{category_id}/children", response_model=List[CategoryResponse])
async def get_child_categories(
    category_id: str,
    supabase: Client = Depends(get_supabase)
):
    """Lấy subcategories"""
    try:
        result = supabase.table('categories').select('*').eq('parent_id', category_id).order('name').execute()
        return result.data
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/", response_model=CategoryResponse)
async def create_category(
    data: CategoryCreate,
    current_user: dict = Depends(get_current_admin),
    supabase: Client = Depends(get_supabase)
):
    """Tạo category mới (Admin only)"""
    try:
        result = supabase.table('categories').insert(data.dict()).execute()
        return result.data[0]
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/{category_id}", response_model=CategoryResponse)
async def update_category(
    category_id: str,
    data: CategoryCreate,
    current_user: dict = Depends(get_current_admin),
    supabase: Client = Depends(get_supabase)
):
    """Cập nhật category (Admin only)"""
    try:
        result = supabase.table('categories').update(data.dict(exclude_unset=True)).eq('id', category_id).execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Category not found")
        return result.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/{category_id}")
async def delete_category(
    category_id: str,
    current_user: dict = Depends(get_current_admin),
    supabase: Client = Depends(get_supabase)
):
    """Xóa category (Admin only)"""
    try:
        # Check if category has children
        children = supabase.table('categories').select('id').eq('parent_id', category_id).execute()
        if children.data:
            raise HTTPException(status_code=400, detail="Cannot delete category with children")
        
        # Check if category is used
        questions = supabase.table('question_bank_items').select('id').eq('category_id', category_id).limit(1).execute()
        if questions.data:
            raise HTTPException(status_code=400, detail="Cannot delete category in use")
        
        supabase.table('categories').delete().eq('id', category_id).execute()
        return {"message": "Category deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))