from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class FileUploadResponse(BaseModel):
    id: str
    file_name: str
    file_path: str
    file_type: str
    file_size: int
    processing_status: str
    created_at: datetime

class FileProcessResponse(BaseModel):
    id: str
    file_name: str
    extracted_text: str
    processing_status: str
    
class TextEditRequest(BaseModel):
    file_id: str
    edited_text: str