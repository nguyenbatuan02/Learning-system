import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Users, 
  FileText, 
  Activity,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  Clock,
  Download,
  Filter,
  Calendar,
  RefreshCw,
  Eye,
  Flag,
  BookOpen,
  Upload,
  Dumbbell
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line, Bar, Pie, Doughnut } from 'react-chartjs-2';
import adminAnalyticsService from '../services/adminAnalyticService';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import {
  useAdminDashboard,
  useFeatureUsage,
  useUserEngagement,
  useUserRetention,
  useTopUsers,
  useContentStats,
  usePopularExams,
  useQuestionAnalytics,
  useReportsAnalytics,
  useSystemHealth,
  useRefreshAnalytics,
} from '../hooks/useAdminAnalytics';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const AdminAnalytics = () => {
  
  const [selectedPeriod, setSelectedPeriod] = useState(30);
  const [activeTab, setActiveTab] = useState('overview');
  const { data: dashboard, isLoading: dashboardLoading } = useAdminDashboard();
  const { data: featureUsage, isLoading: featureLoading } = useFeatureUsage(selectedPeriod);
  const { data: userEngagement, isLoading: engagementLoading } = useUserEngagement(selectedPeriod);
  const { data: retention, isLoading: retentionLoading } = useUserRetention(30);
  const { data: contentStats, isLoading: contentLoading } = useContentStats();
  const { data: popularExams, isLoading: examsLoading } = usePopularExams({ limit: 10 });
  const { data: reports, isLoading: reportsLoading } = useReportsAnalytics({ days: selectedPeriod });
  const { data: systemHealth, isLoading: healthLoading } = useSystemHealth();
  const { data: topUsers, isLoading: topUsersLoading } = useTopUsers(selectedPeriod, 10);
  const { data: questionAnalytics, isLoading: questionLoading } = useQuestionAnalytics();
  const { mutate: refreshAll, isLoading: refreshing } = useRefreshAnalytics();
  const loading = dashboardLoading || featureLoading || engagementLoading;

  const handleRefresh = () => {
    refreshAll();
  };

  const handleExportData = () => {
    if (!dashboard) return;
    
    const exportData = {
      dashboard,
      feature_usage: featureUsage,
      user_engagement: userEngagement,
      content_stats: contentStats,
      reports: reports
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `analytics-export-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
  };
   

  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Đang tải dữ liệu analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-16 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <BarChart3 className="h-7 w-7 text-blue-600" />
                Admin Analytics
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Tổng quan và phân tích hệ thống
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Period Filter */}
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(Number(e.target.value))}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {adminAnalyticsService.getTimePeriodOptions().map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              {/* Refresh Button */}
              <Button
                variant="outline"
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                Làm mới
              </Button>

              {/* Export Button */}
              <Button
                onClick={handleExportData}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Xuất dữ liệu
              </Button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mt-4 overflow-x-auto">
            {[
              { id: 'overview', label: 'Tổng quan', icon: BarChart3 },
              { id: 'users', label: 'Người dùng', icon: Users },
              { id: 'content', label: 'Nội dung', icon: FileText },
              { id: 'features', label: 'Tính năng', icon: Activity },
              { id: 'reports', label: 'Báo cáo', icon: Flag }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-blue-50 text-blue-600 font-medium'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* System Health Alert */}
        {systemHealth && systemHealth.status !== 'healthy' && (
          <div className={`mb-6 p-4 rounded-lg border ${
            systemHealth.status === 'warning' 
              ? 'bg-yellow-50 border-yellow-200' 
              : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-start gap-3">
              <AlertCircle className={`h-5 w-5 mt-0.5 ${
                systemHealth.status === 'warning' ? 'text-yellow-600' : 'text-red-600'
              }`} />
              <div className="flex-1">
                <h3 className={`font-medium ${
                  systemHealth.status === 'warning' ? 'text-yellow-900' : 'text-red-900'
                }`}>
                  Cảnh báo hệ thống
                </h3>
                <ul className="mt-2 space-y-1">
                  {systemHealth.warnings.map((warning, index) => (
                    <li key={index} className="text-sm text-gray-700">• {warning}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <OverviewTab 
            dashboard={dashboard}
            systemHealth={systemHealth}
            contentStats={contentStats}
            reports={reports}
          />
        )}

        {activeTab === 'users' && (
          <UsersTab
            dashboard={dashboard}
            userEngagement={userEngagement}
            retention={retention}
            topUsers={topUsers}
          />
        )}

        {activeTab === 'content' && (
          <ContentTab
            contentStats={contentStats}
            popularExams={popularExams}
            questionAnalytics={questionAnalytics}
          />
        )}

        {activeTab === 'features' && (
          <FeaturesTab
            featureUsage={featureUsage}
            selectedPeriod={selectedPeriod}
          />
        )}

        {activeTab === 'reports' && (
          <ReportsTab
            reports={reports}
            selectedPeriod={selectedPeriod}
          />
        )}
      </div>
    </div>
  );
};

// ============================================================================
// OVERVIEW TAB
// ============================================================================

const OverviewTab = ({ dashboard, systemHealth, contentStats, reports }) => {
  if (!dashboard) return null;

  const stats = [
    {
      label: 'Tổng người dùng',
      value: adminAnalyticsService.formatNumber(dashboard.users.total),
      change: `+${dashboard.users.new_7d} (7 ngày)`,
      icon: Users,
      color: 'blue',
      trend: 'up'
    },
    {
      label: 'Người dùng hoạt động',
      value: adminAnalyticsService.formatNumber(dashboard.users.active_7d),
      change: `${dashboard.users.engagement_rate_7d}% tham gia`,
      icon: Activity,
      color: 'green',
      trend: 'up'
    },
    {
      label: 'Tổng đề thi',
      value: adminAnalyticsService.formatNumber(dashboard.content.total_exams),
      change: `${dashboard.content.submissions_7d} lượt làm (7 ngày)`,
      icon: FileText,
      color: 'purple',
      trend: 'up'
    },
    {
      label: 'Báo cáo chờ xử lý',
      value: adminAnalyticsService.formatNumber(dashboard.reports.pending),
      change: `+${dashboard.reports.new_7d} mới (7 ngày)`,
      icon: Flag,
      color: reports?.pending_reports > 20 ? 'red' : 'yellow',
      trend: dashboard.reports.new_7d > 0 ? 'up' : 'neutral'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activity Chart */}
        <Card title="Hoạt động 7 ngày qua" icon={Activity}>
          <div className="h-64 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <Activity className="h-12 w-12 mx-auto mb-2 text-gray-400" />
              <p>{adminAnalyticsService.formatNumber(dashboard.activity.actions_7d)} hoạt động</p>
              <p className="text-sm text-gray-400">
                Trung bình {dashboard.activity.avg_actions_per_day} / ngày
              </p>
            </div>
          </div>
        </Card>

        {/* System Health */}
        <Card title="Tình trạng hệ thống" icon={CheckCircle}>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Trạng thái</span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                systemHealth?.status === 'healthy' 
                  ? 'bg-green-100 text-green-700'
                  : systemHealth?.status === 'warning'
                  ? 'bg-yellow-100 text-yellow-700'
                  : 'bg-red-100 text-red-700'
              }`}>
                {systemHealth?.status === 'healthy' ? 'Khỏe mạnh' : 
                 systemHealth?.status === 'warning' ? 'Cảnh báo' : 'Nguy hiểm'}
              </span>
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Hoạt động/giờ</span>
                <span className="font-medium">
                  {systemHealth?.activity.last_hour || 0}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">File đang xử lý</span>
                <span className="font-medium">
                  {systemHealth?.file_processing.processing || 0}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">File thất bại</span>
                <span className="font-medium text-red-600">
                  {systemHealth?.file_processing.failed || 0}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Báo cáo chờ</span>
                <span className="font-medium text-yellow-600">
                  {systemHealth?.reports.pending || 0}
                </span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Content Overview */}
      {contentStats && (
        <Card title="Tổng quan nội dung" icon={FileText}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-2xl font-bold text-blue-600">
                {adminAnalyticsService.formatNumber(contentStats.exams.total)}
              </p>
              <p className="text-sm text-gray-600 mt-1">Đề thi</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-600">
                {adminAnalyticsService.formatNumber(contentStats.question_banks.total)}
              </p>
              <p className="text-sm text-gray-600 mt-1">Ngân hàng câu hỏi</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <p className="text-2xl font-bold text-purple-600">
                {adminAnalyticsService.formatNumber(contentStats.question_banks.items)}
              </p>
              <p className="text-sm text-gray-600 mt-1">Câu hỏi</p>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <p className="text-2xl font-bold text-orange-600">
                {adminAnalyticsService.formatNumber(contentStats.exams.submissions)}
              </p>
              <p className="text-sm text-gray-600 mt-1">Lượt làm bài</p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

// ============================================================================
// USERS TAB
// ============================================================================

const UsersTab = ({ dashboard, userEngagement, retention, topUsers }) => {
  const activityLevelsChart = userEngagement 
    ? adminAnalyticsService.formatActivityLevelsForChart(userEngagement.activity_levels)
    : null;

  const retentionChart = retention
    ? adminAnalyticsService.formatRetentionForChart(retention)
    : null;

  return (
    <div className="space-y-6">
      {/* User Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card title="Người dùng mới" icon={Users}>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">7 ngày qua</span>
              <span className="text-2xl font-bold text-blue-600">
                {dashboard?.users.new_7d || 0}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">30 ngày qua</span>
              <span className="text-2xl font-bold text-blue-600">
                {dashboard?.users.new_30d || 0}
              </span>
            </div>
            <div className="pt-2 border-t">
              <div className="flex items-center gap-2 text-sm">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <span className="text-gray-600">Tốc độ tăng trưởng:</span>
                <span className="font-medium text-green-600">
                  {dashboard?.growth.user_growth_rate_7d || 0}%
                </span>
              </div>
            </div>
          </div>
        </Card>

        <Card title="Mức độ tương tác" icon={Activity}>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Tỷ lệ tham gia</span>
              <span className="text-2xl font-bold text-green-600">
                {userEngagement?.engagement_rate || 0}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Hoạt động/người</span>
              <span className="text-2xl font-bold text-green-600">
                {userEngagement?.avg_actions_per_active_user || 0}
              </span>
            </div>
            <div className="pt-2 border-t">
              <p className="text-sm text-gray-600">
                {userEngagement?.active_users || 0} người dùng hoạt động
              </p>
            </div>
          </div>
        </Card>

        <Card title="Retention" icon={TrendingUp}>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Day 1</span>
              <span className="text-lg font-bold text-blue-600">
                {retention?.retention_rates.day_1 || 0}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Day 7</span>
              <span className="text-lg font-bold text-blue-600">
                {retention?.retention_rates.day_7 || 0}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Day 30</span>
              <span className="text-lg font-bold text-blue-600">
                {retention?.retention_rates.day_30 || 0}%
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activity Levels */}
        {activityLevelsChart && (
          <Card title="Phân loại mức độ hoạt động" icon={Activity}>
            <div className="h-80">
              <Pie 
                data={activityLevelsChart}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'bottom'
                    }
                  }
                }}
              />
            </div>
          </Card>
        )}

        {/* Retention Chart */}
        {retentionChart && (
          <Card title="Retention Rate" icon={TrendingUp}>
            <div className="h-80">
              <Bar
                data={retentionChart}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: {
                    y: {
                      beginAtZero: true,
                      max: 100,
                      ticks: {
                        callback: (value) => value + '%'
                      }
                    }
                  },
                  plugins: {
                    legend: {
                      display: false
                    }
                  }
                }}
              />
            </div>
          </Card>
        )}
      </div>

      {/* Top Users */}
      {topUsers && topUsers.top_users && topUsers.top_users.length > 0 && (
        <Card title="Top người dùng tích cực nhất" icon={Users}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    #
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Người dùng
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Số hoạt động
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {topUsers.top_users.map((user, index) => (
                  <tr key={user.user_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {index + 1}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {user.full_name || 'N/A'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {user.email}
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full font-medium">
                        {user.action_count}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};

// ============================================================================
// CONTENT TAB
// ============================================================================

const ContentTab = ({ contentStats, popularExams, questionAnalytics }) => {
  if (!contentStats) return null;

  return (
    <div className="space-y-6">
      {/* Content Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Đề thi</p>
              <p className="text-3xl font-bold text-blue-600 mt-1">
                {contentStats.exams.total}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {contentStats.exams.published} đã xuất bản
              </p>
            </div>
            <FileText className="h-12 w-12 text-blue-600 opacity-20" />
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Ngân hàng câu hỏi</p>
              <p className="text-3xl font-bold text-green-600 mt-1">
                {contentStats.question_banks.total}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {contentStats.question_banks.public} công khai
              </p>
            </div>
            <BookOpen className="h-12 w-12 text-green-600 opacity-20" />
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Câu hỏi</p>
              <p className="text-3xl font-bold text-purple-600 mt-1">
                {contentStats.question_banks.items}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                ~{contentStats.question_banks.avg_items_per_bank} / ngân hàng
              </p>
            </div>
            <Activity className="h-12 w-12 text-purple-600 opacity-20" />
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Lượt làm bài</p>
              <p className="text-3xl font-bold text-orange-600 mt-1">
                {contentStats.exams.submissions}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Điểm TB: {contentStats.exams.average_score}
              </p>
            </div>
            <Dumbbell className="h-12 w-12 text-orange-600 opacity-20" />
          </div>
        </Card>
      </div>

      {/* Exam Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Thống kê đề thi" icon={FileText}>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <span className="text-sm text-gray-600">Đã xuất bản</span>
              <span className="text-lg font-bold text-blue-600">
                {contentStats.exams.published}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">Bản nháp</span>
              <span className="text-lg font-bold text-gray-600">
                {contentStats.exams.draft}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <span className="text-sm text-gray-600">Đã chấm</span>
              <span className="text-lg font-bold text-green-600">
                {contentStats.exams.graded}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
              <span className="text-sm text-gray-600">Chờ chấm</span>
              <span className="text-lg font-bold text-yellow-600">
                {contentStats.exams.pending}
              </span>
            </div>
          </div>
        </Card>

        <Card title="Thống kê file" icon={Upload}>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <span className="text-sm text-gray-600">Thành công</span>
              <span className="text-lg font-bold text-green-600">
                {contentStats.files.completed}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
              <span className="text-sm text-gray-600">Thất bại</span>
              <span className="text-lg font-bold text-red-600">
                {contentStats.files.failed}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
              <span className="text-sm text-gray-600">Đang chờ</span>
              <span className="text-lg font-bold text-yellow-600">
                {contentStats.files.pending}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <span className="text-sm text-gray-600">Tỷ lệ thành công</span>
              <span className="text-lg font-bold text-blue-600">
                {contentStats.files.success_rate}%
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* Popular Exams */}
      {popularExams && popularExams.popular_exams && popularExams.popular_exams.length > 0 && (
        <Card title="Đề thi phổ biến nhất" icon={TrendingUp}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    #
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tên đề thi
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Lượt làm
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {popularExams.popular_exams.map((exam, index) => (
                  <tr key={exam.exam_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {index + 1}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {exam.title}
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full font-medium">
                        {exam.attempts}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Question Analytics */}
      {questionAnalytics && (
        <Card title="Phân tích câu hỏi" icon={Activity}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* By Type */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">Theo loại</h4>
              <div className="space-y-2">
                {Object.entries(questionAnalytics.by_type || {}).map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="text-sm text-gray-600">
                      {adminAnalyticsService.getActionTypeDisplayName(type)}
                    </span>
                    <span className="text-sm font-medium">{count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* By Difficulty */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">Theo độ khó</h4>
              <div className="space-y-2">
                {Object.entries(questionAnalytics.by_difficulty || {}).map(([difficulty, count]) => (
                  <div key={difficulty} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="text-sm text-gray-600 capitalize">{difficulty}</span>
                    <span className="text-sm font-medium">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Accuracy Stats */}
          {questionAnalytics.accuracy_stats && (
            <div className="mt-6 pt-6 border-t">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Thống kê độ chính xác</h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">
                    {questionAnalytics.accuracy_stats.total_attempts}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">Tổng lượt trả lời</p>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">
                    {questionAnalytics.accuracy_stats.total_correct}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">Trả lời đúng</p>
                </div>
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <p className="text-2xl font-bold text-purple-600">
                    {questionAnalytics.accuracy_stats.overall_accuracy}%
                  </p>
                  <p className="text-xs text-gray-600 mt-1">Độ chính xác</p>
                </div>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
};

// ============================================================================
// FEATURES TAB
// ============================================================================

const FeaturesTab = ({ featureUsage, selectedPeriod }) => {
  if (!featureUsage) return null;

  const chartData = adminAnalyticsService.formatFeatureUsageForChart(featureUsage);

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
          <div className="text-center">
            <p className="text-sm text-gray-600">Tổng hoạt động</p>
            <p className="text-4xl font-bold text-blue-600 mt-2">
              {adminAnalyticsService.formatNumber(featureUsage.total_actions)}
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Trong {selectedPeriod} ngày qua
            </p>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100">
          <div className="text-center">
            <p className="text-sm text-gray-600">Người dùng tham gia</p>
            <p className="text-4xl font-bold text-green-600 mt-2">
              {adminAnalyticsService.formatNumber(featureUsage.unique_users)}
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Người dùng duy nhất
            </p>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100">
          <div className="text-center">
            <p className="text-sm text-gray-600">Trung bình</p>
            <p className="text-4xl font-bold text-purple-600 mt-2">
              {Math.round(featureUsage.total_actions / selectedPeriod)}
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Hoạt động / ngày
            </p>
          </div>
        </Card>
      </div>

      {/* Feature Usage Chart */}
      <Card title="Xu hướng sử dụng tính năng" icon={Activity}>
        <div className="h-96">
          <Line
            data={chartData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              interaction: {
                mode: 'index',
                intersect: false
              },
              scales: {
                y: {
                  beginAtZero: true
                }
              },
              plugins: {
                legend: {
                  position: 'bottom'
                },
                tooltip: {
                  callbacks: {
                    label: (context) => {
                      return `${context.dataset.label}: ${context.parsed.y}`;
                    }
                  }
                }
              }
            }}
          />
        </div>
      </Card>

      {/* Top Features */}
      <Card title="Top tính năng được sử dụng" icon={TrendingUp}>
        <div className="space-y-3">
          {featureUsage.top_features.map(([feature, count], index) => {
            const percentage = (count / featureUsage.total_actions * 100).toFixed(1);
            return (
              <div key={feature} className="flex items-center gap-4">
                <div className="w-8 text-center">
                  <span className="text-sm font-bold text-gray-400">#{index + 1}</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">
                      {adminAnalyticsService.getActionTypeDisplayName(feature)}
                    </span>
                    <span className="text-sm text-gray-500">
                      {adminAnalyticsService.formatNumber(count)} ({percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Action Counts Table */}
      <Card title="Chi tiết sử dụng" icon={Eye}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tính năng
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Số lần sử dụng
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tỷ lệ
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {Object.entries(featureUsage.action_counts || {}).map(([action, count]) => (
                <tr key={action} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {adminAnalyticsService.getActionTypeDisplayName(action)}
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-medium">
                    {adminAnalyticsService.formatNumber(count)}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-gray-600">
                    {((count / featureUsage.total_actions) * 100).toFixed(2)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

// ============================================================================
// REPORTS TAB
// ============================================================================

const ReportsTab = ({ reports, selectedPeriod }) => {
  if (!reports) return null;

  const chartData = adminAnalyticsService.formatReportsByTypeForChart(reports.by_type);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-red-50 to-red-100">
          <div className="text-center">
            <p className="text-sm text-gray-600">Tổng báo cáo</p>
            <p className="text-4xl font-bold text-red-600 mt-2">
              {reports.total_reports}
            </p>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100">
          <div className="text-center">
            <p className="text-sm text-gray-600">Đang chờ</p>
            <p className="text-4xl font-bold text-yellow-600 mt-2">
              {reports.pending_reports}
            </p>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100">
          <div className="text-center">
            <p className="text-sm text-gray-600">Tỷ lệ giải quyết</p>
            <p className="text-4xl font-bold text-green-600 mt-2">
              {reports.resolution_rate}%
            </p>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
          <div className="text-center">
            <p className="text-sm text-gray-600">Vấn đề phổ biến</p>
            <p className="text-sm font-bold text-blue-600 mt-3">
              {adminAnalyticsService.getReportTypeDisplayName(reports.most_reported_issue)}
            </p>
          </div>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By Type */}
        <Card title="Báo cáo theo loại" icon={Flag}>
          <div className="h-80">
            <Bar
              data={chartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                  y: {
                    beginAtZero: true
                  }
                },
                plugins: {
                  legend: {
                    display: false
                  }
                }
              }}
            />
          </div>
        </Card>

        {/* By Status */}
        <Card title="Báo cáo theo trạng thái" icon={CheckCircle}>
          <div className="space-y-4 pt-4">
            {Object.entries(reports.by_status || {}).map(([status, count]) => {
              const percentage = (count / reports.total_reports * 100).toFixed(1);
              const color = adminAnalyticsService.getStatusColor(status);
              const colorClasses = {
                warning: 'bg-yellow-600',
                info: 'bg-blue-600',
                success: 'bg-green-600',
                error: 'bg-red-600',
                default: 'bg-gray-600'
              };

              return (
                <div key={status}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">
                      {adminAnalyticsService.getStatusDisplayName(status)}
                    </span>
                    <span className="text-sm text-gray-500">
                      {count} ({percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className={`${colorClasses[color]} h-3 rounded-full transition-all`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Reports Table */}
      <Card title="Chi tiết báo cáo theo loại" icon={Eye}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Loại báo cáo
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Số lượng
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tỷ lệ
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {Object.entries(reports.by_type || {})
                .sort((a, b) => b[1] - a[1])
                .map(([type, count]) => (
                  <tr key={type} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {adminAnalyticsService.getReportTypeDisplayName(type)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-medium">
                      {count}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-600">
                      {((count / reports.total_reports) * 100).toFixed(2)}%
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

// ============================================================================
// STAT CARD COMPONENT
// ============================================================================

const StatCard = ({ label, value, change, icon: Icon, color, trend }) => {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    red: 'bg-red-50 text-red-600'
  };

  const trendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : null;

  return (
    <Card>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-gray-600">{label}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
          {change && (
            <div className="flex items-center gap-1 mt-2">
              {trendIcon && React.createElement(trendIcon, {
                className: `h-4 w-4 ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`
              })}
              <span className="text-sm text-gray-600">{change}</span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </Card>
  );
};

export default AdminAnalytics;