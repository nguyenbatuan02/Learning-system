from PIL import Image
import io
import base64
from openai import OpenAI
import logging
from app.core.settings import settings

logger = logging.getLogger(__name__)

class OCRService:
    def __init__(self):
        self.client = OpenAI(api_key=settings.OPENAI_API_KEY)
        self.model = "gpt-4o-mini"
    
    def extract_text_from_image(self, image_bytes: bytes, lang: str = 'vie+eng') -> str:
        """
        Trích xuất text từ ảnh sử dụng GPT-4 Vision
        
        Args:
            image_bytes: Bytes của ảnh
            lang: Ngôn ngữ (vie = tiếng Việt, eng = tiếng Anh)
        Returns:
            str: Text đã trích xuất
        """
        try:
            # Convert bytes to PIL Image
            base64_image = base64.b64encode(image_bytes).decode('utf-8')
            prompt = f"Extract all text from the image. The text may be in {lang}."
            
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": prompt
                            },
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/jpeg;base64,{base64_image}",
                                    "detail": "high" 
                                }
                            }
                        ]
                    }
                ],
                max_tokens=4096,
            )
            
            extracted_text = response.choices[0].message.content.strip()
            
            logger.info(f"GPT Vision extracted {len(extracted_text)} characters")
            logger.info(f"Tokens used: {response.usage.total_tokens}")
            
            return extracted_text
            
        except Exception as e:
            logger.error(f"GPT Vision OCR error: {str(e)}")
            raise Exception(f"Failed to extract text using GPT Vision: {str(e)}")
    
    
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