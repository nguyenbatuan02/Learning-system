from app.services.chatgpt_service import chatgpt_service
import logging
import json

logger = logging.getLogger(__name__)

class GradingService:
    def grade_multiple_choice(self, user_answer: str, correct_answer: str) -> tuple:
        """
        Chấm trắc nghiệm
        Returns:
            (is_correct: bool, feedback: str)
        """
        is_correct = user_answer.strip().upper() == correct_answer.strip().upper()
        feedback = "Đúng!" if is_correct else f"Sai. Đáp án đúng là {correct_answer}"
        return is_correct, feedback
    
    def grade_multiple_answer(self, user_answer, correct_answer) -> tuple:
        """
        Chấm câu hỏi nhiều đáp án đúng
        user_answer và correct_answer có thể là list hoặc string JSON
        Returns:
            (is_correct: bool, feedback: str)
        """
        try:
            # Parse user_answer if it's a string
            if isinstance(user_answer, str):
                try:
                    user_answer = json.loads(user_answer)
                except:
                    # If not JSON, split by comma
                    user_answer = [x.strip().upper() for x in user_answer.split(',')]
            
            # Parse correct_answer if it's a string
            if isinstance(correct_answer, str):
                try:
                    correct_answer = json.loads(correct_answer)
                except:
                    correct_answer = [x.strip().upper() for x in correct_answer.split(',')]
            
            # Normalize to sets for comparison
            user_set = set([str(x).strip().upper() for x in user_answer]) if user_answer else set()
            correct_set = set([str(x).strip().upper() for x in correct_answer]) if correct_answer else set()
            
            is_correct = user_set == correct_set
            
            if is_correct:
                feedback = "Đúng! Bạn đã chọn tất cả đáp án đúng."
            else:
                missing = correct_set - user_set
                extra = user_set - correct_set
                
                feedback_parts = []
                if missing:
                    feedback_parts.append(f"Thiếu: {', '.join(sorted(missing))}")
                if extra:
                    feedback_parts.append(f"Thừa: {', '.join(sorted(extra))}")
                
                feedback = f"Sai. {' | '.join(feedback_parts)}. Đáp án đúng: {', '.join(sorted(correct_set))}"
            
            return is_correct, feedback
            
        except Exception as e:
            logger.error(f"Multiple answer grading error: {str(e)}")
            return False, "Lỗi khi chấm điểm"
    
    def grade_true_false(self, user_answer: str, correct_answer: str) -> tuple:
        """
        Chấm đúng/sai
        """
        return self.grade_multiple_choice(user_answer, correct_answer)
    
    def grade_fill_blank(self, user_answer, correct_answer) -> tuple:
        """
        Chấm điền vào chỗ trống
        Có thể có nhiều chỗ trống, user_answer và correct_answer có thể là list
        Returns:
            (score: float 0-1, feedback: str)
        """
        try:
            # Parse answers if they're strings
            if isinstance(user_answer, str):
                try:
                    user_answer = json.loads(user_answer)
                except:
                    # Single blank
                    user_answer = [user_answer.strip()]
            
            if isinstance(correct_answer, str):
                try:
                    correct_answer = json.loads(correct_answer)
                except:
                    correct_answer = [correct_answer.strip()]
            
            # Ensure both are lists
            if not isinstance(user_answer, list):
                user_answer = [str(user_answer)]
            if not isinstance(correct_answer, list):
                correct_answer = [str(correct_answer)]
            
            # Calculate score
            total_blanks = len(correct_answer)
            correct_count = 0
            feedback_parts = []
            
            for i, (user_ans, correct_ans) in enumerate(zip(user_answer, correct_answer)):
                user_normalized = str(user_ans).strip().lower()
                correct_normalized = str(correct_ans).strip().lower()
                
                if user_normalized == correct_normalized:
                    correct_count += 1
                    feedback_parts.append(f"Chỗ trống {i+1}: ✓")
                else:
                    feedback_parts.append(f"Chỗ trống {i+1}: ✗ (Đúng: {correct_ans})")
            
            score = correct_count / total_blanks if total_blanks > 0 else 0
            feedback = f"{correct_count}/{total_blanks} đúng. " + " | ".join(feedback_parts)
            
            return score, feedback
            
        except Exception as e:
            logger.error(f"Fill blank grading error: {str(e)}")
            return 0.0, "Lỗi khi chấm điểm"
    
    def grade_ordering(self, user_answer, correct_answer) -> tuple:
        """
        Chấm câu hỏi sắp xếp thứ tự
        user_answer và correct_answer là list các items theo thứ tự
        Returns:
            (score: float 0-1, feedback: str)
        """
        try:
            # Parse answers if they're strings
            if isinstance(user_answer, str):
                user_answer = json.loads(user_answer)
            if isinstance(correct_answer, str):
                correct_answer = json.loads(correct_answer)
            
            # Ensure both are lists
            if not isinstance(user_answer, list):
                user_answer = [user_answer]
            if not isinstance(correct_answer, list):
                correct_answer = [correct_answer]
            
            # Check if order matches exactly
            if user_answer == correct_answer:
                return 1.0, "Đúng! Thứ tự hoàn toàn chính xác."
            
            # Calculate partial score based on correct positions
            correct_positions = sum(1 for i, (u, c) in enumerate(zip(user_answer, correct_answer)) if u == c)
            total_items = len(correct_answer)
            score = correct_positions / total_items if total_items > 0 else 0
            
            feedback = f"Sai. {correct_positions}/{total_items} vị trí đúng. Thứ tự đúng: {' → '.join(map(str, correct_answer))}"
            
            return score, feedback
            
        except Exception as e:
            logger.error(f"Ordering grading error: {str(e)}")
            return 0.0, "Lỗi khi chấm điểm"
    
    def grade_short_answer(self, question: str, user_answer: str, correct_answer: str) -> tuple:
        """
        Chấm câu trả lời ngắn bằng AI
        Returns:
            (score: float 0-1, feedback: str)
        """
        try:
            result = chatgpt_service.grade_essay(question, user_answer, correct_answer)
            # Normalize score to 0-1
            normalized_score = result["score"] / 10.0
            feedback = result["feedback"]
            return normalized_score, feedback
        except Exception as e:
            logger.error(f"AI grading error: {str(e)}")
            # Fallback: simple string matching
            is_match = user_answer.strip().lower() == correct_answer.strip().lower()
            return (1.0 if is_match else 0.0), "Auto-graded (AI unavailable)"
    
    def grade_essay(self, question: str, user_answer: str, correct_answer: str) -> tuple:
        """
        Chấm tự luận bằng AI
        """
        return self.grade_short_answer(question, user_answer, correct_answer)
    
    def grade_answer(self, question_type: str, question_text: str,
                    user_answer, correct_answer, marks: float) -> tuple:
        """
        Chấm điểm một câu trả lời
        Args:
            question_type: Loại câu hỏi
            question_text: Nội dung câu hỏi
            user_answer: Câu trả lời của user (có thể là str, list, dict)
            correct_answer: Đáp án đúng (có thể là str, list, dict)
            marks: Điểm tối đa của câu hỏi
        
        Returns:
            (is_correct: bool, marks_obtained: float, feedback: str)
        """
        try:
            marks = float(marks)
            
            # Convert to string for consistent handling if needed
            user_answer_str = user_answer if isinstance(user_answer, str) else str(user_answer)
            correct_answer_str = correct_answer if isinstance(correct_answer, str) else str(correct_answer)
            
            if question_type == "multiple_choice":
                is_correct, feedback = self.grade_multiple_choice(user_answer_str, correct_answer_str)
                marks_obtained = marks if is_correct else 0
                
            elif question_type == "multiple_answer":
                is_correct, feedback = self.grade_multiple_answer(user_answer, correct_answer)
                marks_obtained = marks if is_correct else 0
                
            elif question_type == "true_false":
                is_correct, feedback = self.grade_true_false(user_answer_str, correct_answer_str)
                marks_obtained = marks if is_correct else 0
                
            elif question_type == "fill_blank":
                score, feedback = self.grade_fill_blank(user_answer, correct_answer)
                is_correct = score >= 0.5
                marks_obtained = marks * score
                
            elif question_type == "ordering":
                score, feedback = self.grade_ordering(user_answer, correct_answer)
                is_correct = score >= 0.8  # Require 80% correct positions
                marks_obtained = marks * score
                
            elif question_type == "short_answer":
                score, feedback = self.grade_short_answer(question_text, user_answer_str, correct_answer_str)
                is_correct = score >= 0.5
                marks_obtained = marks * score
                
            elif question_type == "essay":
                score, feedback = self.grade_essay(question_text, user_answer_str, correct_answer_str)
                is_correct = score >= 0.5
                marks_obtained = marks * score
                
            else:
                is_correct = False
                marks_obtained = 0
                feedback = f"Loại câu hỏi không được hỗ trợ: {question_type}"
            
            return is_correct, marks_obtained, feedback
            
        except Exception as e:
            logger.error(f"Grading error for question type {question_type}: {str(e)}")
            return False, 0, f"Lỗi khi chấm điểm: {str(e)}"

# Singleton
grading_service = GradingService()