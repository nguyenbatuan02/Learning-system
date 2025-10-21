import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  BookOpen, 
  Target, 
  TrendingUp, 
  Clock,
  ChevronRight,
  Plus,
  Flame,
  Award,
  ArrowUp
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { statisticsService } from '../services/statisticsService';
import { examService } from '../services/examService';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import Loading from '../components/common/Loading';
import EmptyState from '../components/common/EmptyState';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const Home = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState(null);
  const [recentExams, setRecentExams] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load statistics
      const statsData = await statisticsService.getOverview();
      setStats(statsData);

      // Load chart data
      const chartResponse = await statisticsService.getScoresChart({ days: 30 });
      setChartData(chartResponse.data || []);

      // Load recent exams
      const examsData = await examService.getAll({ limit: 5 });
      setRecentExams(examsData);

    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <Loading fullScreen text="Đang tải trang chủ..." />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          👋 Chào {user?.full_name || 'bạn'}!
        </h1>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Đề thi</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {stats?.total_question_banks || 0}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <BookOpen className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Đã làm</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {stats?.total_exams_taken || 0}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <Target className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Điểm TB</p>
              <div className="flex items-baseline space-x-2">
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  {stats?.average_score?.toFixed(1) || 0}%
                </p>
                {stats?.score_trend > 0 && (
                  <div className="flex items-center text-green-600">
                    <ArrowUp className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      {stats.score_trend}%
                    </span>
                  </div>
                )}
              </div>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recent Exams */}
          <Card>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Đề thi gần đây</h2>
              <Link
                to="/exams"
                className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center"
              >
                Xem tất cả
                <ChevronRight className="h-4 w-4 ml-1" />
              </Link>
            </div>

            {recentExams.length > 0 ? (
              <div className="space-y-3">
                {recentExams.map((exam) => (
                  <div
                    key={exam.id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all cursor-pointer"
                    onClick={() => navigate(`/exam/${exam.id}`)}
                  >
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{exam.title}</h3>
                      <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                        <span className="flex items-center">
                          <BookOpen className="h-4 w-4 mr-1" />
                          {exam.questions_count || 0} câu
                        </span>
                        <span className="flex items-center">
                          <Clock className="h-4 w-4 mr-1" />
                          {exam.duration_minutes || 0} phút
                        </span>
                      </div>
                    </div>
                    <Button size="sm">Làm bài</Button>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={BookOpen}
                title="Chưa có đề thi nào"
                description="Hãy tạo đề thi đầu tiên của bạn"
                action={() => navigate('/upload')}
                actionLabel="Nhập đề thi"
              />
            )}
          </Card>

          {/* Performance Chart */}
          <Card>
            <h2 className="text-xl font-bold text-gray-900 mb-6">
              Biểu đồ tiến độ (30 ngày)
            </h2>
            {chartData.length > 0 ? (
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
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
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
                Chưa có dữ liệu để hiển thị
              </div>
            )}
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card>
            <h2 className="text-lg font-bold text-gray-900 mb-4">Thao tác nhanh</h2>
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start"
                icon={Plus}
                onClick={() => navigate('/upload')}
              >
                 Tạo ngân hàng đề
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                icon={Target}
                onClick={() => navigate('/question-banks')}
              >
                Tạo đề thi mới
              </Button>
            </div>
          </Card>

          {/* Suggestions */}
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-xl">🔴</span>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-1">Ôn lại câu sai</h3>
                <p className="text-sm text-gray-600 mb-3">
                  Bạn có {stats?.wrong_answers_count || 0} câu cần ôn lại
                </p>
                <Button
                  size="sm"
                  onClick={() => navigate('/practice')}
                >
                  Bắt đầu →
                </Button>
              </div>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-xl">📈</span>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-1">Cải thiện điểm</h3>
                <p className="text-sm text-gray-600 mb-3">
                  Luyện thêm để tăng điểm trung bình
                </p>
                <Button
                  size="sm"
                  variant="success"
                  onClick={() => navigate('/exams')}
                >
                  Luyện tập →
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Home;