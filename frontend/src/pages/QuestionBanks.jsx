import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BookOpen, 
  Plus, 
  Search, 
  Filter,
  Globe,
  Lock,
  Eye,
  Edit,
  Trash2,
  Share2,
  MoreVertical,
  Target
} from 'lucide-react';
import { questionBankService } from '../services/questionBankService';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Badge from '../components/common/Badge';
import Loading from '../components/common/Loading';
import EmptyState from '../components/common/EmptyState';
import Modal from '../components/common/Modal';
import toast from 'react-hot-toast';

// Import React Query
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Query key
const QUESTION_BANKS_KEY = 'questionBanks';

const QuestionBanks = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all'); // all, mine, public
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedBank, setSelectedBank] = useState(null);

  // React Query - Fetch question banks
  const { data: banks = [], isLoading } = useQuery({
    queryKey: [QUESTION_BANKS_KEY, filterType],
    queryFn: async () => {
      const params = {};
      if (filterType === 'public') {
        params.is_public = true;
      }
      return await questionBankService.getAll(params);
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // React Query - Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (bankId) => questionBankService.delete(bankId),
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: [QUESTION_BANKS_KEY] });
      toast.success('Đã xóa ngân hàng đề thành công');
      setShowDeleteModal(false);
      setSelectedBank(null);
    },
    onError: (error) => {
      console.error('Delete error:', error);
      toast.error('Không thể xóa ngân hàng đề');
    },
  });

  const handleDelete = () => {
    if (selectedBank) {
      deleteMutation.mutate(selectedBank.id);
    }
  };

  // Client-side filtering
  const filteredBanks = banks.filter(bank => {
    const matchesSearch = 
      bank.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bank.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Additional filter for "mine"
    if (filterType === 'mine') {
      // Assuming there's a way to identify user's banks
      // You might need to add owner_id or is_owner field
      return matchesSearch; // Add your logic here
    }
    
    return matchesSearch;
  });

  if (isLoading) {
    return <Loading fullScreen text="Đang tải ngân hàng đề..." />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">📚 Ngân Hàng Đề</h1>
          <p className="text-gray-600 mt-2">Quản lý và tổ chức câu hỏi của bạn</p>
        </div>
        <Button
          icon={Plus}
          onClick={() => navigate('/upload')}
          className="mt-4 sm:mt-0"
        >
          Tạo ngân hàng mới
        </Button>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          {/* Search */}
          <div className="flex-1 max-w-md">
            <Input
              placeholder="Tìm kiếm ngân hàng..."
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
              onClick={() => setFilterType('mine')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                filterType === 'mine'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Của tôi
            </button>
            <button
              onClick={() => setFilterType('public')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                filterType === 'public'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Công khai
            </button>
          </div>
        </div>
      </Card>

      {/* Question Banks List */}
      {filteredBanks.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBanks.map((bank) => (
            <QuestionBankCard
              key={bank.id}
              bank={bank}
              onView={() => navigate(`/question-banks/${bank.id}`)}
              onEdit={() => navigate(`/question-banks/${bank.id}`)}
              onDelete={() => {
                setSelectedBank(bank);
                setShowDeleteModal(true);
              }}
              onCreateExam={() => navigate(`/question-banks/${bank.id}/create-exam`)}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={BookOpen}
          title={searchTerm ? 'Không tìm thấy kết quả' : 'Chưa có ngân hàng đề nào'}
          description={
            searchTerm
              ? 'Thử tìm kiếm với từ khóa khác'
              : 'Hãy tạo ngân hàng đề đầu tiên của bạn'
          }
          action={() => navigate('/upload')}
          actionLabel="Tạo ngân hàng mới"
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
              loading={deleteMutation.isPending}
            >
              Xóa
            </Button>
          </div>
        }
      >
        <p className="text-gray-600">
          Bạn có chắc muốn xóa ngân hàng đề{' '}
          <strong className="text-gray-900">{selectedBank?.name}</strong>?
          <br />
          <br />
          Hành động này không thể hoàn tác và sẽ xóa tất cả{' '}
          <strong>{selectedBank?.items_count || 0} câu hỏi</strong> trong ngân hàng này.
        </p>
      </Modal>
    </div>
  );
};

// Question Bank Card Component
const QuestionBankCard = ({ bank, onView, onEdit, onDelete, onShare, onCreateExam }) => {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <Card hover className="relative">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <h3 className="font-semibold text-gray-900 text-lg line-clamp-1">
              {bank.name}
            </h3>
            {bank.is_public ? (
              <Globe className="h-4 w-4 text-blue-600" />
            ) : (
              <Lock className="h-4 w-4 text-gray-400" />
            )}
          </div>
          {bank.description && (
            <p className="text-sm text-gray-600 line-clamp-2 mb-3">
              {bank.description}
            </p>
          )}
        </div>
        {/* Delete Button */}
        <button
          onClick={onDelete}
          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          title="Xóa ngân hàng đề"
        >
          <Trash2 className="h-5 w-5" />
        </button>
      </div>

      {/* Stats */}
      <div className="flex items-center space-x-4 text-sm text-gray-500 mb-4">
        <span>
          Ngày tạo: {new Date(bank.created_at).toLocaleDateString('vi-VN')}
        </span>
      </div>

      {/* Tags */}
      {bank.tags && bank.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {bank.tags.slice(0, 3).map((tag, index) => (
            <Badge key={index} variant="primary" size="sm">
              {tag}
            </Badge>
          ))}
          {bank.tags.length > 3 && (
            <Badge variant="default" size="sm">
              +{bank.tags.length - 3}
            </Badge>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex space-x-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={onView}
        >
          Xem chi tiết
        </Button>
        <Button
          size="sm"
          className="flex-1"
          icon={Target}
          onClick={onCreateExam}
        >
          Tạo đề thi
        </Button>
      </div>
    </Card>
  );
};

export default QuestionBanks;