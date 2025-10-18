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
  Home
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
      
      setSession(sessionData);
      setQuestions(questionsData.questions || []);

      // Find first incomplete question
      const completedIds = sessionData.completed_question_ids || [];
      const firstIncomplete = questionsData.questions.findIndex(
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

    if (!userAnswer) {
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
        toast.success('Bạn đã hoàn thành bài ôn luyện!');
      }
    } catch (error) {
      console.error('Failed to mark question:', error);
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
    
    // Normalize answers for comparison
    const normalizedUserAnswer = userAnswer.toString().trim().toLowerCase();
    const normalizedCorrectAnswer = question.correct_answer.toString().trim().toLowerCase();
    
    return normalizedUserAnswer === normalizedCorrectAnswer;
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
          Không tìm thấy bài ôn luyện hoặc không có câu hỏi nào.
        </Alert>
        <Button onClick={() => navigate('/practice')} className="mt-4">
          Về trang ôn luyện
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
                className="text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  {session.session_type === 'wrong_answers' ? '🔴 Ôn lại câu sai' :
                   session.session_type === 'weak_topics' ? '📚 Luyện điểm yếu' :
                   '🎯 Ôn luyện tùy chỉnh'}
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
              <strong>💡 Chế độ ôn luyện:</strong> Bạn có thể xem đáp án ngay sau khi trả lời. 
              Không tính điểm, tập trung vào việc học!
            </Alert>

            <Card>
              {/* Question Header */}
              <div className="mb-6">
                <div className="flex items-center space-x-3 mb-3">
                  <span className="text-sm font-medium text-gray-500">
                    Câu {currentQuestionIndex + 1}
                  </span>
                  {isCompleted && (
                    <Badge variant={isCorrect ? 'success' : 'danger'}>
                      {isCorrect ? '✓ Đúng' : '✗ Sai'}
                    </Badge>
                  )}
                  <span className="text-sm text-gray-500">•</span>
                  <span className="text-sm text-gray-500">
                    {currentQuestion?.marks || 1} điểm
                  </span>
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
                    disabled={!currentAnswer}
                  >
                    ✓ Kiểm tra đáp án
                  </Button>
                </div>
              )}

              {/* Answer Feedback */}
              {isCompleted && (
                <div className="mb-6">
                  {isCorrect ? (
                    <Alert type="success">
                      <div className="flex items-start space-x-3">
                        <CheckCircle className="h-6 w-6 flex-shrink-0" />
                        <div>
                          <strong>Chính xác!</strong> Bạn đã trả lời đúng.
                        </div>
                      </div>
                    </Alert>
                  ) : (
                    <Alert type="error">
                      <div className="flex items-start space-x-3">
                        <XCircle className="h-6 w-6 flex-shrink-0" />
                        <div>
                          <strong>Chưa chính xác!</strong>
                          <p className="mt-1">
                            Đáp án đúng: <strong>{currentQuestion.correct_answer}</strong>
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
                        <p className="font-semibold text-blue-900 mb-2">Giải thích:</p>
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
                    <Badge variant="success">
                      ✓ Đã hiểu
                    </Badge>
                  )}
                </div>

                <Button
                  icon={ChevronRight}
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
              <h3 className="font-bold text-gray-900 mb-4">Danh sách câu hỏi</h3>
              
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
                          ? correct
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
                  <span className="text-gray-600">Đúng ({questions.filter((q, i) => {
                    const completed = isQuestionCompleted(q.id);
                    const userAns = answers[q.id];
                    return completed && isAnswerCorrect(q, userAns);
                  }).length})</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-red-500 rounded"></div>
                  <span className="text-gray-600">Sai ({questions.filter((q, i) => {
                    const completed = isQuestionCompleted(q.id);
                    const userAns = answers[q.id];
                    return completed && !isAnswerCorrect(q, userAns);
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
                    Hoàn thành
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

// Question Content Component (Same as TakeExam but with correct answer highlighting)
const QuestionContent = ({ question, answer, onAnswerChange, disabled, showCorrect }) => {
  if (!question) return null;

  switch (question.question_type) {
    case 'multiple_choice':
      return (
        <div className="space-y-3">
          {question.options && Object.entries(question.options).map(([key, value]) => {
            const isSelected = answer === key;
            const isCorrectAnswer = showCorrect && question.correct_answer === key;
            const isWrongSelection = showCorrect && isSelected && question.correct_answer !== key;

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
                  {key}) {value}
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
      return (
        <div className="space-y-3">
          {['Đúng', 'Sai'].map((option) => {
            const isSelected = answer === option;
            const isCorrectAnswer = showCorrect && question.correct_answer === option;
            const isWrongSelection = showCorrect && isSelected && question.correct_answer !== option;

            return (
              <label
                key={option}
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
                  value={option}
                  checked={isSelected}
                  onChange={(e) => onAnswerChange(e.target.value)}
                  disabled={disabled}
                  className="mr-3"
                />
                <span className="flex-1 text-gray-900">{option}</span>
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
                ? 'bg-gray-50 cursor-not-allowed'
                : 'border-gray-200 focus:border-blue-500'
            }`}
          />
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
            rows={6}
            className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none transition-colors resize-none ${
              disabled
                ? 'bg-gray-50 cursor-not-allowed'
                : 'border-gray-200 focus:border-blue-500'
            }`}
          />
        </div>
      );

    default:
      return <p className="text-gray-500">Loại câu hỏi không được hỗ trợ</p>;
  }
};

export default PracticeSession;