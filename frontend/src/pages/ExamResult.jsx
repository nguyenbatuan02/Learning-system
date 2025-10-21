import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { 
  Award,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  Target,
  RotateCcw,
  Home,
  Download,
  Share2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { submissionService } from '../services/submissionService';
import { practiceService } from '../services/practiceService';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import Loading from '../components/common/Loading';
import ProgressBar from '../components/common/ProgressBar';
import toast from 'react-hot-toast';

const ExamResult = () => {
  const { examId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const userExamId = searchParams.get('userExamId');
  console.log('🔍 ExamResult - examId:', examId);
  console.log('🔍 ExamResult - userExamId:', userExamId);

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedQuestions, setExpandedQuestions] = useState(new Set());

  useEffect(() => {
    loadResult();
  }, [userExamId]);

  const loadResult = async () => {
    try {
      setLoading(true);
      const data = await submissionService.getResult(userExamId);
      setResult(data);
    } catch (error) {
      console.error('Failed to load result:', error);
      toast.error('Không thể tải kết quả');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const toggleQuestion = (questionId) => {
    setExpandedQuestions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(questionId)) {
        newSet.delete(questionId);
      } else {
        newSet.add(questionId);
      }
      return newSet;
    });
  };

  const expandAll = () => {
    const allIds = new Set(result.answers.map(a => a.question_id));
    setExpandedQuestions(allIds);
  };

  const collapseAll = () => {
    setExpandedQuestions(new Set());
  };

  const handleCreatePracticeSession = async () => {
    try {
      // Get wrong answer question IDs
      const wrongQuestionIds = result.answers
        .filter(a => !a.is_correct)
        .map(a => a.question_id);

      if (wrongQuestionIds.length === 0) {
        toast.success('Bạn đã trả lời đúng tất cả câu hỏi!');
        return;
      }

      const session = await practiceService.createSession({
        session_type: 'custom',
        question_ids: wrongQuestionIds,
      });

      toast.success('Đã tạo bài ôn luyện!');
      navigate(`/practice/${session.id}`);
    } catch (error) {
      console.error('Failed to create practice:', error);
      toast.error('Không thể tạo bài ôn luyện');
    }
  };

  if (loading) {
    return <Loading fullScreen text="Đang tải kết quả..." />;
  }

  if (!result) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <p className="text-gray-600">Không tìm thấy kết quả</p>
          <Button onClick={() => navigate('/')} className="mt-4">
            Về trang chủ
          </Button>
        </div>
      </div>
    );
  }

  const score = result.score || 0;
  const correctCount = result.questions.filter(a => a.is_correct).length;
  const wrongCount = result.questions.filter(a => !a.is_correct).length;
  const totalQuestions = result.questions.length;
  const isPassed = score >= (result.exam?.pass_percentage || 70);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className={`${isPassed ? 'bg-gradient-to-r from-green-500 to-green-600' : 'bg-gradient-to-r from-yellow-500 to-orange-500'} text-white`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-white bg-opacity-20 rounded-full mb-4">
              <Award className="h-10 w-10" />
            </div>
            <h1 className="text-4xl font-bold mb-2">
              {isPassed ? '🎉 Chúc mừng!' : '💪 Cố gắng lên!'}
            </h1>
            <p className="text-xl opacity-90 mb-6">{result.exam?.title}</p>
            
            <div className="inline-flex items-baseline space-x-2">
              <span className="text-6xl font-bold">{score.toFixed(1)}%</span>
              {result.previous_score && (
                <div className="flex items-center text-lg">
                  <TrendingUp className="h-5 w-5 mr-1" />
                  <span>
                    {score > result.previous_score ? '+' : ''}
                    {(score - result.previous_score).toFixed(1)}%
                  </span>
                </div>
              )}
            </div>
            
            <p className="text-lg opacity-90 mt-2">
              {isPassed ? 'Bạn đã vượt qua!' : `Cần ${result.exam?.pass_percentage || 70}% để đạt`}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8 -mt-20">
          <Card className="text-center shadow-lg">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{correctCount}</p>
            <p className="text-sm text-gray-600">Câu đúng</p>
          </Card>

          <Card className="text-center shadow-lg">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <XCircle className="h-6 w-6 text-red-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{wrongCount}</p>
            <p className="text-sm text-gray-600">Câu sai</p>
          </Card>

          <Card className="text-center shadow-lg">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Target className="h-6 w-6 text-blue-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {Math.round((correctCount / totalQuestions) * 100)}%
            </p>
            <p className="text-sm text-gray-600">Tỷ lệ đúng</p>
          </Card>

          <Card className="text-center shadow-lg">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Clock className="h-6 w-6 text-purple-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {Math.floor((result.time_spent || 0) / 60)}
            </p>
            <p className="text-sm text-gray-600">Phút</p>
          </Card>
        </div>

        {/* Actions */}
        <Card className="mb-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="text-left">
                <p className="text-sm text-gray-600">Hoàn thành lúc</p>
                <p className="font-medium text-gray-900">
                  {new Date(result.completed_at).toLocaleString('vi-VN')}
                </p>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-3">
              {wrongCount > 0 && (
                <Button
                  variant="outline"
                  icon={RotateCcw}
                  onClick={handleCreatePracticeSession}
                >
                  Ôn lại câu sai
                </Button>
              )}
              <Button
                variant="outline"
                icon={Target}
                onClick={() => navigate(`/exam/${examId}/take`)}
              >
                Làm lại
              </Button>
              <Button
                icon={Home}
                onClick={() => navigate('/exams')}
              >
                Về trang đề thi
              </Button>
            </div>
          </div>
        </Card>

        {/* Performance Analysis */}
        {result.analysis && (
          <Card className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">📈 Phân tích kết quả</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* By Question Type */}
              {result.analysis.by_type && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Theo loại câu hỏi</h3>
                  <div className="space-y-3">
                    {Object.entries(result.analysis.by_type).map(([type, stats]) => (
                      <div key={type}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-600 capitalize">
                            {type === 'multiple_choice' ? 'Trắc nghiệm' :
                             type === 'true_false' ? 'Đúng/Sai' :
                             type === 'short_answer' ? 'Trả lời ngắn' : 'Tự luận'}
                          </span>
                          <span className="font-medium">
                            {stats.correct}/{stats.total} ({Math.round((stats.correct / stats.total) * 100)}%)
                          </span>
                        </div>
                        <ProgressBar
                          value={stats.correct}
                          max={stats.total}
                          showPercentage={false}
                          color={stats.correct / stats.total >= 0.7 ? 'green' : stats.correct / stats.total >= 0.5 ? 'yellow' : 'red'}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Weak Areas */}
              {result.weak_areas && result.weak_areas.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Điểm yếu cần cải thiện</h3>
                  <div className="space-y-2">
                    {result.weak_areas.map((area, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <span className="text-sm font-medium text-yellow-900">{area.topic}</span>
                        <Badge variant="warning" size="sm">
                          {area.accuracy}% đúng
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Detailed Results */}
        <Card>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">📋 Chi tiết từng câu</h2>
            <div className="space-x-2">
            </div>
          </div>

          <div className="space-y-4">
            {result.questions.map((answer, index) => (
              <QuestionResultCard
                key={answer.question_id}
                answer={answer}
                index={index + 1}
                isExpanded={expandedQuestions.has(answer.question_id)}
                onToggle={() => toggleQuestion(answer.question_id)}
              />
            ))}
          </div>
        </Card>

      </div>
    </div>
  );
};

// Question Result Card Component
const QuestionResultCard = ({ answer, index, isExpanded, onToggle }) => {
  const isCorrect = answer.is_correct;

  return (
    <div className={`border-2 rounded-lg overflow-hidden transition-all ${
      isCorrect ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
    }`}>
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-opacity-50 transition-colors"
      >
        <div className="flex items-center space-x-4 flex-1 text-left">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
            isCorrect ? 'bg-green-500' : 'bg-red-500'
          }`}>
            {isCorrect ? (
              <CheckCircle className="h-6 w-6 text-white" />
            ) : (
              <XCircle className="h-6 w-6 text-white" />
            )}
          </div>
          
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-1">
              <span className="text-sm font-medium text-gray-500">Câu {index}</span>
              <Badge variant={isCorrect ? 'success' : 'danger'} size="sm">
                {isCorrect ? 'Đúng' : 'Sai'}
              </Badge>
              <span className="text-sm text-gray-500">
                {answer.marks || 1} điểm
              </span>
            </div>
            <p className={`font-medium line-clamp-1 ${
              isCorrect ? 'text-green-900' : 'text-red-900'
            }`}>
              {answer.question_text}
            </p>
          </div>
        </div>

        {isExpanded ? (
          <ChevronUp className="h-5 w-5 text-gray-400" />
        ) : (
          <ChevronDown className="h-5 w-5 text-gray-400" />
        )}
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-gray-200">
          <div className="pt-4 space-y-4">
            {/* Question */}
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Câu hỏi:</p>
              <p className="text-gray-900">{answer.question_text}</p>
            </div>

            {/* Your Answer */}
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Câu trả lời của bạn:</p>
              <div className={`p-3 rounded-lg ${
                isCorrect ? 'bg-green-100 border border-green-300' : 'bg-red-100 border border-red-300'
              }`}>
                <p className={isCorrect ? 'text-green-900' : 'text-red-900'}>
                  {answer.user_answer || '(Không trả lời)'}
                </p>
              </div>
            </div>

            {/* Correct Answer */}
            {!isCorrect && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Đáp án đúng:</p>
                <div className="p-3 bg-green-100 border border-green-300 rounded-lg">
                  <p className="text-green-900">{answer.correct_answer}</p>
                </div>
              </div>
            )}

            {/* Explanation */}
            {answer.explanation && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm font-medium text-blue-900 mb-2">💡 Giải thích:</p>
                <p className="text-blue-800">{answer.explanation}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ExamResult;