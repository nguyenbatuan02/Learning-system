import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Clock,
  Flag,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  AlertCircle,
  Save,
  X
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
  const autoSaveTimerRef = useRef(null);
  const countdownTimerRef = useRef(null);

  const [exam, setExam] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({}); 
  const [flaggedQuestions, setFlaggedQuestions] = useState(new Set());
  const [attemptId, setAttemptId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  
  // Timer
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [timerWarning, setTimerWarning] = useState(false);

  // Load exam on mount
  useEffect(() => {
    loadExam();
    
    // Prevent page refresh/close
    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = 'Bạn có chắc muốn rời khỏi? Bài làm chưa được nộp sẽ mất!';
      return e.returnValue;
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (autoSaveTimerRef.current) clearInterval(autoSaveTimerRef.current);
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    };
  }, [examId]);

  // Auto-save every 30 seconds
  useEffect(() => {
    if (attemptId && questions.length > 0) {
      autoSaveTimerRef.current = setInterval(() => {
        autoSave();
      }, 30000); // 30 seconds
    }

    return () => {
      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current);
      }
    };
  }, [attemptId, questions]);

  const loadExam = async () => {
    try {
      setLoading(true);
      
      // Load exam with questions
      const examData = await examService.takeExam(examId);
      
      if (!examData.is_published) {
        toast.error('Đề thi chưa được công bố');
        navigate('/exams');
        return;
      }

      setExam(examData);
      setQuestions(examData.questions || []);

      const startResponse = await submissionService.startExam(examId);
      setAttemptId(startResponse.user_exam_id);
      
      // Initialize timer
      const durationInSeconds = (examData.duration_minutes || 30) * 60;
      setTimeRemaining(durationInSeconds);
      
      // Start countdown
      countdownTimerRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            handleAutoSubmit();
            return 0;
          }
          
          // Warning at 5 minutes
          if (prev === 300) {
            setTimerWarning(true);
            toast('⏰ Còn 5 phút!', { 
                icon: '⚠️',
                duration: 5000,
                style: {
                    background: '#FEF3C7',
                    color: '#92400E',
                }
            });
          }
          
          return prev - 1;
        });
      }, 1000);
      
    } catch (error) {
      console.error('Load exam error:', error);
      const errorMsg = error.response?.data?.detail || 'Không thể tải đề thi';
      toast.error(errorMsg);
      navigate('/exams');
    } finally {
      setLoading(false);
    }
  };


  const autoSave = async () => {
  if (!attemptId || Object.keys(answers).length === 0) return;

  try {
    // Lưu tất cả câu trả lời trong state answers
    for (const [questionId, answer] of Object.entries(answers)) {
      if (answer && answer !== '') {
        const q = questions.find(q => q.id === questionId);
        if (!q) continue;

        await submissionService.saveAnswer({
          user_exam_id: attemptId,
          exam_question_id: q.exam_question_id,
          user_answer: answer,
        });
      }
    }
  } catch (error) {
    // Fallback lưu vào localStorage
    const saveData = {
      examId,
      attemptId,
      answers,
      flaggedQuestions: Array.from(flaggedQuestions),
      timeRemaining,
      timestamp: Date.now(),
    };
    localStorage.setItem(`exam_${examId}_autosave`, JSON.stringify(saveData));
  }
};

  const handleAnswerChange = async (questionId, answer) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer,
    }));
    if (attemptId && answer && answer !== '') {
        try {
            const q = questions.find(q => q.id === questionId);
            if (!q) return;
            await submissionService.saveAnswer({
                user_exam_id: attemptId,
                exam_question_id: q.exam_question_id,
                user_answer: answer,
            });
        } catch (error) {
            toast.error('Không thể lưu câu trả lời, thử lại!');
        }
    }
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

  const goToQuestion = (index) => {
    if (index >= 0 && index < questions.length) {
      setCurrentQuestionIndex(index);
      // Scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      goToQuestion(currentQuestionIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      goToQuestion(currentQuestionIndex + 1);
    }
  };

 const handleSubmit = async () => {
  try {
    setSubmitting(true);

    
    // Submit exam
    const result = await submissionService.submitExam(attemptId);
    
    // Clear autosave
    localStorage.removeItem(`exam_${examId}_autosave`);
    
    // Clear timers
    if (autoSaveTimerRef.current) clearInterval(autoSaveTimerRef.current);
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    
    toast.success('✅ Đã nộp bài thành công!');
    
    // Navigate với user_exam_id từ response
    const targetUrl = `/exam/${examId}/result?userExamId=${result.user_exam_id}`;
    navigate(targetUrl);
    
  } catch (error) {
    console.error('❌ Submit error:', error);
    console.error('Error response:', error.response?.data);
    const errorMsg = error.response?.data?.detail || 'Không thể nộp bài. Vui lòng thử lại.';
    toast.error(errorMsg);
  } finally {
    setSubmitting(false);
    setShowSubmitModal(false);
  }
};


  const handleAutoSubmit = async () => {
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    toast('⏰ Hết giờ! Đang tự động nộp bài...', {
        icon: '⏰',
        duration: 4000,
    });
    await handleSubmit();
  };

  const handleExit = () => {
    autoSave();
    navigate('/exams');
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
    return Object.values(answers).filter(a => a !== null && a !== '' && a !== undefined).length;
  };

  const getQuestionStatus = (questionId) => {
    const answer = answers[questionId];
    const hasAnswer = answer !== null && answer !== '' && answer !== undefined;
    
    if (hasAnswer) return 'answered';
    if (flaggedQuestions.has(questionId)) return 'flagged';
    return 'unanswered';
  };

  if (loading) {
    return <Loading fullScreen text="Đang tải đề thi..." />;
  }

  if (!exam || questions.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <Alert type="warning">
          Đề thi không có câu hỏi hoặc không tồn tại.
        </Alert>
        <Button className="mt-4" onClick={() => navigate('/exams')}>
          Quay lại danh sách đề thi
        </Button>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const currentAnswer = answers[currentQuestion?.id];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Fixed Header */}
      <div className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h1 className="text-xl font-bold text-gray-900">{exam.title}</h1>
              <p className="text-sm text-gray-500 mt-1">
                Câu {currentQuestionIndex + 1}/{questions.length} • {currentQuestion?.marks || 1} điểm
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Timer */}
              <div className={`flex items-center space-x-2 font-mono text-lg font-bold ${getTimerColor()}`}>
                <Clock className="h-5 w-5" />
                <span>{formatTime(timeRemaining)}</span>
              </div>
              
              {/* Exit Button */}
              <Button
                variant="outline"
                size="sm"
                icon={X}
                onClick={() => setShowExitModal(true)}
              >
                Thoát
              </Button>
              
              {/* Submit Button */}
              <Button
                variant="primary"
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
              <span>Đã làm: {getAnsweredCount()}/{questions.length} câu</span>
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

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Question Panel */}
          <div className="lg:col-span-3">
            <Card>
              {/* Question Header */}
              <div className="flex items-start justify-between mb-6">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-3">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                      Câu {currentQuestionIndex + 1}
                    </span>
                    <span className="text-sm text-gray-500">
                      {currentQuestion.marks || 1} điểm
                    </span>
                    {getQuestionStatus(currentQuestion.id) === 'answered' && (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    )}
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 leading-relaxed">
                    {currentQuestion.question_text}
                  </h3>
                </div>
                
                {/* Flag Button */}
                <button
                  onClick={() => toggleFlag(currentQuestion.id)}
                  className={`ml-4 p-2 rounded-lg transition-colors flex-shrink-0 ${
                    flaggedQuestions.has(currentQuestion.id)
                      ? 'text-red-600 bg-red-50 hover:bg-red-100'
                      : 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                  }`}
                  title={flaggedQuestions.has(currentQuestion.id) ? 'Bỏ đánh dấu' : 'Đánh dấu'}
                >
                  <Flag className="h-5 w-5" fill={flaggedQuestions.has(currentQuestion.id) ? 'currentColor' : 'none'} />
                </button>
              </div>

              {/* Question Content */}
              <div className="mb-8">
                <QuestionContent
                  question={currentQuestion}
                  answer={currentAnswer}
                  onAnswerChange={(answer) => handleAnswerChange(currentQuestion.id, answer)}
                />
              </div>

              {/* Navigation Buttons */}
              <div className="flex items-center justify-between pt-6 border-t">
                <Button
                  variant="outline"
                  icon={ChevronLeft}
                  onClick={handlePrevious}
                  disabled={currentQuestionIndex === 0}
                >
                  Câu trước
                </Button>

                <div className="text-sm text-gray-500">
                  {currentQuestionIndex + 1} / {questions.length}
                </div>

                {currentQuestionIndex === questions.length - 1 ? (
                  <Button
                    variant="primary"
                    onClick={() => setShowSubmitModal(true)}
                  >
                    Nộp bài
                  </Button>
                ) : (
                  <Button
                    icon={ChevronRight}
                    onClick={handleNext}
                  >
                    Câu tiếp
                  </Button>
                )}
              </div>
            </Card>
          </div>

          {/* Sidebar - Question Navigator */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24">
              <h3 className="font-bold text-gray-900 mb-4">Danh sách câu hỏi</h3>
              
              {/* Question Grid */}
              <div className="grid grid-cols-5 gap-2 mb-6">
                {questions.map((q, index) => {
                  const status = getQuestionStatus(q.id);
                  const isCurrent = index === currentQuestionIndex;
                  
                  return (
                    <button
                      key={q.id}
                      onClick={() => goToQuestion(index)}
                      className={`aspect-square rounded-lg text-sm font-medium transition-all relative ${
                        isCurrent
                          ? 'bg-blue-600 text-white ring-2 ring-blue-600 ring-offset-2'
                          : status === 'answered'
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : status === 'flagged'
                          ? 'bg-red-100 text-red-700 hover:bg-red-200'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                      title={`Câu ${index + 1}${status === 'answered' ? ' - Đã trả lời' : status === 'flagged' ? ' - Đã đánh dấu' : ''}`}
                    >
                      {index + 1}
                      {flaggedQuestions.has(q.id) && !isCurrent && (
                        <Flag className="absolute -top-1 -right-1 h-3 w-3 text-red-600" fill="currentColor" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="space-y-2 text-xs pt-4 border-t">
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-green-100 rounded"></div>
                  <span className="text-gray-600">Đã làm ({getAnsweredCount()})</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-gray-100 rounded"></div>
                  <span className="text-gray-600">Chưa làm ({questions.length - getAnsweredCount()})</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-red-100 rounded relative">
                    <Flag className="absolute inset-0 m-auto h-3 w-3 text-red-600" fill="currentColor" />
                  </div>
                  <span className="text-gray-600">Đánh dấu ({flaggedQuestions.size})</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-blue-600 rounded"></div>
                  <span className="text-gray-600">Đang làm</span>
                </div>
              </div>

              {/* Quick Info */}
              <div className="mt-6 pt-4 border-t space-y-2 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Tổng điểm:</span>
                  <span className="font-medium text-gray-900">{exam.total_marks}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Thời gian:</span>
                  <span className={`font-medium ${getTimerColor()}`}>
                    {formatTime(timeRemaining)}
                  </span>
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
              variant="primary"
              onClick={handleSubmit}
              loading={submitting}
            >
              Nộp bài
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {questions.length - getAnsweredCount() > 0 && (
            <Alert type="warning">
              Bạn còn <strong>{questions.length - getAnsweredCount()} câu</strong> chưa trả lời!
            </Alert>
          )}

          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
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
            <div className="flex justify-between border-t pt-3">
              <span className="text-gray-600">Thời gian còn lại:</span>
              <span className={`font-medium ${getTimerColor()}`}>
                {formatTime(timeRemaining)}
              </span>
            </div>
          </div>

          <Alert type="info">
            Sau khi nộp bài, bạn không thể chỉnh sửa câu trả lời!
          </Alert>
        </div>
      </Modal>

      {/* Exit Confirmation Modal */}
      <Modal
        isOpen={showExitModal}
        onClose={() => setShowExitModal(false)}
        title="⚠️ Xác nhận thoát"
        size="sm"
        footer={
          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={() => setShowExitModal(false)}
            >
              Ở lại
            </Button>
            <Button
              variant="danger"
              onClick={handleExit}
            >
              Thoát
            </Button>
          </div>
        }
      >
        <p className="text-gray-600">
          Bài làm của bạn sẽ không được lưu nếu thoát bây giờ. Bạn có chắc chắn muốn thoát không?
        </p>
      </Modal>
    </div>
  );
};

// Question Content Component - Render different question types
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
                className="mt-1 mr-3 w-4 h-4"
              />
              <span className="flex-1 text-gray-900">
                <strong>{key})</strong> {value}
              </span>
            </label>
          ))}
        </div>
      );

    case 'multiple_answer':
      const selectedAnswers = Array.isArray(answer) ? answer : [];
      
      return (
        <div className="space-y-3">
          <p className="text-sm text-blue-600 mb-3">
            <AlertCircle className="inline h-4 w-4 mr-1" />
            Chọn nhiều đáp án đúng
          </p>
          {question.options && Object.entries(question.options).map(([key, value]) => (
            <label
              key={key}
              className={`flex items-start p-4 border-2 rounded-lg cursor-pointer transition-all ${
                selectedAnswers.includes(key)
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
              }`}
            >
              <input
                type="checkbox"
                value={key}
                checked={selectedAnswers.includes(key)}
                onChange={(e) => {
                  const newAnswers = e.target.checked
                    ? [...selectedAnswers, key]
                    : selectedAnswers.filter(a => a !== key);
                  onAnswerChange(newAnswers);
                }}
                className="mt-1 mr-3 w-4 h-4"
              />
              <span className="flex-1 text-gray-900">
                <strong>{key})</strong> {value}
              </span>
            </label>
          ))}
        </div>
      );

    case 'true_false':
      return (
        <div className="space-y-3">
          {question.options && Object.entries(question.options).map(([key, value]) => (
            <label
              key={key}
              className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
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
                className="mr-3 w-4 h-4"
              />
              <span className="text-gray-900 font-medium">{value}</span>
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
          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
        />
      );

    case 'essay':
      return (
        <div>
          <textarea
            value={answer || ''}
            onChange={(e) => onAnswerChange(e.target.value)}
            placeholder="Nhập câu trả lời của bạn..."
            rows={10}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors resize-none"
          />
          <p className="text-sm text-gray-500 mt-2">
            {(answer || '').length} ký tự
          </p>
        </div>
      );

    case 'fill_blank':
      return (
        <div>
          <p className="text-sm text-gray-600 mb-3">
            Điền từ/cụm từ thích hợp vào chỗ trống
          </p>
          <input
            type="text"
            value={answer || ''}
            onChange={(e) => onAnswerChange(e.target.value)}
            placeholder="Nhập câu trả lời..."
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
          />
        </div>
      );

    case 'ordering':
      return (
        <div>
          <p className="text-sm text-gray-600 mb-3">
            Nhập thứ tự đúng (ví dụ: A, B, C, D)
          </p>
          <input
            type="text"
            value={answer || ''}
            onChange={(e) => onAnswerChange(e.target.value)}
            placeholder="Ví dụ: A, B, C, D"
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
          />
        </div>
      );

    default:
      return (
        <Alert type="warning">
          Loại câu hỏi "{question.question_type}" chưa được hỗ trợ
        </Alert>
      );
  }
};

export default TakeExam;