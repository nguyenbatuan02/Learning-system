import api from '../lib/api';

export const statisticsService = {
  // Get overview
  getOverview: async () => {
    const { data } = await api.get('/api/v1/statistics/overview');
    return data;
  },

  // Get history
  getHistory: async (params = {}) => {
    const { data } = await api.get('/api/v1/statistics/history', { params });
    return data;
  },

  // Get scores chart
  getScoresChart: async (params = {}) => {
    const { data } = await api.get('/api/v1/statistics/scores-chart', { params });
    return data;
  },

  // Get question types stats
  getQuestionTypes: async () => {
    const { data } = await api.get('/api/v1/statistics/question-types');
    return data;
  },

  // Get weak areas
  getWeakAreas: async () => {
    const { data } = await api.get('/api/v1/statistics/weak-areas');
    return data;
  },
};