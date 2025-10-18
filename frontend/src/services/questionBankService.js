import api from '../lib/api';

export const questionBankService = {
  // Get all question banks
  getAll: async (params = {}) => {
    const { data } = await api.get('/api/v1/question-banks/', { params });
    return data;
  },

  // Get question bank by ID
  getById: async (bankId) => {
    const { data } = await api.get(`/api/v1/question-banks/${bankId}`);
    return data;
  },

  // Create question bank
  create: async (bankData) => {
    const { data } = await api.post('/api/v1/question-banks/', bankData);
    return data;
  },

  // Update question bank
  update: async (bankId, bankData) => {
    const { data } = await api.put(`/api/v1/question-banks/${bankId}`, bankData);
    return data;
  },

  // Delete question bank
  delete: async (bankId) => {
    const { data } = await api.delete(`/api/v1/question-banks/${bankId}`);
    return data;
  },

  // Get questions from bank
  getQuestions: async (bankId, params = {}) => {
    const { data } = await api.get(`/api/v1/question-banks/${bankId}/items`, { params });
    return data;
  },

  // Add question to bank
  addQuestion: async (bankId, questionData) => {
    const { data } = await api.post(`/api/v1/question-banks/${bankId}/items`, questionData);
    return data;
  },

  // Update question in bank
  updateQuestion: async (bankId, itemId, questionData) => {
    const { data } = await api.put(`/api/v1/question-banks/${bankId}/items/${itemId}`, questionData);
    return data;
  },

  // Delete question from bank
  deleteQuestion: async (bankId, itemId) => {
    const { data } = await api.delete(`/api/v1/question-banks/${bankId}/items/${itemId}`);
    return data;
  },

  // Share question bank
  share: async (bankId, accessLevel = 'view') => {
    const { data } = await api.post(`/api/v1/question-banks/${bankId}/share`, { access_level: accessLevel });
    return data;
  },

  // Import shared bank
  importShared: async (shareCode) => {
    const { data } = await api.post(`/api/v1/question-banks/import/${shareCode}`);
    return data;
  },
};