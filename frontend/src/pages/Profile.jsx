import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { 
  User,
  Mail,
  Calendar,
  Award,
  TrendingUp,
  Target,
  Clock,
  Edit,
  Lock,
  Bell,
  LogOut,
  Flame,
  BarChart3,
  BookOpen,
  CheckCircle,
  ChevronRight,
  X
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { authService } from '../services/authService';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Badge from '../components/common/Badge';
import Loading from '../components/common/Loading';
import Modal from '../components/common/Modal';
import Alert from '../components/common/Alert';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import toast from 'react-hot-toast';

// Import React Query hooks
import { 
  useStats, 
  useHistory, 
  useChartData, 
  useQuestionTypes 
} from '../hooks/useQueries';

const Profile = () => {
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('overview');
  
  // React Query hooks
  const { data: stats, isLoading: statsLoading } = useStats();
  const { data: history = [], isLoading: historyLoading } = useHistory(10);
  const { data: chartData = [], isLoading: chartLoading } = useChartData(30);
  const { data: questionTypeStats = [], isLoading: typeStatsLoading } = useQuestionTypes();
  
  // Edit Profile Modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    full_name: '',
    email: '',
  });
  const [editLoading, setEditLoading] = useState(false);

  // Change Password Modal
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordLoading, setPasswordLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setEditForm({
        full_name: user.full_name || '',
        email: user.email || '',
      });
    }
  }, [user]);

  const handleEditProfile = async () => {
    try {
      setEditLoading(true);
      
      if (!editForm.full_name.trim()) {
        toast.error('Vui lòng nhập họ tên');
        return;
      }

      const updatedUser = await authService.updateProfile({
        full_name: editForm.full_name,
      });

      const { data: authData, error: authError } = await supabase.auth.updateUser({
        data: {
          full_name: editForm.full_name
        }
      });
    
      if (authError) {
        console.error('❌ [3] Auth update error:', authError);
        throw authError;
      }

      updateUser(updatedUser);
      toast.success('Cập nhật thông tin thành công!');
      setShowEditModal(false);
    } catch (error) {
      console.error('Failed to update profile:', error);
      toast.error('Không thể cập nhật thông tin');
    } finally {
      setEditLoading(false);
    }
  };

  const handleChangePassword = async () => {
    try {
      setPasswordLoading(true);

      // Validation
      if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
        toast.error('Vui lòng nhập đầy đủ thông tin');
        return;
      }

      if (passwordForm.newPassword.length < 6) {
        toast.error('Mật khẩu mới phải có ít nhất 6 ký tự');
        return;
      }

      if (passwordForm.newPassword !== passwordForm.confirmPassword) {
        toast.error('Mật khẩu xác nhận không khớp');
        return;
      }

      // Call API to change password
      await authService.changePassword(passwordForm);
      
      toast.success('Đổi mật khẩu thành công!');
      setShowPasswordModal(false);
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error) {
      console.error('Failed to change password:', error);
      toast.error('Không thể đổi mật khẩu');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Determine loading state based on active tab
  const isLoading = () => {
    if (activeTab === 'overview') return statsLoading || chartLoading;
    if (activeTab === 'statistics') return statsLoading || chartLoading || typeStatsLoading;
    if (activeTab === 'history') return historyLoading;
    return false;
  };

  if (isLoading()) {
    return <Loading fullScreen text="Đang tải hồ sơ..." />;
  }

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-6">
            {/* Avatar */}
            <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-lg">
              {user?.full_name?.[0]?.toUpperCase() || 'U'}
            </div>
            
            {/* User Info */}
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{user?.full_name || 'User'}</h1>
              <p className="text-gray-600 mt-1 flex items-center">
                <Mail className="h-4 w-4 mr-2" />
                {user?.email}
              </p>
              <p className="text-gray-600 mt-1 flex items-center">
                <Calendar className="h-4 w-4 mr-2" />
                Tham gia: {new Date(user?.created_at).toLocaleDateString('vi-VN')}
              </p>
              <div className="flex items-center space-x-2 mt-2">
                <Badge variant={user?.role === 'admin' ? 'danger' : 'primary'}>
                  {user?.role === 'admin' ? '👑 Quản trị viên' : '🎓 Học viên'}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8">
          {[
            { id: 'overview', label: 'Tổng quan', icon: BarChart3 },
            { id: 'statistics', label: 'Thống kê', icon: TrendingUp },
            { id: 'history', label: 'Lịch sử', icon: Clock },
            { id: 'settings', label: 'Cài đặt', icon: User },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="h-5 w-5" />
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <OverviewTab stats={stats} chartData={chartData} />
      )}

      {activeTab === 'statistics' && (
        <StatisticsTab 
          stats={stats} 
          chartData={chartData}
          questionTypeStats={questionTypeStats}
        />
      )}

      {activeTab === 'history' && (
        <HistoryTab history={history} />
      )}

      {activeTab === 'settings' && (
        <SettingsTab 
          user={user}
          onEditProfile={() => setShowEditModal(true)}
          onChangePassword={() => setShowPasswordModal(true)}
        />
      )}

      {/* Edit Profile Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Chỉnh sửa thông tin"
        footer={
          <div className="flex justify-end space-x-3">
            <Button variant="outline" onClick={() => setShowEditModal(false)}>
              Hủy
            </Button>
            <Button onClick={handleEditProfile} loading={editLoading}>
              Lưu thay đổi
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input
            label="Họ và tên"
            value={editForm.full_name}
            onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
            placeholder="Nhập họ tên..."
            leftIcon={User}
          />
          
          <Input
            label="Email"
            type="email"
            value={editForm.email}
            disabled
            leftIcon={Mail}
            helperText="Email không thể thay đổi"
          />
        </div>
      </Modal>

      {/* Change Password Modal */}
      <Modal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        title="Đổi mật khẩu"
        footer={
          <div className="flex justify-end space-x-3">
            <Button variant="outline" onClick={() => setShowPasswordModal(false)}>
              Hủy
            </Button>
            <Button onClick={handleChangePassword} loading={passwordLoading}>
              Đổi mật khẩu
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input
            label="Mật khẩu hiện tại"
            type="password"
            value={passwordForm.currentPassword}
            onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
            placeholder="••••••••"
            leftIcon={Lock}
          />
          
          <Input
            label="Mật khẩu mới"
            type="password"
            value={passwordForm.newPassword}
            onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
            placeholder="••••••••"
            leftIcon={Lock}
            helperText="Tối thiểu 6 ký tự"
          />
          
          <Input
            label="Xác nhận mật khẩu mới"
            type="password"
            value={passwordForm.confirmPassword}
            onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
            placeholder="••••••••"
            leftIcon={Lock}
          />
        </div>
      </Modal>
    </div>
  );
};

