from PyPDF2 import PdfReader
from docx import Document
import io
import logging

logger = logging.getLogger(__name__)

class FileProcessingService:
    
    def extract_text_from_pdf(self, pdf_bytes: bytes) -> str:
        """
        Trích xuất text từ PDF (text-based PDF)
        """
        try:
            pdf_reader = PdfReader(io.BytesIO(pdf_bytes))
            
            all_text = []
            for i, page in enumerate(pdf_reader.pages):
                text = page.extract_text()
                if text.strip():
                    all_text.append(f"--- Page {i+1} ---\n{text}")
            
            result = "\n\n".join(all_text)
            
            # Nếu không extract được text → PDF là ảnh scan
            if not result.strip():
                logger.warning("PDF contains no text, may need OCR")
                return ""
            
            logger.info(f"Extracted {len(result)} characters from PDF")
            return result
            
        except Exception as e:
            logger.error(f"PDF extraction error: {str(e)}")
            raise Exception(f"Failed to extract text from PDF: {str(e)}")
    
    def extract_text_from_docx(self, docx_bytes: bytes) -> str:
        """
        Trích xuất text từ Word document
        """
        try:
            doc = Document(io.BytesIO(docx_bytes))
            
            all_text = []
            for para in doc.paragraphs:
                if para.text.strip():
                    all_text.append(para.text)
            
            result = "\n".join(all_text)
            logger.info(f"Extracted {len(result)} characters from DOCX")
            return result
            
        except Exception as e:
            logger.error(f"DOCX extraction error: {str(e)}")
            raise Exception(f"Failed to extract text from DOCX: {str(e)}")
    
    def detect_file_type(self, filename: str) -> str:
        """
        Phát hiện loại file từ extension
        """
        filename_lower = filename.lower()
        
        if filename_lower.endswith(('.png', '.jpg', '.jpeg', '.bmp', '.tiff')):
            return 'image'
        elif filename_lower.endswith('.pdf'):
            return 'pdf'
        elif filename_lower.endswith(('.doc', '.docx')):
            return 'docx'
        else:
            return 'unknown'

# Singleton instance
file_service = FileProcessingService()