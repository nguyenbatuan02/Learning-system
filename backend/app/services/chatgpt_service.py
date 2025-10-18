from openai import OpenAI
from app.core.settings import settings
import json
import logging

logger = logging.getLogger(__name__)

class ChatGPTService:
    def __init__(self):
        self.client = OpenAI(api_key=settings.OPENAI_API_KEY)
        self.model = "gpt-5-nano" 
    
    def analyze_questions(self, text: str, language: str = "vi") -> dict:
        """
        Phân tích text và trích xuất câu hỏi trắc nghiệm
        
        Args:
            text: Văn bản chứa câu hỏi (đã OCR)
            language: Ngôn ngữ (vi = tiếng Việt, en = tiếng Anh)
        
        Returns:
            dict: {
                "questions": [
                    {
                        "question_text": "Câu hỏi?",
                        "question_type": "multiple_choice",
                        "options": {"A": "...", "B": "...", "C": "...", "D": "..."},
                        "correct_answer": "A",
                        "explanation": "Giải thích..."
                    }
                ],
                "exam_title": "Tên đề thi",
                "exam_description": "Mô tả"
            }
        """
        
        try:
            logger.info(f"🤖 Analyzing text with ChatGPT ({len(text)} characters)...")
            
            prompt = self._build_analysis_prompt(text, language)
            
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert in analyzing educational content and extracting multiple-choice questions. Always respond with valid JSON only, no additional text."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                response_format={"type": "json_object"}
            )
            
            result_text = response.choices[0].message.content
            logger.info(f"✅ ChatGPT response received")
            
            # Parse JSON
            result = json.loads(result_text)
            
            logger.info(f"📝 Extracted {len(result.get('questions', []))} questions")
            
            return result
            
        except Exception as e:
            logger.error(f"❌ ChatGPT error: {str(e)}")
            raise Exception(f"Failed to analyze questions: {str(e)}")
    
    def _build_analysis_prompt(self, text: str, language: str) -> str:
        """Build prompt for question analysis"""
        
        if language == "vi":
            prompt = f"""
Phân tích văn bản sau và trích xuất TẤT CẢ câu hỏi trắc nghiệm.

VĂN BẢN:
{text}

YÊU CẦU:
1. Tìm và trích xuất TẤT CẢ câu hỏi trắc nghiệm trong văn bản
2. Mỗi câu hỏi cần có:
   - Nội dung câu hỏi đầy đủ
   - Các đáp án A, B, C, D (nếu có)
   - Đáp án đúng
   - Giải thích (nếu có trong văn bản)
3. Nếu văn bản có tiêu đề đề thi, trích xuất ra
4. Tự động sửa lỗi chính tả OCR nếu có

ĐỊNH DẠNG JSON (BẮT BUỘC):
{{
    "exam_title": "Tên đề thi (nếu có)",
    "exam_description": "Mô tả ngắn về đề thi",
    "questions": [
        {{
            "question_text": "Nội dung câu hỏi?",
            "question_type": "multiple_choice",
            "options": {{
                "A": "Đáp án A",
                "B": "Đáp án B",
                "C": "Đáp án C",
                "D": "Đáp án D"
            }},
            "correct_answer": "A",
            "explanation": "Giải thích đáp án đúng"
        }}
    ]
}}

LƯU Ý:
- Nếu không tìm thấy câu hỏi nào, trả về "questions": []
- Nếu câu hỏi chỉ có True/False, dùng "question_type": "true_false" và options: {{"A": "Đúng", "B": "Sai"}}
- Chỉ trả về JSON, không thêm text giải thích
"""
        else:  # English
            prompt = f"""
Analyze the following text and extract ALL multiple-choice questions.

TEXT:
{text}

REQUIREMENTS:
1. Find and extract ALL multiple-choice questions in the text
2. Each question should have:
   - Complete question text
   - Options A, B, C, D (if available)
   - Correct answer
   - Explanation (if provided in text)
3. If there's an exam title, extract it
4. Automatically fix OCR spelling errors if any

JSON FORMAT (REQUIRED):
{{
    "exam_title": "Exam title (if any)",
    "exam_description": "Brief exam description",
    "questions": [
        {{
            "question_text": "Question text?",
            "question_type": "multiple_choice",
            "options": {{
                "A": "Option A",
                "B": "Option B",
                "C": "Option C",
                "D": "Option D"
            }},
            "correct_answer": "A",
            "explanation": "Explanation for correct answer"
        }}
    ]
}}

NOTES:
- If no questions found, return "questions": []
- For True/False questions, use "question_type": "true_false" and options: {{"A": "True", "B": "False"}}
- Return only JSON, no additional text
"""
        
        return prompt
    
    def generate_similar_questions(self, question: str, count: int = 3) -> list:
        """
        Tạo các câu hỏi tương tự
        """
        try:
            logger.info(f"🤖 Generating {count} similar questions...")
            
            prompt = f"""
Dựa trên câu hỏi sau, hãy tạo {count} câu hỏi tương tự (cùng chủ đề, khác nội dung):

CÂU HỎI GỐC:
{question}

YÊU CẦU:
- Tạo {count} câu hỏi mới, khác nhau
- Giữ nguyên độ khó
- Cùng định dạng trắc nghiệm
- Có đáp án đúng rõ ràng

ĐỊNH DẠNG JSON:
{{
    "questions": [
        {{
            "question_text": "Câu hỏi mới?",
            "options": {{"A": "...", "B": "...", "C": "...", "D": "..."}},
            "correct_answer": "A",
            "explanation": "Giải thích"
        }}
    ]
}}
"""
            
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are an expert question generator. Return valid JSON only."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                response_format={"type": "json_object"}
            )
            
            result = json.loads(response.choices[0].message.content)
            return result.get("questions", [])
            
        except Exception as e:
            logger.error(f"❌ Generate questions error: {str(e)}")
            return []
    
    def grade_essay(self, question: str, student_answer: str, correct_answer: str) -> dict:
        """
        Chấm bài tự luận bằng AI
        
        Returns:
            {
                "score": 8.5,  # Điểm (0-10)
                "feedback": "Nhận xét chi tiết...",
                "strengths": ["Điểm mạnh 1", "Điểm mạnh 2"],
                "improvements": ["Cần cải thiện 1", "Cần cải thiện 2"]
            }
        """
        try:
            logger.info(f"🤖 Grading essay answer...")
            
            prompt = f"""
Chấm điểm câu trả lời tự luận sau:

CÂU HỎI:
{question}

ĐÁP ÁN CHUẨN:
{correct_answer}

CÂU TRẢ LỜI CỦA HỌC SINH:
{student_answer}

YÊU CẦU:
1. Chấm điểm từ 0-10
2. Đưa ra nhận xét chi tiết
3. Nêu điểm mạnh
4. Nêu điểm cần cải thiện

ĐỊNH DẠNG JSON:
{{
    "score": 8.5,
    "feedback": "Nhận xét tổng quan về bài làm...",
    "strengths": ["Điểm mạnh 1", "Điểm mạnh 2"],
    "improvements": ["Cần cải thiện 1", "Cần cải thiện 2"]
}}
"""
            
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are an expert teacher. Grade fairly and provide constructive feedback. Return valid JSON only."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.5,
                response_format={"type": "json_object"}
            )
            
            result = json.loads(response.choices[0].message.content)
            logger.info(f"✅ Essay graded: {result['score']}/10")
            return result
            
        except Exception as e:
            logger.error(f"❌ Essay grading error: {str(e)}")
            return {
                "score": 0,
                "feedback": "Không thể chấm điểm",
                "strengths": [],
                "improvements": []
            }

# Singleton instance
chatgpt_service = ChatGPTService()