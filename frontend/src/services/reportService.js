import api from '../lib/api';

export const reportService = {
  // Create report
  create: async (reportData) => {
    const { data } = await api.post('/api/v1/reports/', reportData);
    return data;
  },

  // Get my reports
  getMyReports: async (params = {}) => {
    const { data } = await api.get('/api/v1/reports/my-reports', { params });
    return data;
  },

  // Get report by ID
  getById: async (reportId) => {
    const { data } = await api.get(`/api/v1/reports/my-reports/${reportId}`);
    return data;
  },
};