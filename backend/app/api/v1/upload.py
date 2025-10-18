from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from supabase import Client
from app.core.supabase import get_supabase, get_supabase_admin
from app.api.deps import get_current_user
from app.models.upload import FileUploadResponse, FileProcessResponse, TextEditRequest
from app.services.ocr_service import ocr_service
from app.services.file_service import file_service
import uuid
import os
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

# Allowed file types
ALLOWED_EXTENSIONS = {'.png', '.jpg', '.jpeg', '.pdf', '.doc', '.docx'}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

def validate_file(filename: str, file_size: int):
    """Validate file extension and size"""
    ext = os.path.splitext(filename)[1].lower()
    
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type not allowed. Allowed types: {', '.join(ALLOWED_EXTENSIONS)}"
        )
    
    if file_size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File too large. Maximum size: {MAX_FILE_SIZE / 1024 / 1024}MB"
        )

@router.post("/", response_model=FileUploadResponse)
async def upload_file(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_admin)
):
    """
    Upload file lên Supabase Storage
    """
    try:
        # Read file
        file_bytes = await file.read()
        file_size = len(file_bytes)
        
        # Validate
        validate_file(file.filename, file_size)
        
        # Generate unique filename
        file_ext = os.path.splitext(file.filename)[1]
        unique_filename = f"{uuid.uuid4()}{file_ext}"
        storage_path = f"{current_user['id']}/{unique_filename}"
        
        logger.info(f"Uploading file: {file.filename} ({file_size} bytes)")
        
        # Upload to Supabase Storage
        supabase.storage.from_("exam-files").upload(
            storage_path,
            file_bytes,
            {
                "content-type": file.content_type,
                "x-upsert": "true"
            }
        )
        
        # Get public URL
        public_url = supabase.storage.from_("exam-files").get_public_url(storage_path)
        
        # Save metadata to database
        file_record = {
            "user_id": current_user["id"],
            "file_name": file.filename,
            "file_path": storage_path,
            "file_type": file_service.detect_file_type(file.filename),
            "file_size": file_size,
            "processing_status": "pending"
        }
        
        response = supabase.table("uploaded_files").insert(file_record).execute()
        
        logger.info(f"File uploaded successfully: {response.data[0]['id']}")
        
        return FileUploadResponse(**response.data[0])
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Upload error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload file: {str(e)}"
        )

@router.post("/process/{file_id}", response_model=FileProcessResponse)
async def process_file(
    file_id: str,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_admin)
):
    """
    Xử lý file: OCR hoặc extract text
    """
    try:
        # Get file record
        file_record = supabase.table("uploaded_files")\
            .select("*")\
            .eq("id", file_id)\
            .eq("user_id", current_user["id"])\
            .single()\
            .execute()
        
        if not file_record.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="File not found"
            )
        
        file_data = file_record.data
        
        # Update status to processing
        supabase.table("uploaded_files")\
            .update({"processing_status": "processing"})\
            .eq("id", file_id)\
            .execute()
        
        logger.info(f"Processing file: {file_data['file_name']} (type: {file_data['file_type']})")
        
        # Download file from storage
        file_bytes = supabase.storage.from_("exam-files").download(file_data["file_path"])
        
        # Process based on file type
        extracted_text = ""
        
        if file_data["file_type"] == "image":
            # OCR for images
            extracted_text = ocr_service.extract_text_from_image(file_bytes)
            
        elif file_data["file_type"] == "pdf":
            # Try text extraction first
            extracted_text = file_service.extract_text_from_pdf(file_bytes)
            
            # If no text, it's a scanned PDF - use OCR
            if not extracted_text.strip():
                logger.info("PDF is scanned, using OCR...")
                # Save temp file for pdf2image
                import tempfile
                with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp:
                    tmp.write(file_bytes)
                    tmp_path = tmp.name
                
                try:
                    extracted_text = ocr_service.extract_text_from_pdf_images(tmp_path)
                finally:
                    os.unlink(tmp_path)
        
        elif file_data["file_type"] == "docx":
            # Extract text from Word
            extracted_text = file_service.extract_text_from_docx(file_bytes)
        
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Unsupported file type"
            )
        
        # Update database with extracted text
        supabase.table("uploaded_files")\
            .update({
                "extracted_text": extracted_text,
                "processing_status": "completed"
            })\
            .eq("id", file_id)\
            .execute()
        
        logger.info(f"Processing completed. Extracted {len(extracted_text)} characters")
        
        return FileProcessResponse(
            id=file_id,
            file_name=file_data["file_name"],
            extracted_text=extracted_text,
            processing_status="completed"
        )
        
    except HTTPException:
        # Update status to failed
        supabase.table("uploaded_files")\
            .update({"processing_status": "failed"})\
            .eq("id", file_id)\
            .execute()
        raise
    except Exception as e:
        logger.error(f"Processing error: {str(e)}")
        # Update status to failed
        supabase.table("uploaded_files")\
            .update({"processing_status": "failed"})\
            .eq("id", file_id)\
            .execute()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process file: {str(e)}"
        )

@router.put("/edit-text", response_model=FileProcessResponse)
async def edit_extracted_text(
    data: TextEditRequest,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_admin)
):
    """
    Chỉnh sửa text sau khi OCR
    """
    try:
        # Update extracted text
        response = supabase.table("uploaded_files")\
            .update({"extracted_text": data.edited_text})\
            .eq("id", data.file_id)\
            .eq("user_id", current_user["id"])\
            .execute()
        
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="File not found"
            )
        
        file_data = response.data[0]
        
        return FileProcessResponse(
            id=file_data["id"],
            file_name=file_data["file_name"],
            extracted_text=file_data["extracted_text"],
            processing_status=file_data["processing_status"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Edit text error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to edit text: {str(e)}"
        )

@router.get("/my-files")
async def get_my_uploaded_files(
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_admin)
):
    """
    Lấy danh sách file đã upload của user
    """
    try:
        response = supabase.table("uploaded_files")\
            .select("*")\
            .eq("user_id", current_user["id"])\
            .order("created_at", desc=True)\
            .execute()
        
        return response.data
        
    except Exception as e:
        logger.error(f"Get files error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get files: {str(e)}"
        )

@router.delete("/{file_id}")
async def delete_file(
    file_id: str,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_admin)
):
    """
    Xóa file
    """
    try:
        # Get file record
        file_record = supabase.table("uploaded_files")\
            .select("*")\
            .eq("id", file_id)\
            .eq("user_id", current_user["id"])\
            .single()\
            .execute()
        
        if not file_record.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="File not found"
            )
        
        # Delete from storage
        supabase.storage.from_("exam-files").remove([file_record.data["file_path"]])
        
        # Delete from database
        supabase.table("uploaded_files").delete().eq("id", file_id).execute()
        
        return {"message": "File deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Delete file error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete file: {str(e)}"
        )