// Overview Tab
const OverviewTab = ({ stats, chartData }) => {
  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-600">Đề thi</p>
            <BookOpen className="h-5 w-5 text-blue-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {stats?.total_question_banks || 0}
          </p>
          <p className="text-sm text-gray-500 mt-1">Ngân hàng đề</p>
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-600">Đã làm</p>
            <Target className="h-5 w-5 text-green-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {stats?.total_exams_taken || 0}
          </p>
          <p className="text-sm text-gray-500 mt-1">Bài thi</p>
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-600">Điểm TB</p>
            <TrendingUp className="h-5 w-5 text-yellow-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {stats?.average_score?.toFixed(1) || 0}%
          </p>
          <p className="text-sm text-gray-500 mt-1">Trung bình</p>
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-600">Streak</p>
            <Flame className="h-5 w-5 text-orange-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {stats?.streak_days || 0}
          </p>
          <p className="text-sm text-gray-500 mt-1">Ngày liên tiếp</p>
        </Card>
      </div>

      {/* Chart */}
      <Card>
        <h3 className="text-lg font-bold text-gray-900 mb-6">
          📈 Biểu đồ tiến độ (30 ngày)
        </h3>
        {chartData && chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }}
                stroke="#9ca3af"
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                stroke="#9ca3af"
                domain={[0, 100]}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                }}
              />
              <Line
                type="monotone"
                dataKey="score"
                stroke="#3b82f6"
                strokeWidth={3}
                dot={{ fill: '#3b82f6', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-64 flex items-center justify-center text-gray-500">
            Chưa có dữ liệu
          </div>
        )}
      </Card>
    </div>
  );
};

