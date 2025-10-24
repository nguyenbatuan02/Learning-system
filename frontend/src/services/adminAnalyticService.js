import api from '../lib/api';

const adminAnalyticsService = {

   //Lấy thống kê sử dụng các tính năng
  getFeatureUsage: async (params = {}) => {
    const response = await api.get('/api/v1/admin-analytics/feature-usage', { params });
    return response.data;
  
  },

  // Lấy chi tiết sử dụng một tính năng cụ thể
  getFeatureUsageDetails: async (actionType, params = {}) => {
      const response = await api.get('/api/v1/admin-analytics/feature-usage/details', {
      params: { action_type: actionType, ...params }
      });
      return response.data;
  },


   // Lấy thống kê tương tác người dùng
  getUserEngagement: async (days = 30) => {
      const response = await api.get('/api/v1/admin-analytics/user-engagement', {
        params: { days }
      });
      return response.data;
  },

  
   // Lấy phân tích retention của users
  getUserRetention: async (cohortDays = 30) => {
      const response = await api.get('/api/v1/admin-analytics/user-engagement/retention', {
        params: { cohort_days: cohortDays }
      });
      return response.data;

  },

  // Lấy danh sách top users active nhất
  getTopUsers: async (params = {}) => {
      const response = await api.get('/api/v1/admin-analytics/user-engagement/top-users', {
        params
      });
      return response.data;
  },


   // Lấy thống kê tổng quan về nội dung
  getContentStats: async () => {
      const response = await api.get('/api/v1/admin-analytics/content-stats');
      return response.data;
  },

  // Lấy danh sách đề thi phổ biến nhất

  getPopularExams: async (params = {}) => {
      const response = await api.get('/api/v1/admin-analytics/content-stats/popular-exams', {
        params
      });
      return response.data;
  },

  // Lấy phân tích thống kê câu hỏi
  getQuestionAnalytics: async () => {
      const response = await api.get('/api/v1/admin-analytics/content-stats/question-analytics');
      return response.data;
  },

   // Lấy thống kê báo cáo và reports
  getReportsAnalytics: async (params = {}) => {
      const response = await api.get('/api/v1/admin-analytics/reports', { params });
      return response.data;
  },

  //Lấy chi tiết danh sách các reports
  getReportsDetails: async (params = {}) => {
      const response = await api.get('/api/v1/admin-analytics/reports/details', { params });
      return response.data;
  },

  // Kiểm tra sức khỏe hệ thống
  getSystemHealth: async () => {
      const response = await api.get('/api/v1/admin-analytics/system-health');
      return response.data;
  },

  // Lấy dashboard tổng quan cho admin

  getAdminDashboard: async () => {
      const response = await api.get('/api/v1/admin-analytics/dashboard');
      return response.data;
  },

  // Format feature usage data cho charts

  formatFeatureUsageForChart: (data) => {
    if (!data || !data.daily_breakdown) return { labels: [], datasets: [] };

    const dates = Object.keys(data.daily_breakdown).sort();
    const actionTypes = new Set();

    // Collect all action types
    Object.values(data.daily_breakdown).forEach(dayData => {
      Object.keys(dayData).forEach(action => actionTypes.add(action));
    });

    // Generate colors for each action type
    const colors = [
      '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
      '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
    ];

    const datasets = Array.from(actionTypes).map((action, index) => ({
      label: action,
      data: dates.map(date => data.daily_breakdown[date][action] || 0),
      borderColor: colors[index % colors.length],
      backgroundColor: colors[index % colors.length] + '20',
      fill: true,
      tension: 0.4
    }));

    return {
      labels: dates,
      datasets
    };
  },

  //Format retention data cho charts

  formatRetentionForChart: (data) => {
    if (!data || !data.retention_rates) return { labels: [], datasets: [] };

    return {
      labels: ['Day 1', 'Day 7', 'Day 14', 'Day 30'],
      datasets: [{
        label: 'Retention Rate (%)',
        data: [
          data.retention_rates.day_1 || 0,
          data.retention_rates.day_7 || 0,
          data.retention_rates.day_14 || 0,
          data.retention_rates.day_30 || 0
        ],
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',
          'rgba(16, 185, 129, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(239, 68, 68, 0.8)'
        ],
        borderColor: [
          'rgb(59, 130, 246)',
          'rgb(16, 185, 129)',
          'rgb(245, 158, 11)',
          'rgb(239, 68, 68)'
        ],
        borderWidth: 2
      }]
    };
  },

  // Format activity levels cho pie chart
  formatActivityLevelsForChart: (activityLevels) => {
    if (!activityLevels) return { labels: [], datasets: [] };

    return {
      labels: ['Very Active', 'Active', 'Casual', 'Minimal', 'Inactive'],
      datasets: [{
        data: [
          activityLevels.very_active || 0,
          activityLevels.active || 0,
          activityLevels.casual || 0,
          activityLevels.minimal || 0,
          activityLevels.inactive || 0
        ],
        backgroundColor: [
          'rgba(16, 185, 129, 0.8)',
          'rgba(59, 130, 246, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(156, 163, 175, 0.8)',
          'rgba(239, 68, 68, 0.8)'
        ],
        borderColor: [
          'rgb(16, 185, 129)',
          'rgb(59, 130, 246)',
          'rgb(245, 158, 11)',
          'rgb(156, 163, 175)',
          'rgb(239, 68, 68)'
        ],
        borderWidth: 2
      }]
    };
  },

  // Format reports by type cho chart

  formatReportsByTypeForChart: (byType) => {
    if (!byType) return { labels: [], datasets: [] };

    const labels = Object.keys(byType);
    const data = Object.values(byType);

    return {
      labels,
      datasets: [{
        label: 'Số lượng báo cáo',
        data,
        backgroundColor: 'rgba(239, 68, 68, 0.8)',
        borderColor: 'rgb(239, 68, 68)',
        borderWidth: 2
      }]
    };
  },

  //Get action type display name (Vietnamese)

  getActionTypeDisplayName: (actionType) => {
    const actionTypeMap = {
      'upload_file': 'Tải lên file',
      'create_exam': 'Tạo đề thi',
      'take_exam': 'Làm bài thi',
      'submit_exam': 'Nộp bài thi',
      'view_results': 'Xem kết quả',
      'create_practice_session': 'Tạo phiên ôn tập',
      'complete_practice': 'Hoàn thành ôn tập',
      'edit_question': 'Chỉnh sửa câu hỏi',
      'delete_question': 'Xóa câu hỏi',
      'edit_exam': 'Chỉnh sửa đề thi',
      'delete_exam': 'Xóa đề thi',
      'share_question_bank': 'Chia sẻ ngân hàng câu hỏi',
      'create_question_bank': 'Tạo ngân hàng câu hỏi',
      'process_file': 'Xử lý file'
    };

    return actionTypeMap[actionType] || actionType;
  },

  // Get report type display name (Vietnamese)
 
  getReportTypeDisplayName: (reportType) => {
    const reportTypeMap = {
      'ocr_error': 'Lỗi nhận dạng chữ (OCR)',
      'question_error': 'Lỗi câu hỏi',
      'answer_error': 'Lỗi đáp án',
      'bug': 'Lỗi hệ thống',
      'feature_request': 'Yêu cầu tính năng',
      'other': 'Khác'
    };

    return reportTypeMap[reportType] || reportType;
  },

  // Get status display name (Vietnamese)

  getStatusDisplayName: (status) => {
    const statusMap = {
      'pending': 'Đang chờ',
      'reviewing': 'Đang xem xét',
      'resolved': 'Đã giải quyết',
      'rejected': 'Đã từ chối'
    };

    return statusMap[status] || status;
  },

  // Get status color for badges
 
  getStatusColor: (status) => {
    const statusColorMap = {
      'pending': 'warning',      // Yellow
      'reviewing': 'info',       // Blue
      'resolved': 'success',     // Green
      'rejected': 'error'        // Red
    };

    return statusColorMap[status] || 'default';
  },

  //Calculate growth rate

  calculateGrowth: (current, previous) => {
    if (previous === 0) {
      return { rate: current > 0 ? 100 : 0, direction: 'up' };
    }

    const rate = ((current - previous) / previous) * 100;
    return {
      rate: Math.abs(rate).toFixed(2),
      direction: rate >= 0 ? 'up' : 'down'
    };
  },

  // Export data to CSV
 
  exportToCSV: (data, filename = 'export.csv') => {
    if (!data || data.length === 0) {
      console.warn('No data to export');
      return;
    }

    // Get headers from first object
    const headers = Object.keys(data[0]);
    
    // Convert to CSV
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          // Escape commas and quotes
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(',')
      )
    ].join('\n');

    // Create blob and download
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },

  // Format number with thousand separators
  
  formatNumber: (num) => {
    if (typeof num !== 'number') return '0';
    return num.toLocaleString('vi-VN');
  },

  // Format percentage

  formatPercentage: (value, decimals = 2) => {
    if (typeof value !== 'number') return '0%';
    return `${value.toFixed(decimals)}%`;
  },

  // Format date for display

  formatDate: (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  },

  // Get time period options for filters
 
  getTimePeriodOptions: () => [
    { value: 7, label: '7 ngày qua' },
    { value: 14, label: '14 ngày qua' },
    { value: 30, label: '30 ngày qua' },
    { value: 60, label: '60 ngày qua' },
    { value: 90, label: '90 ngày qua' }
  ]
};

export default adminAnalyticsService;