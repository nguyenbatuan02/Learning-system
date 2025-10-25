import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft,
  Edit,
  Trash2,
  Share2,
  Clock,
  Hash,
  CheckCircle,
  XCircle,
  Copy,
  Eye,
  BarChart3,
  Download,
  Settings
} from 'lucide-react';
import { examService } from '../services/examService';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import Loading from '../components/common/Loading';
import EmptyState from '../components/common/EmptyState';
import Modal from '../components/common/Modal';
import toast from 'react-hot-toast';

const ExamDetail = () => {
  const { examId } = useParams();
  const navigate = useNavigate();

  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    loadExamDetail();
  }, [examId]);

  const loadExamDetail = async () => {
    try {
      setLoading(true);
      const data = await examService.getById(examId);
      setExam(data);
    } catch (error) {
      console.error('Failed to load exam:', error);
      toast.error('Không thể tải thông tin đề thi');
      navigate('/exams');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setDeleteLoading(true);
      await examService.delete(examId);
      toast.success('Đã xóa đề thi thành công');
      navigate('/exams');
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Không thể xóa đề thi');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handlePublish = async () => {
    try {
      await examService.publish(examId);
      toast.success('Đã xuất bản đề thi');
      loadExamDetail();
    } catch (error) {
      toast.error('Không thể xuất bản đề thi');
    }
  };

  const handleCopyLink = () => {
    const link = `${window.location.origin}/exam/${examId}/take`;
    navigator.clipboard.writeText(link);
    toast.success('Đã copy link đề thi');
  };

  const getQuestionTypeBadge = (type) => {
    const types = {
      multiple_choice: { label: 'Trắc nghiệm 1 đáp án', color: 'blue' },
      multiple_answer: { label: 'Trắc nghiệm nhiều đáp án', color: 'purple' },
      true_false: { label: 'Đúng/Sai', color: 'green' },
      short_answer: { label: 'Tự luận', color: 'orange' },
      essay: { label: 'Tự luận dài', color: 'red' },
      fill_blank: { label: 'Điền từ', color: 'pink' },
      ordering: { label: 'Sắp xếp', color: 'indigo' }
    };
    
    const config = types[type] || { label: type, color: 'gray' };
    
    return (
      <span className={`text-xs bg-${config.color}-100 text-${config.color}-800 px-2 py-1 rounded`}>
        {config.label}
      </span>
    );
  };

  if (loading) {
    return <Loading fullScreen text="Đang tải chi tiết đề thi..." />;
  }

  if (!exam) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <EmptyState
          title="Không tìm thấy đề thi"
          description="Đề thi này không tồn tại hoặc đã bị xóa"
          action={() => navigate('/exams')}
          actionLabel="Về danh sách"
        />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back Button */}
      <Link
        to="/exams"
        className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Về danh sách đề thi
      </Link>

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between mb-8">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-3">
            <h1 className="text-3xl font-bold text-gray-900">{exam.title}</h1>

          </div>
          
          {exam.description && (
            <p className="text-gray-600 mb-4">{exam.description}</p>
          )}

          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
            <span className="flex items-center">
              <Hash className="h-4 w-4 mr-1" />
              {exam.questions_count || 0} câu hỏi
            </span>
            <span>•</span>
            <span className="flex items-center">
              <Clock className="h-4 w-4 mr-1" />
              {exam.duration_minutes || 0} phút
            </span>
            <span>•</span>
            <span>{exam.total_marks} điểm</span>
            {exam.passing_marks && (
              <>
                <span>•</span>
                <span>Điểm đạt: {exam.passing_marks}</span>
              </>
            )}
          </div>

          {/* Source Bank */}
          {exam.question_banks && (
            <div className="mt-4">
              <span className="text-sm text-gray-500">Từ ngân hàng: </span>
              <Link
                to={`/question-banks/${exam.question_banks.id}`}
                className="text-sm text-blue-600 hover:underline font-medium"
              >
                {exam.question_banks.name}
              </Link>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-3 mt-4 lg:mt-0">
          {!exam.is_published && (
            <Button
              icon={CheckCircle}
              onClick={handlePublish}
            >
              Xuất bản
            </Button>
          )}
          
          <Button
            variant="outline"
            icon={Edit}
            onClick={() => navigate(`/exams/${examId}/edit`)}
          >
            Chỉnh sửa
          </Button>

          <Button
            variant="outline"
            icon={Share2}
            onClick={() => setShowShareModal(true)}
          >
            Chia sẻ
          </Button>

          <Button
            variant="danger"
            icon={Trash2}
            onClick={() => setShowDeleteModal(true)}
          >
            Xóa
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Tổng câu hỏi</p>
              <p className="text-2xl font-bold text-gray-900">
                {exam.questions_count || 0}
              </p>
            </div>
            <Hash className="h-8 w-8 text-blue-500" />
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Thời gian</p>
              <p className="text-2xl font-bold text-gray-900">
                {exam.duration_minutes || 0} phút
              </p>
            </div>
            <Clock className="h-8 w-8 text-green-500" />
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Tổng điểm</p>
              <p className="text-2xl font-bold text-gray-900">
                {exam.total_marks}
              </p>
            </div>
            <BarChart3 className="h-8 w-8 text-purple-500" />
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Trạng thái</p>
              <p className="text-2xl font-bold text-gray-900">
                {exam.is_published ? (
                  <CheckCircle className="h-8 w-8 text-green-500" />
                ) : (
                  <XCircle className="h-8 w-8 text-gray-400" />
                )}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Exam Settings */}
      <Card className="mb-8">
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          <Settings className="h-5 w-5 mr-2" />
          Cài đặt đề thi
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span className="text-sm font-medium text-gray-700">Xáo trộn câu hỏi</span>
            <Badge variant={exam.shuffle_questions ? 'success' : 'default'} size="sm">
              {exam.shuffle_questions ? 'Bật' : 'Tắt'}
            </Badge>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span className="text-sm font-medium text-gray-700">Xáo trộn đáp án</span>
            <Badge variant={exam.shuffle_options ? 'success' : 'default'} size="sm">
              {exam.shuffle_options ? 'Bật' : 'Tắt'}
            </Badge>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span className="text-sm font-medium text-gray-700">Hiện kết quả ngay</span>
            <Badge variant={exam.show_results_immediately ? 'success' : 'default'} size="sm">
              {exam.show_results_immediately ? 'Có' : 'Không'}
            </Badge>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span className="text-sm font-medium text-gray-700">Cho phép xem lại</span>
            <Badge variant={exam.allow_review ? 'success' : 'default'} size="sm">
              {exam.allow_review ? 'Có' : 'Không'}
            </Badge>
          </div>
        </div>
      </Card>

      {/* Questions List */}
      <Card>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Danh sách câu hỏi</h2>
          <span className="text-sm text-gray-500">
            {exam.questions?.length || 0} câu
          </span>
        </div>

        {exam.questions && exam.questions.length > 0 ? (
          <div className="space-y-4">
            {exam.questions.map((question, index) => (
              <QuestionCard
                key={question.id}
                question={question}
                index={index + 1}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            title="Chưa có câu hỏi"
            description="Đề thi này chưa có câu hỏi nào"
          />
        )}
      </Card>

      {/* Share Modal */}
      <Modal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        title="Chia sẻ đề thi"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Link đề thi
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={`${window.location.origin}/exam/${examId}/take`}
                readOnly
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm"
              />
              <Button
                variant="outline"
                icon={Copy}
                onClick={handleCopyLink}
              >
                Copy
              </Button>
            </div>
          </div>

          {exam.access_code && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mã truy cập
              </label>
              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                <span className="text-2xl font-bold text-blue-600 tracking-wider">
                  {exam.access_code}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(exam.access_code);
                    toast.success('Đã copy mã');
                  }}
                >
                  Copy
                </Button>
              </div>
            </div>
          )}

          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">
              💡 <strong>Hướng dẫn:</strong> Chia sẻ link hoặc mã truy cập cho học sinh. 
              Họ có thể làm bài ngay khi đề thi được xuất bản.
            </p>
          </div>
        </div>
      </Modal>

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
              onClick={handleDelete}
              loading={deleteLoading}
            >
              Xóa
            </Button>
          </div>
        }
      >
        <p className="text-gray-600">
          Bạn có chắc muốn xóa đề thi{' '}
          <strong className="text-gray-900">{exam.title}</strong>?
          <br />
          <br />
          Hành động này không thể hoàn tác. Tất cả dữ liệu liên quan sẽ bị xóa.
        </p>
      </Modal>
    </div>
  );
};