// Statistics Tab
const StatisticsTab = ({ stats, chartData, questionTypeStats }) => {
  const getQuestionTypeLabel = (type) => {
    const labels = {
      'multiple_choice': 'Trắc nghiệm 1 đáp án',
      'multiple_answer': 'Trắc nghiệm nhiều đáp án',
      'true_false': 'Đúng/Sai',
      'short_answer': 'Trả lời ngắn',
      'essay': 'Tự luận',
      'fill_blank': 'Điền vào chỗ trống',
      'ordering': 'Sắp xếp thứ tự'
    };
    return labels[type] || type;
  };

  const pieData = questionTypeStats.map((stat) => ({
    name: getQuestionTypeLabel(stat.question_type),
    value: stat.accuracy,
    count: stat.correct,
    total: stat.total,
  }));

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

  return (
    <div className="space-y-6">
      {/* Performance by Type */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h3 className="text-lg font-bold text-gray-900 mb-6">
            📊 Phân tích theo loại câu
          </h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500">
              Chưa có dữ liệu
            </div>
          )}
        </Card>

        <Card>
          <h3 className="text-lg font-bold text-gray-900 mb-6">
            🎯 Độ chính xác theo loại
          </h3>
          <div className="space-y-4">
            {questionTypeStats.map((stat, index) => (
              <div key={index}>
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-medium text-gray-700">
                    {getQuestionTypeLabel(stat.question_type)}
                  </span>
                  <span className="font-bold text-gray-900">
                    {stat.correct}/{stat.total} ({stat.accuracy}%)
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="h-3 rounded-full transition-all"
                    style={{
                      width: `${stat.accuracy}%`,
                      backgroundColor: COLORS[index % COLORS.length]
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Score Distribution */}
      <Card>
        <h3 className="text-lg font-bold text-gray-900 mb-6">
          📈 Phân bố điểm số
        </h3>
        {chartData && chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Bar dataKey="score" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-64 flex items-center justify-center text-gray-500">
            Chưa có dữ liệu
          </div>
        )}
      </Card>
    </div>
  );
};

// History Tab
const HistoryTab = ({ history }) => {
  const navigate = useNavigate();

  const handleViewResult = (examId, userExamId) => {
    navigate(`/exam/${examId}/result?userExamId=${userExamId}`);
  };

  return (
    <div className="space-y-6">
      <Card>
        <h3 className="text-lg font-bold text-gray-900 mb-4">📜 Lịch sử làm bài</h3>
        
        {history && history.length > 0 ? (
          <div className="space-y-3">
            {history.map((item) => (
              <div
                key={item.user_exam_id}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-blue-300 transition-all cursor-pointer"
                onClick={() => handleViewResult(item.exam_id, item.user_exam_id)}
              >
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">{item.exam_title}</h4>
                  <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                    <span className="flex items-center">
                      <Calendar className="h-4 w-4 mr-1" />
                      {new Date(item.submitted_at).toLocaleDateString('vi-VN')}
                    </span>
                    <span className="flex items-center">
                      <Clock className="h-4 w-4 mr-1" />
                      {Math.floor(item.time_spent / 60)} phút
                    </span>
                    <p className="text-xs text-gray-500 mt-1">
                      Điểm đạt: {item.passing_marks}/{item.max_score}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <div className={`text-2xl font-bold ${
                      item.is_passed ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {item.percentage.toFixed(1)}%
                    </div>
                    <p className="text-xs text-gray-500">
                      {item.total_score.toFixed(1)}/{item.max_score.toFixed(1)} điểm
                    </p>
                  </div>
                  
                  <Badge variant={item.is_passed ? 'success' : 'danger'}>
                    {item.is_passed ? (
                      <span className="flex items-center">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Đạt
                      </span>
                    ) : (
                      <span className="flex items-center">
                        <X className="h-3 w-3 mr-1" />
                        Chưa đạt
                      </span>
                    )}
                  </Badge>
                  
                  <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <BookOpen className="h-12 w-12 mx-auto mb-3 text-gray-400" />
            <p>Chưa có lịch sử làm bài</p>
          </div>
        )}
      </Card>
    </div>
  );
};

// Settings Tab
const SettingsTab = ({ user, onEditProfile, onChangePassword }) => {
  return (
    <div className="space-y-6">
      <Card>
        <h3 className="text-lg font-bold text-gray-900 mb-4">👤 Thông tin tài khoản</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center space-x-3">
              <User className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Họ và tên</p>
                <p className="font-medium text-gray-900">{user?.full_name}</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onEditProfile}>
              Chỉnh sửa
            </Button>
          </div>

          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center space-x-3">
              <Mail className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p className="font-medium text-gray-900">{user?.email}</p>
              </div>
            </div>
            <Badge variant="success" size="sm">Đã xác thực</Badge>
          </div>

          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center space-x-3">
              <Lock className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Mật khẩu</p>
                <p className="font-medium text-gray-900">••••••••</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onChangePassword}>
              Đổi mật khẩu
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Profile;