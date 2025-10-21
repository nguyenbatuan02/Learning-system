import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  FileText, 
  Plus, 
  Search,
  Clock,
  Hash,
  Eye,
  Edit,
  Trash2,
  Share2,
  MoreVertical,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { examService } from '../services/examService';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Badge from '../components/common/Badge';
import Loading from '../components/common/Loading';
import EmptyState from '../components/common/EmptyState';
import Modal from '../components/common/Modal';
import toast from 'react-hot-toast';

const Exams = () => {
  const navigate = useNavigate();

  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all'); // all, published, draft
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedExam, setSelectedExam] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    loadExams();
  }, [filterType]);

  const loadExams = async () => {
    try {
      setLoading(true);
      const params = {};
      
      if (filterType === 'published') {
        params.is_published = true;
      } else if (filterType === 'draft') {
        params.is_published = false;
      }

      const data = await examService.getAll(params);
      setExams(data);
    } catch (error) {
      console.error('Failed to load exams:', error);
      toast.error('Không thể tải danh sách đề thi');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedExam) return;

    try {
      setDeleteLoading(true);
      await examService.delete(selectedExam.id);
      toast.success('Đã xóa đề thi thành công');
      setShowDeleteModal(false);
      setSelectedExam(null);
      loadExams();
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Không thể xóa đề thi');
    } finally {
      setDeleteLoading(false);
    }
  };

  const filteredExams = exams.filter(exam => 
    exam.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    exam.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <Loading fullScreen text="Đang tải đề thi..." />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">📝 Đề Thi</h1>
          <p className="text-gray-600 mt-2">Quản lý các đề thi của bạn</p>
        </div>
        <Button
          icon={Plus}
          onClick={() => navigate('/question-banks')}
          className="mt-4 sm:mt-0"
        >
          Tạo đề thi mới
        </Button>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          {/* Search */}
          <div className="flex-1 max-w-md">
            <Input
              placeholder="Tìm kiếm đề thi..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              leftIcon={Search}
            />
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center space-x-2 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setFilterType('all')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                filterType === 'all'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Tất cả
            </button>
            <button
              onClick={() => setFilterType('published')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                filterType === 'published'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Bản chính
            </button>
            <button
              onClick={() => setFilterType('draft')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                filterType === 'draft'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Bản nháp
            </button>
          </div>
        </div>
      </Card>

      {/* Exams List */}
      {filteredExams.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredExams.map((exam) => (
            <ExamCard
              key={exam.id}
              exam={exam}
              onView={() => navigate(`/exams/${exam.id}`)}
              onEdit={() => navigate(`/exams/${exam.id}/edit`)}
              onTake={() => navigate(`/exam/${exam.id}/take`)}
              onDelete={() => {
                setSelectedExam(exam);
                setShowDeleteModal(true);
              }}
              onPublish={async () => {
                try {
                  await examService.publish(exam.id);
                  toast.success('Đã xuất bản đề thi');
                  loadExams();
                } catch (error) {
                  toast.error('Không thể xuất bản đề thi');
                }
              }}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={FileText}
          title={searchTerm ? 'Không tìm thấy kết quả' : 'Chưa có đề thi nào'}
          description={
            searchTerm
              ? 'Thử tìm kiếm với từ khóa khác'
              : 'Hãy tạo đề thi đầu tiên từ ngân hàng câu hỏi'
          }
          action={() => navigate('/question-banks')}
          actionLabel="Tạo đề thi"
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
          <strong className="text-gray-900">{selectedExam?.title}</strong>?
          <br />
          <br />
          Hành động này không thể hoàn tác.
        </p>
      </Modal>
    </div>
  );
};

// Exam Card Component
const ExamCard = ({ exam, onView, onEdit, onDelete, onTake, onPublish }) => {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <Card hover className="relative">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <h3 className="font-semibold text-gray-900 text-lg line-clamp-1">
              {exam.title}
            </h3>
            {exam.is_published ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <XCircle className="h-4 w-4 text-gray-400" />
            )}
          </div>
          {exam.description && (
            <p className="text-sm text-gray-600 line-clamp-2 mb-3">
              {exam.description}
            </p>
          )}
        </div>

        {/* Menu */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <MoreVertical className="h-5 w-5 text-gray-400" />
          </button>

          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                <button
                  onClick={() => {
                    onView();
                    setShowMenu(false);
                  }}
                  className="w-full flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Eye className="h-4 w-4" />
                  <span>Xem chi tiết</span>
                </button>
                <button
                  onClick={() => {
                    onEdit();
                    setShowMenu(false);
                  }}
                  className="w-full flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Edit className="h-4 w-4" />
                  <span>Chỉnh sửa</span>
                </button>
                {!exam.is_published && (
                  <button
                    onClick={() => {
                      onPublish();
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <Share2 className="h-4 w-4" />
                    <span>Bản chính</span>
                  </button>
                )}
                <hr className="my-1" />
                <button
                  onClick={() => {
                    onDelete();
                    setShowMenu(false);
                  }}
                  className="w-full flex items-center space-x-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Xóa</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center space-x-4 text-sm text-gray-500 mb-4">
        <span className="flex items-center">
          <Hash className="h-4 w-4 mr-1" />
          {exam.questions_count || 0} câu
        </span>
        <span>•</span>
        <span className="flex items-center">
          <Clock className="h-4 w-4 mr-1" />
          {exam.duration_minutes || 0} phút
        </span>
      </div>

      {/* Source Bank */}
      {exam.question_banks && (
        <div className="mb-4">
          <Badge variant="primary" size="sm">
            {exam.question_banks.name}
          </Badge>
        </div>
      )}

      {/* Status */}
      <Badge variant={exam.is_published ? 'success' : 'default'} size="sm">
        {exam.is_published ? 'Bản chính' : 'Bản nháp'}
      </Badge>

      {/* Actions */}
      <div className="flex space-x-2 mt-4">
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={onView}
        >
          Xem chi tiết
        </Button>
        <Button
          variant="primary"
          size="sm"
          className="flex-1"
          onClick={onTake}
        >
            Làm bài
        </Button>
      </div>
    </Card>
  );
};

export default Exams;