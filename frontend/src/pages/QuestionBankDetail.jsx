import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft,
  Plus,
  Edit,
  Trash2,
  Search,
  Filter,
  ChevronDown,
  CheckCircle,
  Target,
  Share2,
  Download
} from 'lucide-react';
import { questionBankService } from '../services/questionBankService';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Select from '../components/common/Select';
import Badge from '../components/common/Badge';
import Loading from '../components/common/Loading';
import EmptyState from '../components/common/EmptyState';
import Modal from '../components/common/Modal';
import toast from 'react-hot-toast';

const QuestionBankDetail = () => {
  const { bankId } = useParams();
  const navigate = useNavigate();

  const [bank, setBank] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    loadBankDetail();
  }, [bankId]);

  const loadBankDetail = async () => {
    try {
      setLoading(true);
      const [bankData, questionsData] = await Promise.all([
        questionBankService.getById(bankId),
        questionBankService.getQuestions(bankId)
      ]);
      
      setBank(bankData);
      setQuestions(questionsData);
    } catch (error) {
      console.error('Failed to load bank detail:', error);
      toast.error('Không thể tải thông tin ngân hàng đề');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteQuestion = async () => {
    if (!selectedQuestion) return;

    try {
      setDeleteLoading(true);
      await questionBankService.deleteQuestion(bankId, selectedQuestion.id);
      toast.success('Đã xóa câu hỏi thành công');
      setShowDeleteModal(false);
      setSelectedQuestion(null);
      loadBankDetail();
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Không thể xóa câu hỏi');
    } finally {
      setDeleteLoading(false);
    }
  };

  const filteredQuestions = questions.filter(q => {
    const matchSearch = q.question_text.toLowerCase().includes(searchTerm.toLowerCase());
    const matchType = !filterType || q.question_type === filterType;
    const matchDifficulty = !filterDifficulty || q.difficulty === filterDifficulty;
    return matchSearch && matchType && matchDifficulty;
  });

  // Group questions by type
  const questionsByType = filteredQuestions.reduce((acc, q) => {
    if (!acc[q.question_type]) {
      acc[q.question_type] = [];
    }
    acc[q.question_type].push(q);
    return acc;
  }, {});

  if (loading) {
    return <Loading fullScreen text="Đang tải chi tiết..." />;
  }

  if (!bank) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <EmptyState
          title="Không tìm thấy ngân hàng đề"
          description="Ngân hàng đề này không tồn tại hoặc đã bị xóa"
          action={() => navigate('/question-banks')}
          actionLabel="Về danh sách"
        />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back Button */}
      <Link
        to="/question-banks"
        className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Về ngân hàng đề
      </Link>

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between mb-8">
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{bank.name}</h1>
          {bank.description && (
            <p className="text-gray-600 mb-4">{bank.description}</p>
          )}
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
            <span>{questions.length} câu hỏi</span>
            <span>•</span>
            <span>Tạo ngày {new Date(bank.created_at).toLocaleDateString('vi-VN')}</span>
            <span>•</span>
            <Badge variant={bank.is_public ? 'success' : 'default'}>
              {bank.is_public ? 'Công khai' : 'Riêng tư'}
            </Badge>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-3 mt-4 lg:mt-0">
          <Button
            variant="outline"
            icon={Plus}
            onClick={() => navigate(`/question-banks/${bankId}/add-question`)}
          >
            Thêm câu hỏi
          </Button>
          <Button
            variant="outline"
            icon={Share2}
            onClick={() => toast.success('Tính năng chia sẻ sẽ sớm có!')}
          >
            Chia sẻ
          </Button>
          <Button
            icon={Target}
            onClick={() => navigate(`/create-exam/${bankId}`)}
          >
            Tạo đề thi
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            placeholder="Tìm kiếm câu hỏi..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            leftIcon={Search}
          />
          <Select
            placeholder="Tất cả loại câu"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            options={[
              { value: '', label: 'Tất cả loại câu' },
              { value: 'multiple_choice', label: 'Trắc nghiệm' },
              { value: 'true_false', label: 'Đúng/Sai' },
              { value: 'short_answer', label: 'Trả lời ngắn' },
              { value: 'essay', label: 'Tự luận' },
            ]}
          />
          <Select
            placeholder="Tất cả độ khó"
            value={filterDifficulty}
            onChange={(e) => setFilterDifficulty(e.target.value)}
            options={[
              { value: '', label: 'Tất cả độ khó' },
              { value: 'easy', label: 'Dễ' },
              { value: 'medium', label: 'Trung bình' },
              { value: 'hard', label: 'Khó' },
            ]}
          />
        </div>
      </Card>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <p className="text-sm text-gray-600 mb-1">Trắc nghiệm</p>
          <p className="text-2xl font-bold text-gray-900">
            {questionsByType['multiple_choice']?.length || 0}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-gray-600 mb-1">Đúng/Sai</p>
          <p className="text-2xl font-bold text-gray-900">
            {questionsByType['true_false']?.length || 0}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-gray-600 mb-1">Trả lời ngắn</p>
          <p className="text-2xl font-bold text-gray-900">
            {questionsByType['short_answer']?.length || 0}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-gray-600 mb-1">Tự luận</p>
          <p className="text-2xl font-bold text-gray-900">
            {questionsByType['essay']?.length || 0}
          </p>
        </Card>
      </div>

      {/* Questions List */}
      {filteredQuestions.length > 0 ? (
        <div className="space-y-4">
          {filteredQuestions.map((question, index) => (
            <QuestionCard
              key={question.id}
              question={question}
              index={index + 1}
              onEdit={() => navigate(`/question-banks/${bankId}/edit-question/${question.id}`)}
              onDelete={() => {
                setSelectedQuestion(question);
                setShowDeleteModal(true);
              }}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          title={searchTerm ? 'Không tìm thấy câu hỏi' : 'Chưa có câu hỏi nào'}
          description={
            searchTerm
              ? 'Thử tìm kiếm với từ khóa khác'
              : 'Hãy thêm câu hỏi vào ngân hàng này'
          }
          action={() => navigate(`/question-banks/${bankId}/add-question`)}
          actionLabel="Thêm câu hỏi"
        />
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Xác nhận xóa"
        footer={
          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={() => setShowDeleteModal(false)}
            >
              Hủy
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteQuestion}
              loading={deleteLoading}
            >
              Xóa
            </Button>
          </div>
        }
      >
        <p className="text-gray-600">
          Bạn có chắc muốn xóa câu hỏi này?
          <br />
          <br />
          Hành động này không thể hoàn tác.
        </p>
      </Modal>
    </div>
  );
};

// Question Card Component
const QuestionCard = ({ question, index, onEdit, onDelete }) => {
  const getTypeLabel = (type) => {
    const labels = {
      multiple_choice: 'Trắc nghiệm',
      true_false: 'Đúng/Sai',
      short_answer: 'Trả lời ngắn',
      essay: 'Tự luận',
    };
    return labels[type] || type;
  };

  const getDifficultyColor = (difficulty) => {
    const colors = {
      easy: 'success',
      medium: 'warning',
      hard: 'danger',
    };
    return colors[difficulty] || 'default';
  };

  return (
    <Card>
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-2">
            <span className="text-sm font-medium text-gray-500">Câu {index}</span>
            <Badge variant="primary" size="sm">
              {getTypeLabel(question.question_type)}
            </Badge>
            {question.difficulty && (
              <Badge variant={getDifficultyColor(question.difficulty)} size="sm">
                {question.difficulty === 'easy' ? 'Dễ' : question.difficulty === 'medium' ? 'TB' : 'Khó'}
              </Badge>
            )}
            <span className="text-sm text-gray-500">{question.marks} điểm</span>
          </div>
          <p className="text-gray-900 font-medium mb-3">{question.question_text}</p>
          
          {/* Options for multiple choice */}
          {question.question_type === 'multiple_choice' && question.options && (
            <div className="space-y-2 mb-3">
              {Object.entries(question.options).map(([key, value]) => (
                <div
                  key={key}
                  className={`flex items-start space-x-2 text-sm ${
                    question.correct_answer === key
                      ? 'text-green-700 font-medium'
                      : 'text-gray-600'
                  }`}
                >
                  {question.correct_answer === key && (
                    <CheckCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  )}
                  <span>
                    {key}) {value}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Correct answer for other types */}
          {question.question_type !== 'multiple_choice' && (
            <div className="text-sm text-gray-600 mb-3">
              <span className="font-medium">Đáp án: </span>
              {question.correct_answer}
            </div>
          )}

          {/* Explanation */}
          {question.explanation && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
              <p className="font-medium text-blue-900 mb-1">Giải thích:</p>
              <p className="text-blue-800">{question.explanation}</p>
            </div>
          )}

          {/* Tags */}
          {question.tags && question.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {question.tags.map((tag, idx) => (
                <Badge key={idx} variant="default" size="sm">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex space-x-2 ml-4">
          <button
            onClick={onEdit}
            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Chỉnh sửa"
          >
            <Edit className="h-4 w-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Xóa"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center space-x-4 text-xs text-gray-500 pt-3 border-t">
        <span>Đã dùng: {question.times_used || 0} lần</span>
        {question.times_used > 0 && (
          <>
            <span>•</span>
            <span>
              Tỷ lệ đúng: {
                question.times_used > 0
                  ? Math.round((question.times_correct / question.times_used) * 100)
                  : 0
              }%
            </span>
          </>
        )}
      </div>
    </Card>
  );
};

export default QuestionBankDetail;