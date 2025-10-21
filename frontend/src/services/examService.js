import api from '../lib/api';

export const examService = {

  // GET ALL EXAMS
  getAll: async (params = {}) => {
    const { data } = await api.get('/api/v1/exams/', { params });
    return data;
  },

  // GET EXAM BY ID
  getById: async (examId) => {
    const { data } = await api.get(`/api/v1/exams/${examId}`);
    return data;
  },

  // CREATE EXAM FROM BANK - RANDOM MODE
  createFromBank: async (examData) => {
    const { data } = await api.post('/api/v1/exams/create-from-bank', examData);
    return data;
  },

  // CREATE EXAM FROM SELECTED QUESTIONS - SELECT MODE

  createFromSelected: async (examData) => {
    const { data } = await api.post('/api/v1/exams/create-from-selected', examData);
    return data;
  },

  // UPDATE EXAM
  update: async (examId, examData) => {
    const { data } = await api.put(`/api/v1/exams/${examId}`, examData);
    return data;
  },

  // DELETE EXAM
  delete: async (examId) => {
    const { data } = await api.delete(`/api/v1/exams/${examId}`);
    return data;
  },

  // PUBLISH EXAM
  publish: async (examId) => {
    const { data } = await api.post(`/api/v1/exams/${examId}/publish`);
    return data;
  },

  // UNPUBLISH EXAM
  unpublish: async (examId) => {
    const { data } = await api.post(`/api/v1/exams/${examId}/unpublish`);
    return data;
  },

  // TAKE EXAM - Get exam for student
  takeExam: async (examId) => {
    // This will be used when student takes the exam
    const { data } = await api.get(`/api/v1/exams/${examId}/take`);
    return data;
  },

  // SUBMIT EXAM ANSWERS
  submitExam: async (examId, answers) => {
    const { data } = await api.post(`/api/v1/exams/${examId}/submit`, { answers });
    return data;
  },

  // GET EXAM RESULT
  getResult: async (examId, attemptId) => {
    const { data } = await api.get(`/api/v1/exams/${examId}/result/${attemptId}`);
    return data;
  },


  // GET EXAM STATISTICS
  getStatistics: async (examId) => {
    const { data } = await api.get(`/api/v1/exams/${examId}/statistics`);
    return data;
  },

  // GET EXAM ATTEMPTS (for teacher)
  getAttempts: async (examId) => {
    const { data } = await api.get(`/api/v1/exams/${examId}/attempts`);
    return data;
  },
};