from app.services.chatgpt_service import chatgpt_service
import logging

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
    
    def grade_true_false(self, user_answer: str, correct_answer: str) -> tuple:
        """
        Chấm đúng/sai
        """
        return self.grade_multiple_choice(user_answer, correct_answer)
    
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
            return (1.0 if is_match else 0.0), "Auto-graded"
    
    def grade_essay(self, question: str, user_answer: str, correct_answer: str) -> tuple:
        """
        Chấm tự luận bằng AI
        """
        return self.grade_short_answer(question, user_answer, correct_answer)
    
    def grade_answer(self, question_type: str, question_text: str, 
                     user_answer: str, correct_answer: str, marks: int) -> tuple:
        """
        Chấm điểm một câu trả lời
        
        Returns:
            (is_correct: bool, marks_obtained: float, feedback: str)
        """
        if question_type == "multiple_choice":
            is_correct, feedback = self.grade_multiple_choice(user_answer, correct_answer)
            marks_obtained = marks if is_correct else 0
            
        elif question_type == "true_false":
            is_correct, feedback = self.grade_true_false(user_answer, correct_answer)
            marks_obtained = marks if is_correct else 0
            
        elif question_type == "short_answer":
            score, feedback = self.grade_short_answer(question_text, user_answer, correct_answer)
            is_correct = score >= 0.5
            marks_obtained = marks * score
            
        elif question_type == "essay":
            score, feedback = self.grade_essay(question_text, user_answer, correct_answer)
            is_correct = score >= 0.5
            marks_obtained = marks * score
            
        else:
            is_correct = False
            marks_obtained = 0
            feedback = "Unknown question type"
        
        return is_correct, marks_obtained, feedback

# Singleton
grading_service = GradingService()