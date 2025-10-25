import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  XCircle,
  BookOpen,
  Lightbulb,
  Home,
  AlertCircle
} from 'lucide-react';
import { practiceService } from '../services/practiceService';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import Loading from '../components/common/Loading';
import Alert from '../components/common/Alert';
import toast from 'react-hot-toast';

const PracticeSession = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();

  const [session, setSession] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [showAnswer, setShowAnswer] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSession();
  }, [sessionId]);

  const loadSession = async () => {
    try {
      setLoading(true);
      const [sessionData, questionsData] = await Promise.all([
        practiceService.getSession(sessionId),
        practiceService.getQuestions(sessionId),
      ]);
      
      console.log('📚 Session:', sessionData);
      console.log('📝 Questions:', questionsData);
      
      setSession(sessionData);
      setQuestions(questionsData.questions || []);

      // Find first incomplete question
      const completedIds = sessionData.completed_question_ids || [];
      const firstIncomplete = (questionsData.questions || []).findIndex(
        q => !completedIds.includes(q.id)
      );
      if (firstIncomplete !== -1) {
        setCurrentQuestionIndex(firstIncomplete);
      }
    } catch (error) {
      console.error('Failed to load session:', error);
      toast.error('Không thể tải bài ôn luyện');
      navigate('/practice');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (questionId, answer) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer,
    }));
  };

  const handleCheckAnswer = async (questionId) => {
    const currentQuestion = questions.find(q => q.id === questionId);
    const userAnswer = answers[questionId];

    if (!userAnswer || (Array.isArray(userAnswer) && userAnswer.length === 0)) {
      toast.error('Vui lòng chọn câu trả lời');
      return;
    }

    // Mark question as completed
    try {
      await practiceService.completeQuestion(sessionId, questionId);
      
      // Show answer
      setShowAnswer(prev => ({
        ...prev,
        [questionId]: true,
      }));

      // Check if all questions completed
      const completedCount = Object.keys(showAnswer).length + 1;
      if (completedCount === questions.length) {
        await practiceService.completeSession(sessionId);
        toast.success('🎉 Bạn đã hoàn thành bài ôn luyện!');
      } else {
        toast.success('✓ Đã kiểm tra đáp án');
      }
    } catch (error) {
      console.error('Failed to mark question:', error);
      toast.error('Không thể lưu kết quả');
    }
  };

  const goToQuestion = (index) => {
    setCurrentQuestionIndex(index);
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      goToQuestion(currentQuestionIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      goToQuestion(currentQuestionIndex + 1);
    } else {
      // Last question, complete session
      navigate('/practice');
    }
  };

  const isQuestionCompleted = (questionId) => {
    return showAnswer[questionId] === true;
  };

  const isAnswerCorrect = (question, userAnswer) => {
  if (!userAnswer) return false;
  
  const questionType = question.question_type;
  const correctAnswer = question.correct_answer;

  // Helper function to safely parse JSON
  const safeJSONParse = (value) => {
    if (Array.isArray(value)) return value;
    if (typeof value !== 'string') return value;
    
    try {
      return JSON.parse(value);
    } catch {
      return value; // Return as-is if not valid JSON
    }
  };

  switch (questionType) {
    case 'multiple_choice':
    case 'true_false':
      return String(userAnswer).trim().toUpperCase() === 
             String(correctAnswer).trim().toUpperCase();
    
    case 'multiple_answer':
      if (!Array.isArray(userAnswer)) return false;
      
      const userSet = new Set(userAnswer.map(a => String(a).trim().toUpperCase()));
      const correctArray = safeJSONParse(correctAnswer);
      const correctSet = new Set(
        (Array.isArray(correctArray) ? correctArray : [correctArray])
          .map(a => String(a).trim().toUpperCase())
      );
      
      return userSet.size === correctSet.size && 
             [...userSet].every(a => correctSet.has(a));
    
    case 'fill_blank':
      const userBlanks = Array.isArray(userAnswer) ? userAnswer : [userAnswer];
      const correctBlanks = safeJSONParse(correctAnswer);
      const correctArray2 = Array.isArray(correctBlanks) ? correctBlanks : [correctBlanks];
      
      if (userBlanks.length !== correctArray2.length) return false;
      
      return userBlanks.every((ans, idx) => 
        String(ans).trim().toLowerCase() === String(correctArray2[idx]).trim().toLowerCase()
      );
    
    case 'ordering':
      const userOrder = Array.isArray(userAnswer) ? userAnswer : safeJSONParse(userAnswer);
      const correctOrder = safeJSONParse(correctAnswer);
      
      const userArray = Array.isArray(userOrder) ? userOrder : [userOrder];
      const correctArray3 = Array.isArray(correctOrder) ? correctOrder : [correctOrder];
      
      if (userArray.length !== correctArray3.length) return false;
      
      return userArray.every((item, idx) => 
        String(item).trim() === String(correctArray3[idx]).trim()
      );
    
    case 'short_answer':
      return String(userAnswer).trim().toLowerCase() === 
             String(correctAnswer).trim().toLowerCase();
    
    case 'essay':
      // For essay, we can't auto-check, so return null (will show as "needs review")
      return null;
    
    default:
      return false;
  }
};

  const getCompletedCount = () => {
    return Object.keys(showAnswer).length;
  };

  if (loading) {
    return <Loading fullScreen text="Đang tải bài ôn luyện..." />;
  }

  if (!session || questions.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Alert type="error">
          <div className="flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <div>
              <strong>Không tìm thấy bài ôn luyện</strong>
              <p className="mt-1">Bài ôn luyện không tồn tại hoặc không có câu hỏi nào.</p>
            </div>
          </div>
        </Alert>
        <Button onClick={() => navigate('/practice')} className="mt-4">
          ← Về trang ôn luyện
        </Button>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const currentAnswer = answers[currentQuestion?.id];
  const isCompleted = isQuestionCompleted(currentQuestion?.id);
  const isCorrect = isCompleted && isAnswerCorrect(currentQuestion, currentAnswer);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link
                to="/practice"
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  {session.session_type === 'wrong_answers' ? '❌ Ôn lại câu sai' :
                   session.session_type === 'weak_topics' ? '🎯 Luyện điểm yếu' :
                   '⚙️ Ôn luyện tùy chỉnh'}
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  Câu {currentQuestionIndex + 1}/{questions.length}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Badge variant="info" size="lg">
                ⏱️ Không giới hạn thời gian
              </Badge>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
              <span>Tiến độ: {getCompletedCount()}/{questions.length}</span>
              <span>{Math.round((getCompletedCount() / questions.length) * 100)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(getCompletedCount() / questions.length) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Question Content */}
          <div className="lg:col-span-3">
            {/* Info Banner */}
            <Alert type="info" className="mb-6">
              <div className="flex items-start space-x-3">
                <Lightbulb className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <div>
                  <strong>💡 Chế độ ôn luyện:</strong> Bạn có thể xem đáp án ngay sau khi trả lời. 
                  Không tính điểm, tập trung vào việc học!
                </div>
              </div>
            </Alert>

            <Card>
              {/* Question Header */}
              <div className="mb-6">
                <div className="flex items-center flex-wrap gap-3 mb-3">
                  <span className="text-sm font-medium text-gray-500">
                    Câu {currentQuestionIndex + 1}
                  </span>
                  {isCompleted && (
                    <Badge variant={
                      isCorrect === null ? 'warning' :
                      isCorrect ? 'success' : 'danger'
                    }>
                      {isCorrect === null ? '⚠️ Cần xem lại' :
                       isCorrect ? '✓ Đúng' : '✗ Sai'}
                    </Badge>
                  )}
                  <Badge variant="outline">
                    {getQuestionTypeLabel(currentQuestion?.question_type)}
                  </Badge>
                </div>
                <h3 className="text-lg font-medium text-gray-900">
                  {currentQuestion?.question_text}
                </h3>
              </div>

              {/* Question Content */}
              <div className="mb-6">
                <QuestionContent
                  question={currentQuestion}
                  answer={currentAnswer}
                  onAnswerChange={(answer) => handleAnswerChange(currentQuestion.id, answer)}
                  disabled={isCompleted}
                  showCorrect={isCompleted}
                />
              </div>

              {/* Check Answer Button */}
              {!isCompleted && (
                <div className="mb-6">
                  <Button
                    onClick={() => handleCheckAnswer(currentQuestion.id)}
                    className="w-full"
                    size="lg"
                    disabled={!currentAnswer || (Array.isArray(currentAnswer) && currentAnswer.length === 0)}
                  >
                    ✓ Kiểm tra đáp án
                  </Button>
                </div>
              )}

              {/* Answer Feedback */}
              {isCompleted && (
                <div className="mb-6">
                  {isCorrect === null ? (
                    <Alert type="warning">
                      <div className="flex items-start space-x-3">
                        <AlertCircle className="h-6 w-6 flex-shrink-0" />
                        <div>
                          <strong>Câu trả lời của bạn đã được lưu</strong>
                          <p className="mt-1 text-sm">
                            Câu hỏi dạng tự luận cần được giáo viên đánh giá.
                          </p>
                        </div>
                      </div>
                    </Alert>
                  ) : isCorrect ? (
                    <Alert type="success">
                      <div className="flex items-start space-x-3">
                        <CheckCircle className="h-6 w-6 flex-shrink-0" />
                        <div>
                          <strong>🎉 Chính xác!</strong> Bạn đã trả lời đúng.
                        </div>
                      </div>
                    </Alert>
                  ) : (
                    <Alert type="error">
                      <div className="flex items-start space-x-3">
                        <XCircle className="h-6 w-6 flex-shrink-0" />
                        <div>
                          <strong>Chưa chính xác!</strong>
                          <p className="mt-2">
                            <strong>Đáp án đúng:</strong> {formatCorrectAnswer(currentQuestion)}
                          </p>
                        </div>
                      </div>
                    </Alert>
                  )}
                </div>
              )}

              {/* Explanation */}
              {isCompleted && currentQuestion.explanation && (
                <div className="mb-6">
                  <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                    <div className="flex items-start space-x-3">
                      <Lightbulb className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-blue-900 mb-2">💡 Giải thích:</p>
                        <p className="text-blue-800">{currentQuestion.explanation}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation */}
              <div className="flex items-center justify-between pt-6 border-t">
                <Button
                  variant="outline"
                  icon={ChevronLeft}
                  onClick={handlePrevious}
                  disabled={currentQuestionIndex === 0}
                >
                  Câu trước
                </Button>

                <div className="flex items-center space-x-2">
                  {isCompleted && (
                    <Badge variant={isCorrect === null ? 'warning' : isCorrect ? 'success' : 'danger'}>
                      {isCorrect === null ? '⚠️ Đã lưu' : isCorrect ? '✓ Đã hiểu' : '✗ Cần ôn lại'}
                    </Badge>
                  )}
                </div>

                <Button
                  icon={ChevronRight}
                  iconPosition="right"
                  onClick={handleNext}
                >
                  {currentQuestionIndex === questions.length - 1 ? 'Hoàn thành' : 'Câu tiếp'}
                </Button>
              </div>
            </Card>
          </div>

          {/* Sidebar */}
          <div>
            <Card className="sticky top-24">
              <h3 className="font-bold text-gray-900 mb-4">📋 Danh sách câu hỏi</h3>
              
              <div className="grid grid-cols-5 gap-2 mb-4">
                {questions.map((q, index) => {
                  const completed = isQuestionCompleted(q.id);
                  const userAns = answers[q.id];
                  const correct = completed && isAnswerCorrect(q, userAns);
                  
                  return (
                    <button
                      key={q.id}
                      onClick={() => goToQuestion(index)}
                      className={`aspect-square rounded-lg text-sm font-medium transition-all ${
                        index === currentQuestionIndex
                          ? 'bg-blue-600 text-white ring-2 ring-blue-600 ring-offset-2'
                          : completed
                          ? correct === null
                            ? 'bg-yellow-500 text-white hover:bg-yellow-600'
                            : correct
                            ? 'bg-green-500 text-white hover:bg-green-600'
                            : 'bg-red-500 text-white hover:bg-red-600'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {index + 1}
                    </button>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="space-y-2 text-sm pt-4 border-t">
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-green-500 rounded"></div>
                  <span className="text-gray-600">Đúng ({questions.filter((q) => {
                    const completed = isQuestionCompleted(q.id);
                    const userAns = answers[q.id];
                    const correct = isAnswerCorrect(q, userAns);
                    return completed && correct === true;
                  }).length})</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-red-500 rounded"></div>
                  <span className="text-gray-600">Sai ({questions.filter((q) => {
                    const completed = isQuestionCompleted(q.id);
                    const userAns = answers[q.id];
                    const correct = isAnswerCorrect(q, userAns);
                    return completed && correct === false;
                  }).length})</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                  <span className="text-gray-600">Cần xem lại ({questions.filter((q) => {
                    const completed = isQuestionCompleted(q.id);
                    const userAns = answers[q.id];
                    const correct = isAnswerCorrect(q, userAns);
                    return completed && correct === null;
                  }).length})</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-gray-100 rounded"></div>
                  <span className="text-gray-600">Chưa làm ({questions.length - getCompletedCount()})</span>
                </div>
              </div>

              {/* Complete Button */}
              {getCompletedCount() === questions.length && (
                <div className="mt-6 pt-4 border-t">
                  <Button
                    className="w-full"
                    icon={Home}
                    onClick={() => navigate('/practice')}
                  >
                    🎉 Hoàn thành
                  </Button>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper functions
const getQuestionTypeLabel = (type) => {
  const labels = {
    'multiple_choice': '📝 Trắc nghiệm',
    'multiple_answer': '☑️ Nhiều đáp án',
    'true_false': '✓✗ Đúng/Sai',
    'short_answer': '✍️ Trả lời ngắn',
    'essay': '📄 Tự luận',
    'fill_blank': '⬜ Điền khuy khuyết',
    'ordering': '🔢 Sắp xếp'
  };
  return labels[type] || type;
};

const formatCorrectAnswer = (question) => {
  const answer = question.correct_answer;
  const type = question.question_type;

  // Safe JSON parser - only parse if it looks like JSON
  const safeJSONParse = (value) => {
    // Already an array or object? Return as-is
    if (Array.isArray(value)) return value;
    if (typeof value === 'object' && value !== null) return value;
    
    // Not a string? Convert to string
    if (typeof value !== 'string') return String(value);
    
    // String that looks like JSON array/object? Try to parse
    const trimmed = value.trim();
    if ((trimmed.startsWith('[') && trimmed.endsWith(']')) || 
        (trimmed.startsWith('{') && trimmed.endsWith('}'))) {
      try {
        return JSON.parse(value);
      } catch {
        return value; // Return as-is if parse fails
      }
    }
    
    // Plain string, return as-is
    return value;
  };

  try {
    if (type === 'multiple_answer' || type === 'fill_blank' || type === 'ordering') {
      const parsed = safeJSONParse(answer);
      const arr = Array.isArray(parsed) ? parsed : [parsed];
      return arr.join(', ');
    }

    return String(answer);
  } catch (error) {
    console.error('Error formatting answer:', error);
    return String(answer); // Fallback to string
  }
};

// Question Content Component with all 7 question types
const QuestionContent = ({ question, answer, onAnswerChange, disabled, showCorrect }) => {
  if (!question) return null;

  const questionType = question.question_type;

  // Safe JSON parser
  const safeJSONParse = (value) => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'object' && value !== null) return value;
    if (typeof value !== 'string') return value;
    
    try {
      return JSON.parse(value);
    } catch {
      return value; // Return as-is if not valid JSON
    }
  };

  const options = safeJSONParse(question.options);
  const correctAnswer = safeJSONParse(question.correct_answer);

  switch (questionType) {
    case 'multiple_choice':
      return (
        <div className="space-y-3">
          {options && typeof options === 'object' && Object.entries(options).map(([key, value]) => {
            const isSelected = answer === key;
            const isCorrectAnswer = showCorrect && String(correctAnswer) === String(key);
            const isWrongSelection = showCorrect && isSelected && String(correctAnswer) !== String(key);

            return (
              <label
                key={key}
                className={`flex items-start p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  disabled ? 'cursor-not-allowed' : ''
                } ${
                  isCorrectAnswer
                    ? 'border-green-500 bg-green-50'
                    : isWrongSelection
                    ? 'border-red-500 bg-red-50'
                    : isSelected
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                }`}
              >
                <input
                  type="radio"
                  name={`question-${question.id}`}
                  value={key}
                  checked={isSelected}
                  onChange={(e) => onAnswerChange(e.target.value)}
                  disabled={disabled}
                  className="mt-1 mr-3"
                />
                <span className="flex-1 text-gray-900">
                  <strong>{key})</strong> {value}
                </span>
                {isCorrectAnswer && (
                  <CheckCircle className="h-5 w-5 text-green-600 ml-2 flex-shrink-0" />
                )}
                {isWrongSelection && (
                  <XCircle className="h-5 w-5 text-red-600 ml-2 flex-shrink-0" />
                )}
              </label>
            );
          })}
        </div>
      );

    case 'multiple_answer':
      const selectedAnswers = Array.isArray(answer) ? answer : [];
      const correctAnswersArray = Array.isArray(correctAnswer) ? correctAnswer : [correctAnswer];

      return (
        <div className="space-y-3">
          <p className="text-sm text-gray-600 mb-3">
            ☑️ Chọn tất cả đáp án đúng
          </p>
          {options && typeof options === 'object' && Object.entries(options).map(([key, value]) => {
            const isSelected = selectedAnswers.includes(key);
            const isCorrectAnswer = showCorrect && correctAnswersArray.includes(key);
            const isWrongSelection = showCorrect && isSelected && !correctAnswersArray.includes(key);

            return (
              <label
                key={key}
                className={`flex items-start p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  disabled ? 'cursor-not-allowed' : ''
                } ${
                  isCorrectAnswer
                    ? 'border-green-500 bg-green-50'
                    : isWrongSelection
                    ? 'border-red-500 bg-red-50'
                    : isSelected
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                }`}
              >
                <input
                  type="checkbox"
                  value={key}
                  checked={isSelected}
                  onChange={(e) => {
                    const newAnswers = e.target.checked
                      ? [...selectedAnswers, key]
                      : selectedAnswers.filter(a => a !== key);
                    onAnswerChange(newAnswers);
                  }}
                  disabled={disabled}
                  className="mt-1 mr-3"
                />
                <span className="flex-1 text-gray-900">
                  <strong>{key})</strong> {value}
                </span>
                {isCorrectAnswer && (
                  <CheckCircle className="h-5 w-5 text-green-600 ml-2 flex-shrink-0" />
                )}
                {isWrongSelection && (
                  <XCircle className="h-5 w-5 text-red-600 ml-2 flex-shrink-0" />
                )}
              </label>
            );
          })}
        </div>
      );

    
    case 'true_false':
  // Parse options - should be like {A: "Đúng", B: "Sai"} or {A: "True", B: "False"}
  let trueFalseOptions = {};
  
  if (options && typeof options === 'object') {
    trueFalseOptions = options;
  } else {
    // Default Vietnamese mapping
    trueFalseOptions = {
      'A': 'Đúng',
      'B': 'Sai'
    };
  }

  const correctAnswerKey = String(correctAnswer).trim().toUpperCase();
  const currentAnswerKey = answer ? String(answer).trim().toUpperCase() : '';

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600 mb-2">
        ✓✗ Chọn đáp án đúng
      </p>
      {Object.entries(trueFalseOptions).map(([key, label]) => {
        const normalizedKey = key.toUpperCase();
        const isSelected = currentAnswerKey === normalizedKey;
        const isCorrectAnswer = showCorrect && correctAnswerKey === normalizedKey;
        const isWrongSelection = showCorrect && isSelected && correctAnswerKey !== normalizedKey;

        return (
          <label
            key={normalizedKey}
            className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
              disabled ? 'cursor-not-allowed' : ''
            } ${
              isCorrectAnswer
                ? 'border-green-500 bg-green-50'
                : isWrongSelection
                ? 'border-red-500 bg-red-50'
                : isSelected
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
            }`}
          >
            <input
              type="radio"
              name={`question-${question.id}`}
              value={normalizedKey}
              checked={isSelected}
              onChange={(e) => onAnswerChange(e.target.value)}
              disabled={disabled}
              className="mr-3"
            />
            <span className="flex-1 text-gray-900 font-medium">
              <strong>{normalizedKey})</strong> {label}
            </span>
            {isCorrectAnswer && (
              <CheckCircle className="h-5 w-5 text-green-600 ml-2" />
            )}
            {isWrongSelection && (
              <XCircle className="h-5 w-5 text-red-600 ml-2" />
            )}
          </label>
        );
      })}
    </div>
  );

    case 'fill_blank':
      const blanksArray = Array.isArray(correctAnswer) ? correctAnswer : [correctAnswer];
      const userBlanks = Array.isArray(answer) ? answer : blanksArray.map(() => '');

      return (
        <div className="space-y-4">
          <p className="text-sm text-gray-600 mb-3">
            ⬜ Điền vào các chỗ trống cách nhau bởi dấu phẩy
          </p>
          {blanksArray.map((blank, index) => (
            <div key={index}>
              <input
                type="text"
                value={userBlanks[index] || ''}
                onChange={(e) => {
                  const newBlanks = [...userBlanks];
                  newBlanks[index] = e.target.value;
                  onAnswerChange(newBlanks);
                }}
                disabled={disabled}
                placeholder={`Nhập câu trả lời ${index + 1}...`}
                className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none transition-colors ${
                  disabled
                    ? showCorrect && userBlanks[index]?.trim().toLowerCase() === String(blank).trim().toLowerCase()
                      ? 'bg-green-50 border-green-500'
                      : showCorrect
                      ? 'bg-red-50 border-red-500'
                      : 'bg-gray-50 cursor-not-allowed border-gray-200'
                    : 'border-gray-200 focus:border-blue-500'
                }`}
              />
              {showCorrect && userBlanks[index]?.trim().toLowerCase() !== String(blank).trim().toLowerCase() && (
                <p className="mt-1 text-sm text-red-600">
                  Đáp án đúng: <strong>{blank}</strong>
                </p>
              )}
            </div>
          ))}
        </div>
      );

    case 'ordering':
      const itemsArray = Array.isArray(correctAnswer) ? correctAnswer : [correctAnswer];
      const userOrder = Array.isArray(answer) ? answer : [...itemsArray];

      return (
        <div className="space-y-4">
          <p className="text-sm text-gray-600 mb-3">
            🔢 Sắp xếp các mục theo thứ tự đúng (kéo thả hoặc nhập số thứ tự)
          </p>
          {userOrder.map((item, index) => (
            <div key={index} className="flex items-center space-x-3">
              <input
                type="number"
                min="1"
                max={itemsArray.length}
                value={index + 1}
                onChange={(e) => {
                  const newIndex = parseInt(e.target.value) - 1;
                  if (newIndex >= 0 && newIndex < itemsArray.length && newIndex !== index) {
                    const newOrder = [...userOrder];
                    [newOrder[index], newOrder[newIndex]] = [newOrder[newIndex], newOrder[index]];
                    onAnswerChange(newOrder);
                  }
                }}
                disabled={disabled}
                className="w-16 px-3 py-2 border-2 border-gray-200 rounded-lg text-center focus:outline-none focus:border-blue-500"
              />
              <div className={`flex-1 p-4 border-2 rounded-lg ${
                showCorrect && itemsArray[index] === item
                  ? 'border-green-500 bg-green-50'
                  : showCorrect
                  ? 'border-red-500 bg-red-50'
                  : 'border-gray-200 bg-white'
              }`}>
                {item}
              </div>
              {showCorrect && itemsArray[index] !== item && (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
              {showCorrect && itemsArray[index] === item && (
                <CheckCircle className="h-5 w-5 text-green-600" />
              )}
            </div>
          ))}
        </div>
      );

    case 'short_answer':
      return (
        <div>
          <input
            type="text"
            value={answer || ''}
            onChange={(e) => onAnswerChange(e.target.value)}
            disabled={disabled}
            placeholder="Nhập câu trả lời của bạn..."
            className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none transition-colors ${
              disabled
                ? showCorrect && String(answer).trim().toLowerCase() === String(correctAnswer).trim().toLowerCase()
                  ? 'bg-green-50 border-green-500'
                  : showCorrect
                  ? 'bg-red-50 border-red-500'
                  : 'bg-gray-50 cursor-not-allowed border-gray-200'
                : 'border-gray-200 focus:border-blue-500'
            }`}
          />
          {showCorrect && String(answer).trim().toLowerCase() !== String(correctAnswer).trim().toLowerCase() && (
            <p className="mt-2 text-sm text-red-600">
              Đáp án đúng: <strong>{correctAnswer}</strong>
            </p>
          )}
        </div>
      );

    case 'essay':
      return (
        <div>
          <textarea
            value={answer || ''}
            onChange={(e) => onAnswerChange(e.target.value)}
            disabled={disabled}
            placeholder="Nhập câu trả lời của bạn..."
            rows={8}
            className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none transition-colors resize-none ${
              disabled
                ? 'bg-gray-50 cursor-not-allowed border-gray-200'
                : 'border-gray-200 focus:border-blue-500'
            }`}
          />
          {showCorrect && (
            <div className="mt-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm font-medium text-blue-900 mb-2">📝 Câu trả lời tham khảo:</p>
              <p className="text-sm text-blue-800">{correctAnswer}</p>
            </div>
          )}
        </div>
      );

    default:
      return (
        <Alert type="warning">
          <AlertCircle className="h-5 w-5" />
          <span className="ml-2">Loại câu hỏi <strong>{questionType}</strong> chưa được hỗ trợ</span>
        </Alert>
      );
  }
};

export default PracticeSession;