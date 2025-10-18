import pytesseract
from PIL import Image
import io
import logging

logger = logging.getLogger(__name__)

class OCRService:
    def __init__(self):
        pass
    
    def extract_text_from_image(self, image_bytes: bytes, lang: str = 'vie+eng') -> str:
        """
        Trích xuất text từ ảnh sử dụng Tesseract OCR
        
        Args:
            image_bytes: Bytes của ảnh
            lang: Ngôn ngữ (vie = tiếng Việt, eng = tiếng Anh)
        
        Returns:
            str: Text đã trích xuất
        """
        try:
            # Convert bytes to PIL Image
            image = Image.open(io.BytesIO(image_bytes))
            
            # Preprocessing: Convert to grayscale
            image = image.convert('L')
            
            # OCR
            text = pytesseract.image_to_string(image, lang=lang)
            
            logger.info(f"OCR extracted {len(text)} characters")
            return text.strip()
            
        except Exception as e:
            logger.error(f"OCR error: {str(e)}")
            raise Exception(f"Failed to extract text from image: {str(e)}")
    
    def extract_text_from_pdf_images(self, pdf_path: str, lang: str = 'vie+eng') -> str:
        """
        Trích xuất text từ PDF bằng cách convert sang ảnh rồi OCR
        """
        try:
            from pdf2image import convert_from_path
            
            # Convert PDF to images
            images = convert_from_path(pdf_path)
            
            all_text = []
            for i, image in enumerate(images):
                logger.info(f"Processing page {i+1}/{len(images)}")
                
                # Convert PIL Image to bytes
                img_byte_arr = io.BytesIO()
                image.save(img_byte_arr, format='PNG')
                img_byte_arr = img_byte_arr.getvalue()
                
                # OCR
                text = self.extract_text_from_image(img_byte_arr, lang)
                all_text.append(f"--- Page {i+1} ---\n{text}")
            
            return "\n\n".join(all_text)
            
        except Exception as e:
            logger.error(f"PDF OCR error: {str(e)}")
            raise Exception(f"Failed to extract text from PDF: {str(e)}")

# Singleton instance
ocr_service = OCRService()