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
        Phân tích text và trích xuất câu hỏi đa dạng
        """
        try:
            logger.info(f"🤖 Analyzing text with ChatGPT ({len(text)} characters)...")
            
            prompt = self._build_analysis_prompt(text, language)
            
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert in analyzing educational content and extracting various types of questions. Always respond with valid JSON only, no additional text."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                response_format={"type": "json_object"},
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
        """Build prompt for question analysis with multiple question types"""
        
        if language == "vi":
            prompt = f"""
Phân tích văn bản sau và trích xuất TẤT CẢ câu hỏi, hỗ trợ NHIỀU LOẠI câu hỏi khác nhau.

VĂN BẢN:
{text}

YÊU CẦU:
1. Tìm và trích xuất TẤT CẢ câu hỏi trong văn bản
2. Nhận diện ĐÚNG loại câu hỏi:
   - "multiple_choice": Trắc nghiệm 1 đáp án đúng (A, B, C, D)
   - "multiple_answer": Trắc nghiệm NHIỀU đáp án đúng
   - "true_false": Đúng/Sai
   - "short_answer": Câu hỏi ngắn/Tự luận
   - "fill_blank": Điền từ vào chỗ trống
   - "ordering": Sắp xếp thứ tự
3. Mỗi câu hỏi cần có:
   - Nội dung câu hỏi đầy đủ
   - Loại câu hỏi chính xác
   - Các đáp án (nếu có)
   - Đáp án đúng (có thể là 1 đáp án hoặc nhiều đáp án)
   - Giải thích (nếu có)
4. Tự động sửa lỗi chính tả OCR

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
        }},
        {{
            "question_text": "Câu hỏi nhiều đáp án đúng?",
            "question_type": "multiple_answer",
            "options": {{
                "A": "Đáp án A",
                "B": "Đáp án B",
                "C": "Đáp án C",
                "D": "Đáp án D"
            }},
            "correct_answer": ["A", "C"],
            "explanation": "Cả A và C đều đúng"
        }},
        {{
            "question_text": "Câu hỏi đúng sai?",
            "question_type": "true_false",
            "options": {{
                "A": "Đúng",
                "B": "Sai"
            }},
            "correct_answer": "A",
            "explanation": "Giải thích"
        }},
        {{
            "question_text": "Câu hỏi tự luận?",
            "question_type": "short_answer",
            "options": null,
            "correct_answer": "Đáp án mẫu chi tiết...",
            "explanation": "Hướng dẫn chấm điểm"
        }},
        {{
            "question_text": "Điền vào chỗ trống: Thủ đô của Việt Nam là ___",
            "question_type": "fill_blank",
            "options": null,
            "correct_answer": "Hà Nội",
            "explanation": "Giải thích"
        }},
        {{
            "question_text": "Sắp xếp các bước sau theo đúng thứ tự:",
            "question_type": "ordering",
            "options": {{
                "A": "Bước 1",
                "B": "Bước 2",
                "C": "Bước 3"
            }},
            "correct_answer": ["C", "A", "B"],
            "explanation": "Thứ tự đúng là: Bước 3 → Bước 1 → Bước 2"
        }}
    ]
}}

LƯU Ý QUAN TRỌNG:
- Nhận diện CHÍNH XÁC loại câu hỏi dựa trên nội dung
- Nếu câu hỏi có nhiều đáp án đúng → dùng "multiple_answer" với correct_answer là array
- Nếu câu hỏi yêu cầu sắp xếp → dùng "ordering" với correct_answer là array thứ tự đúng
- Nếu câu hỏi tự luận/ngắn → dùng "short_answer" với options = null
- Nếu không tìm thấy câu hỏi → trả về "questions": []
- Chỉ trả về JSON, KHÔNG thêm text giải thích
"""
        else:  # English
            prompt = f"""
Analyze the following text and extract ALL questions, supporting MULTIPLE question types.

TEXT:
{text}

REQUIREMENTS:
1. Find and extract ALL questions in the text
2. Correctly identify question type:
   - "multiple_choice": Single correct answer (A, B, C, D)
   - "multiple_answer": Multiple correct answers
   - "true_false": True/False
   - "short_answer": Short answer/Essay
   - "fill_blank": Fill in the blank
   - "ordering": Arrange in order
3. Each question should have:
   - Complete question text
   - Correct question type
   - Options (if applicable)
   - Correct answer (single or multiple)
   - Explanation (if available)
4. Automatically fix OCR spelling errors

JSON FORMAT (REQUIRED):
{{
    "exam_title": "Exam title (if any)",
    "exam_description": "Brief description",
    "questions": [
        {{
            "question_text": "Question text?",
            "question_type": "multiple_choice",
            "options": {{"A": "...", "B": "...", "C": "...", "D": "..."}},
            "correct_answer": "A",
            "explanation": "Explanation"
        }},
        {{
            "question_text": "Multiple answer question?",
            "question_type": "multiple_answer",
            "options": {{"A": "...", "B": "...", "C": "...", "D": "..."}},
            "correct_answer": ["A", "C"],
            "explanation": "Both A and C are correct"
        }},
        {{
            "question_text": "Essay question?",
            "question_type": "short_answer",
            "options": null,
            "correct_answer": "Sample answer...",
            "explanation": "Grading rubric"
        }}
    ]
}}

IMPORTANT NOTES:
- Correctly identify question type based on content
- For multiple correct answers → use "multiple_answer" with array correct_answer
- For ordering questions → use "ordering" with correct order array
- For essay/short answer → use "short_answer" with options = null
- If no questions found → return "questions": []
- Return ONLY JSON, no additional text
"""
        
        return prompt
    
    # Các method khác giữ nguyên...
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