import api from '../lib/api';

export const examService = {
  // Get all exams
  getAll: async (params = {}) => {
    const { data } = await api.get('/api/v1/exams/', { params });
    return data;
  },

  // Get exam by ID (with questions)
  getById: async (examId) => {
    const { data } = await api.get(`/api/v1/exams/${examId}`);
    return data;
  },

  // Create exam
  create: async (examData) => {
    const { data } = await api.post('/api/v1/exams/', examData);
    return data;
  },

  // Update exam
  update: async (examId, examData) => {
    const { data } = await api.put(`/api/v1/exams/${examId}`, examData);
    return data;
  },

  // Delete exam
  delete: async (examId) => {
    const { data } = await api.delete(`/api/v1/exams/${examId}`);
    return data;
  },

  // Generate random exam
  generateRandom: async (generatorData) => {
    const { data } = await api.post('/api/v1/exam-generator/generate-random', generatorData);
    return data;
  },

  // Create exam template
  createTemplate: async (templateData) => {
    const { data } = await api.post('/api/v1/exam-generator/templates', templateData);
    return data;
  },

  // Get exam templates
  getTemplates: async () => {
    const { data } = await api.get('/api/v1/exam-generator/templates');
    return data;
  },

  // Generate from template
  generateFromTemplate: async (templateId) => {
    const { data } = await api.post(`/api/v1/exam-generator/templates/${templateId}/generate`);
    return data;
  },
};