// Question Card Component
const QuestionCard = ({ question, index }) => {
  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-2">
            <span className="text-sm font-medium text-gray-500">Câu {index}</span>
            <Badge variant="primary" size="sm">
              {question.question_type?.replace('_', ' ')}
            </Badge>
            <span className="text-sm text-gray-500">{question.marks} điểm</span>
          </div>
          <p className="text-gray-900 font-medium mb-3">{question.question_text}</p>
        </div>
      </div>

      {/* Options for multiple choice */}
      {question.options && (
        <div className="space-y-2 mb-3">
          {Object.entries(question.options).map(([key, value]) => {
            // Handle both string and array correct answers
            let isCorrect = false;
            if (Array.isArray(question.correct_answer)) {
              isCorrect = question.correct_answer.includes(key);
            } else if (typeof question.correct_answer === 'string') {
              isCorrect = question.correct_answer === key;
            }

            return (
              <div
                key={key}
                className={`flex items-start space-x-2 text-sm p-2 rounded ${
                  isCorrect
                    ? 'bg-green-50 text-green-700 font-medium'
                    : 'text-gray-600'
                }`}
              >
                {isCorrect && (
                  <CheckCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                )}
                <span>
                  {key}) {value}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* For non-multiple choice */}
      {!question.options && question.correct_answer && (
        <div className="text-sm text-gray-600 mb-3 p-3 bg-green-50 rounded">
          <span className="font-medium text-green-900">Đáp án: </span>
          <span className="text-gray-700">
            {Array.isArray(question.correct_answer)
              ? question.correct_answer.join(' → ')
              : question.correct_answer}
          </span>
        </div>
      )}

      {/* Explanation */}
      {question.explanation && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
          <p className="font-medium text-blue-900 mb-1">Giải thích:</p>
          <p className="text-blue-800">{question.explanation}</p>
        </div>
      )}
    </div>
  );
};

export default ExamDetail;