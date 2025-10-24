import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Target,
  TrendingDown,
  Shuffle,
  Settings,
  BookOpen,
  Clock,
  CheckCircle,
  Play,
  BarChart3,
  AlertCircle
} from 'lucide-react';
import { practiceService } from '../services/practiceService';
import { statisticsService } from '../services/statisticsService';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import Loading from '../components/common/Loading';
import EmptyState from '../components/common/EmptyState';
import Modal from '../components/common/Modal';
import Input from '../components/common/Input';
import Select from '../components/common/Select';
import toast from 'react-hot-toast';

const Practice = () => {
  const navigate = useNavigate();

  const [suggestions, setSuggestions] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [weakAreas, setWeakAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [creating, setCreating] = useState(false);

  // Custom practice form
  const [customForm, setCustomForm] = useState({
    questionBankIds: [],
    numQuestions: 10,
    categories: [],
    difficulty: '',
  });

  useEffect(() => {
    loadPracticeData();
  }, []);

  const loadPracticeData = async () => {
    try {
      setLoading(true);
      
      // Load suggestions (required)
      const suggestionsData = await practiceService.getSuggestions();
      setSuggestions(suggestionsData);

      // Load sessions (optional, can fail gracefully)
      const sessionsData = await practiceService.getSessions();
      setSessions(Array.isArray(sessionsData) ? sessionsData : []);

      // Load weak areas (optional)
      try {
        const weakAreasData = await statisticsService.getWeakAreas();
        setWeakAreas(Array.isArray(weakAreasData) ? weakAreasData : []);
      } catch (error) {
        console.warn('No weak areas:', error);
        setWeakAreas([]);
      }
      
    } catch (error) {
      console.error('Failed to load practice data:', error);
      toast.error('Không thể tải dữ liệu ôn luyện');
    } finally {
      setLoading(false);
    }
  };

  const handleStartPractice = async (type) => {
    try {
      toast.loading('Đang tạo bài ôn luyện...', { id: 'create-practice' });
      
      const session = await practiceService.createSession({
        session_type: type,
        num_questions: 15 // Default number of questions
      });
      
      toast.success('Đã tạo bài ôn luyện!', { id: 'create-practice' });
      navigate(`/practice/${session.id}`);
    } catch (error) {
      console.error('Failed to create practice:', error);
      toast.error(error.response?.data?.detail || 'Không thể tạo bài ôn luyện', { 
        id: 'create-practice' 
      });
    }
  };

  const handleCustomPractice = async () => {
    try {
      setCreating(true);
      
      // Validate
      if (customForm.questionBankIds.length === 0) {
        toast.error('Vui lòng chọn ít nhất 1 ngân hàng đề');
        return;
      }

      const session = await practiceService.createSession({
        session_type: 'custom',
        question_ids: customForm.questionBankIds,
        num_questions: customForm.numQuestions,
        categories: customForm.categories,
        difficulty: customForm.difficulty,
      });
      
      toast.success('Đã tạo bài ôn luyện!');
      setShowCustomModal(false);
      navigate(`/practice/${session.id}`);
    } catch (error) {
      console.error('Failed to create custom practice:', error);
      toast.error('Không thể tạo bài ôn luyện');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return <Loading fullScreen text="Đang tải..." />;
  }

  const wrongAnswersCount = suggestions?.suggestions?.find(s => s.type === 'wrong_answers')?.count || 0;
  const weakTopicsCount = suggestions?.suggestions?.find(s => s.type === 'weak_topics')?.categories?.length || 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">💪 Ôn Luyện</h1>
        <p className="text-gray-600 mt-2">Luyện tập để cải thiện kết quả của bạn</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Suggestions */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">💡 Gợi ý cho bạn</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Wrong Answers */}
              <Card 
                className={`bg-gradient-to-br from-red-50 to-red-100 border-red-200 hover:shadow-lg transition-shadow ${
                  wrongAnswersCount > 0 ? 'cursor-pointer' : 'opacity-60'
                }`}
                onClick={() => wrongAnswersCount > 0 && handleStartPractice('wrong_answers')}
              >
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <TrendingDown className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-red-900 mb-2">Ôn lại câu sai</h3>
                    <p className="text-sm text-red-800 mb-4">
                      {wrongAnswersCount > 0 ? (
                        <>Bạn có <strong>{wrongAnswersCount} câu</strong> cần ôn lại</>
                      ) : (
                        'Chưa có câu sai nào'
                      )}
                    </p>
                    {wrongAnswersCount > 0 && (
                      <Button size="sm" variant="danger">
                        Bắt đầu →
                      </Button>
                    )}
                  </div>
                </div>
              </Card>

              {/* Weak Topics */}
              <Card 
                className={`bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200 hover:shadow-lg transition-shadow ${
                  weakTopicsCount > 0 ? 'cursor-pointer' : 'opacity-60'
                }`}
                onClick={() => weakTopicsCount > 0 && handleStartPractice('weak_topics')}
              >
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-yellow-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <Target className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-yellow-900 mb-2">Luyện điểm yếu</h3>
                    <p className="text-sm text-yellow-800 mb-4">
                      {weakTopicsCount > 0 ? (
                        <>Tập trung vào <strong>{weakTopicsCount} loại câu</strong> cần cải thiện</>
                      ) : (
                        'Chưa phát hiện điểm yếu'
                      )}
                    </p>
                    {weakTopicsCount > 0 && (
                      <Button size="sm" className="bg-yellow-600 hover:bg-yellow-700">
                        Bắt đầu →
                      </Button>
                    )}
                  </div>
                </div>
              </Card>

            </div>
          </div>

          {/* Weak Areas Detail */}
          {weakAreas.length > 0 && (
            <Card>
              <h2 className="text-xl font-bold text-gray-900 mb-4">📊 Phân tích điểm yếu</h2>
              <div className="space-y-3">
                {weakAreas.slice(0, 5).map((area, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 line-clamp-2">
                        {area.question_text}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        {area.times_correct}/{area.times_attempted} câu đúng ({area.accuracy}%)
                      </p>
                    </div>
                    <div className="flex items-center space-x-4 ml-4">
                      <div className="text-right">
                        <div className={`text-2xl font-bold ${
                          area.accuracy < 50 ? 'text-red-600' :
                          area.accuracy < 70 ? 'text-yellow-600' :
                          'text-green-600'
                        }`}>
                          {area.accuracy}%
                        </div>
                        <p className="text-xs text-gray-500">Độ chính xác</p>
                      </div>
                      <Badge 
                        variant={
                          area.accuracy < 50 ? 'danger' :
                          area.accuracy < 70 ? 'warning' :
                          'success'
                        } 
                        size="sm"
                      >
                        {area.accuracy < 50 ? 'Rất yếu' :
                         area.accuracy < 70 ? 'Cần cải thiện' :
                         'Khá tốt'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
              {weakAreas.length > 5 && (
                <Button 
                  variant="ghost" 
                  className="w-full mt-4"
                  onClick={() => navigate('/statistics')}
                >
                  Xem tất cả {weakAreas.length} câu yếu →
                </Button>
              )}
            </Card>
          )}

          {/* Practice History */}
          <Card>
            
            {sessions.length > 0 ? (
              <div className="space-y-3">
                {sessions.slice(0, 5).map((session) => (
                  <PracticeSessionCard
                    key={session.id}
                    session={session}
                    onClick={() => navigate(`/practice/${session.id}`)}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={BookOpen}
                title="Chưa có lịch sử ôn luyện"
                description="Bắt đầu ôn luyện để cải thiện kết quả"
                action={() => handleStartPractice('weak_topics')}
                actionLabel="Bắt đầu ôn luyện"
              />
            )}
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Stats */}
          <Card>
            <h2 className="text-lg font-bold text-gray-900 mb-4">📈 Thống kê</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Câu sai</span>
                <span className="text-lg font-bold text-red-600">{wrongAnswersCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Loại câu yếu</span>
                <span className="text-lg font-bold text-yellow-600">{weakTopicsCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Đã ôn luyện</span>
                <span className="text-lg font-bold text-green-600">{sessions.length}</span>
              </div>
            </div>
          </Card>

          {/* Tips */}
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                <AlertCircle className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-blue-900 mb-1">💡 Mẹo học tập</h3>
                <p className="text-sm text-blue-800">
                  Ôn luyện đều đặn 15-20 phút mỗi ngày sẽ giúp bạn ghi nhớ tốt hơn!
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Custom Practice Modal */}
      <Modal
        isOpen={showCustomModal}
        onClose={() => setShowCustomModal(false)}
        title="🎯 Tạo bài ôn luyện tùy chỉnh"
        size="lg"
        footer={
          <div className="flex justify-end space-x-3">
            <Button variant="outline" onClick={() => setShowCustomModal(false)}>
              Hủy
            </Button>
            <Button onClick={handleCustomPractice} loading={creating}>
              Tạo bài ôn luyện
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input
            label="Số câu hỏi"
            type="number"
            value={customForm.numQuestions}
            onChange={(e) => setCustomForm({ ...customForm, numQuestions: parseInt(e.target.value) || 10 })}
            min="1"
            max="50"
            helperText="Từ 1 đến 50 câu"
          />

          <Select
            label="Độ khó"
            value={customForm.difficulty}
            onChange={(e) => setCustomForm({ ...customForm, difficulty: e.target.value })}
            options={[
              { value: '', label: 'Tất cả' },
              { value: 'easy', label: 'Dễ' },
              { value: 'medium', label: 'Trung bình' },
              { value: 'hard', label: 'Khó' },
            ]}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Chọn ngân hàng đề
            </label>
            <div className="text-sm text-gray-500 mb-2">
              Vui lòng chọn từ danh sách ngân hàng đề của bạn
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setShowCustomModal(false);
                navigate('/question-banks');
              }}
            >
              Chọn ngân hàng đề →
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

// Practice Session Card Component
const PracticeSessionCard = ({ session, onClick }) => {
  const getSessionTypeLabel = (type) => {
    const labels = {
      wrong_answers: '❌ Ôn câu sai',
      weak_topics: '🎯 Luyện điểm yếu',
      custom: '⚙️ Tùy chỉnh',
      random: '🎲 Ngẫu nhiên'
    };
    return labels[type] || type;
  };

  const getStatusBadge = (status) => {
    if (status === 'completed') {
      return <Badge variant="success">✓ Hoàn thành</Badge>;
    }
    return <Badge variant="warning">⏳ Đang làm</Badge>;
  };

  const progress = session.completed_question_ids?.length || 0;
  const total = session.question_ids?.length || 0;
  const percentage = total > 0 ? Math.round((progress / total) * 100) : 0;

  return (
    <div
      onClick={onClick}
      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all cursor-pointer group"
    >
      <div className="flex-1">
        <div className="flex items-center space-x-3 mb-2">
          <h3 className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
            {getSessionTypeLabel(session.session_type)}
          </h3>
          {getStatusBadge(session.status)}
        </div>
        
        <div className="flex items-center space-x-4 text-sm text-gray-500">
          <span className="flex items-center">
            <BookOpen className="h-4 w-4 mr-1" />
            {total} câu
          </span>
          <span>•</span>
          <span>{progress}/{total} hoàn thành</span>
          <span>•</span>
          <span>{new Date(session.started_at).toLocaleDateString('vi-VN')}</span>
        </div>

        {session.status === 'in_progress' && total > 0 && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
              <span>Tiến độ</span>
              <span>{percentage}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        )}
      </div>

      <Button
        size="sm"
        variant={session.status === 'completed' ? 'outline' : 'primary'}
        icon={session.status === 'completed' ? CheckCircle : Play}
        className="ml-4"
      >
        {session.status === 'completed' ? 'Xem lại' : 'Tiếp tục'}
      </Button>
    </div>
  );
};

export default Practice;