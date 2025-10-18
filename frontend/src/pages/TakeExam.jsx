import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Clock,
  Flag,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  AlertCircle,
  Save
} from 'lucide-react';
import { examService } from '../services/examService';
import { submissionService } from '../services/submissionService';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Loading from '../components/common/Loading';
import Modal from '../components/common/Modal';
import Alert from '../components/common/Alert';
import toast from 'react-hot-toast';

const TakeExam = () => {
  const { examId } = useParams();
  const navigate = useNavigate();

  const [exam, setExam] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [flaggedQuestions, setFlaggedQuestions] = useState(new Set());
  const [userExamId, setUserExamId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  
  // Timer
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [timerInterval, setTimerInterval] = useState(null);

  useEffect(() => {
    loadExamAndStart();
    
    return () => {
      if (timerInterval) {
        clearInterval(timerInterval);
      }
    };
  }, [examId]);

  useEffect(() => {
    // Auto-save every 30 seconds
    const autoSaveInterval = setInterval(() => {
      if (userExamId) {
        saveCurrentAnswer();
      }
    }, 30000);

    return () => clearInterval(autoSaveInterval);
  }, [userExamId, currentQuestionIndex, answers]);

  const loadExamAndStart = async () => {
    try {
      setLoading(true);
      
      // Load exam details
      const examData = await examService.getById(examId);
      setExam(examData);
      setQuestions(examData.questions || []);
      
      // Start exam session
      const startResponse = await submissionService.startExam(examId);
      setUserExamId(startResponse.user_exam_id);
      
      // Set timer
      const durationInSeconds = (examData.duration || 30) * 60;
      setTimeRemaining(durationInSeconds);
      
      // Start countdown
      const interval = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            handleAutoSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      setTimerInterval(interval);
      
    } catch (error) {
      console.error('Failed to load exam:', error);
      toast.error('Không thể tải đề thi');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const saveCurrentAnswer = async () => {
    const currentQuestion = questions[currentQuestionIndex];
    const answer = answers[currentQuestion.id];
    
    if (!answer || !userExamId) return;

    try {
      await submissionService.saveAnswer({
        user_exam_id: userExamId,
        question_id: currentQuestion.id,
        answer: answer,
      });
    } catch (error) {
      console.error('Failed to save answer:', error);
    }
  };

  const handleAnswerChange = (questionId, answer) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer,
    }));
  };

  const toggleFlag = (questionId) => {
    setFlaggedQuestions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(questionId)) {
        newSet.delete(questionId);
      } else {
        newSet.add(questionId);
      }
      return newSet;
    });
  };

  const goToQuestion = async (index) => {
    await saveCurrentAnswer();
    setCurrentQuestionIndex(index);
  };

  const handlePrevious = async () => {
    if (currentQuestionIndex > 0) {
      await goToQuestion(currentQuestionIndex - 1);
    }
  };

  const handleNext = async () => {
    if (currentQuestionIndex < questions.length - 1) {
      await goToQuestion(currentQuestionIndex + 1);
    }
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      
      // Save current answer
      await saveCurrentAnswer();
      
      // Submit exam
      const result = await submissionService.submitExam(userExamId);
      
      toast.success('Đã nộp bài thành công!');
      navigate(`/exam/${examId}/result?userExamId=${userExamId}`);
      
    } catch (error) {
      console.error('Submit error:', error);
      toast.error('Không thể nộp bài. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAutoSubmit = async () => {
    toast.info('Hết giờ! Đang tự động nộp bài...');
    await handleSubmit();
  };

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimerColor = () => {
    if (timeRemaining > 300) return 'text-green-600'; // > 5 min
    if (timeRemaining > 60) return 'text-yellow-600'; // > 1 min
    return 'text-red-600 animate-pulse'; // < 1 min
  };

  const getAnsweredCount = () => {
    return Object.keys(answers).length;
  };

  const getQuestionStatus = (questionId) => {
    if (answers[questionId]) return 'answered';
    if (flaggedQuestions.has(questionId)) return 'flagged';
    return 'unanswered';
  };

  if (loading) {
    return <Loading fullScreen text="Đang tải đề thi..." />;
  }

  const currentQuestion = questions[currentQuestionIndex];
  const currentAnswer = answers[currentQuestion?.id];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">{exam?.title}</h1>
              <p className="text-sm text-gray-500 mt-1">
                Câu {currentQuestionIndex + 1}/{questions.length}
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Timer */}
              <div className={`flex items-center space-x-2 font-mono text-lg font-bold ${getTimerColor()}`}>
                <Clock className="h-5 w-5" />
                <span>{formatTime(timeRemaining)}</span>
              </div>
              
              {/* Submit Button */}
              <Button
                variant="danger"
                onClick={() => setShowSubmitModal(true)}
                disabled={submitting}
              >
                Nộp bài
              </Button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
              <span>Tiến độ: {getAnsweredCount()}/{questions.length}</span>
              <span>{Math.round((getAnsweredCount() / questions.length) * 100)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(getAnsweredCount() / questions.length) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Question Content */}
          <div className="lg:col-span-3">
            <Card>
              {/* Question Header */}
              <div className="flex items-start justify-between mb-6">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-3">
                    <span className="text-sm font-medium text-gray-500">
                      Câu {currentQuestionIndex + 1}
                    </span>
                    <span className="text-sm text-gray-500">•</span>
                    <span className="text-sm text-gray-500">
                      {currentQuestion?.marks || 1} điểm
                    </span>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900">
                    {currentQuestion?.question_text}
                  </h3>
                </div>
                
                <button
                  onClick={() => toggleFlag(currentQuestion?.id)}
                  className={`ml-4 p-2 rounded-lg transition-colors ${
                    flaggedQuestions.has(currentQuestion?.id)
                      ? 'text-red-600 bg-red-50'
                      : 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                  }`}
                  title="Đánh dấu câu hỏi"
                >
                  <Flag className="h-5 w-5" />
                </button>
              </div>

              {/* Question Content */}
              <div className="mb-6">
                <QuestionContent
                  question={currentQuestion}
                  answer={currentAnswer}
                  onAnswerChange={(answer) => handleAnswerChange(currentQuestion.id, answer)}
                />
              </div>

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

                <Button
                  variant="ghost"
                  icon={Save}
                  onClick={saveCurrentAnswer}
                  className="text-gray-600"
                >
                  Lưu tạm
                </Button>

                <Button
                  icon={ChevronRight}
                  onClick={handleNext}
                  disabled={currentQuestionIndex === questions.length - 1}
                >
                  Câu tiếp
                </Button>
              </div>
            </Card>
          </div>

          {/* Sidebar - Question Navigator */}
          <div>
            <Card className="sticky top-24">
              <h3 className="font-bold text-gray-900 mb-4">Danh sách câu hỏi</h3>
              
              <div className="grid grid-cols-5 gap-2 mb-4">
                {questions.map((q, index) => {
                  const status = getQuestionStatus(q.id);
                  return (
                    <button
                      key={q.id}
                      onClick={() => goToQuestion(index)}
                      className={`aspect-square rounded-lg text-sm font-medium transition-all ${
                        index === currentQuestionIndex
                          ? 'bg-blue-600 text-white ring-2 ring-blue-600 ring-offset-2'
                          : status === 'answered'
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : status === 'flagged'
                          ? 'bg-red-100 text-red-700 hover:bg-red-200'
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
                  <div className="w-4 h-4 bg-green-100 rounded"></div>
                  <span className="text-gray-600">Đã trả lời ({getAnsweredCount()})</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-gray-100 rounded"></div>
                  <span className="text-gray-600">Chưa làm ({questions.length - getAnsweredCount()})</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-red-100 rounded"></div>
                  <span className="text-gray-600">Đánh dấu ({flaggedQuestions.size})</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-blue-600 rounded"></div>
                  <span className="text-gray-600">Đang làm</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Submit Confirmation Modal */}
      <Modal
        isOpen={showSubmitModal}
        onClose={() => setShowSubmitModal(false)}
        title="⚠️ Xác nhận nộp bài"
        size="md"
        footer={
          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={() => setShowSubmitModal(false)}
            >
              Kiểm tra lại
            </Button>
            <Button
              variant="danger"
              onClick={handleSubmit}
              loading={submitting}
            >
              ✅ Nộp bài
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Alert type="warning">
            Sau khi nộp bài, bạn không thể chỉnh sửa câu trả lời!
          </Alert>

          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Đã trả lời:</span>
              <span className="font-medium text-gray-900">
                {getAnsweredCount()}/{questions.length} câu
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Chưa trả lời:</span>
              <span className="font-medium text-gray-900">
                {questions.length - getAnsweredCount()} câu
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Đã đánh dấu:</span>
              <span className="font-medium text-gray-900">
                {flaggedQuestions.size} câu
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Thời gian còn lại:</span>
              <span className={`font-medium ${getTimerColor()}`}>
                {formatTime(timeRemaining)}
              </span>
            </div>
          </div>

          {questions.length - getAnsweredCount() > 0 && (
            <Alert type="warning">
              Bạn còn <strong>{questions.length - getAnsweredCount()} câu</strong> chưa trả lời.
              {flaggedQuestions.size > 0 && (
                <span> Có <strong>{flaggedQuestions.size} câu</strong> đã đánh dấu.</span>
              )}
            </Alert>
          )}
        </div>
      </Modal>
    </div>
  );
};

// Question Content Component
const QuestionContent = ({ question, answer, onAnswerChange }) => {
  if (!question) return null;

  switch (question.question_type) {
    case 'multiple_choice':
      return (
        <div className="space-y-3">
          {question.options && Object.entries(question.options).map(([key, value]) => (
            <label
              key={key}
              className={`flex items-start p-4 border-2 rounded-lg cursor-pointer transition-all ${
                answer === key
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
              }`}
            >
              <input
                type="radio"
                name={`question-${question.id}`}
                value={key}
                checked={answer === key}
                onChange={(e) => onAnswerChange(e.target.value)}
                className="mt-1 mr-3"
              />
              <span className="flex-1 text-gray-900">{key}) {value}</span>
            </label>
          ))}
        </div>
      );

    case 'true_false':
      return (
        <div className="space-y-3">
          {['Đúng', 'Sai'].map((option) => (
            <label
              key={option}
              className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                answer === option
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
              }`}
            >
              <input
                type="radio"
                name={`question-${question.id}`}
                value={option}
                checked={answer === option}
                onChange={(e) => onAnswerChange(e.target.value)}
                className="mr-3"
              />
              <span className="text-gray-900">{option}</span>
            </label>
          ))}
        </div>
      );

    case 'short_answer':
      return (
        <input
          type="text"
          value={answer || ''}
          onChange={(e) => onAnswerChange(e.target.value)}
          placeholder="Nhập câu trả lời của bạn..."
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
        />
      );

    case 'essay':
      return (
        <textarea
          value={answer || ''}
          onChange={(e) => onAnswerChange(e.target.value)}
          placeholder="Nhập câu trả lời của bạn..."
          rows={8}
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 transition-colors resize-none"
        />
      );

    default:
      return <p className="text-gray-500">Loại câu hỏi không được hỗ trợ</p>;
  }
};

export default TakeExam;