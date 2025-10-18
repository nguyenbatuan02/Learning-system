import api from '../lib/api';

export const submissionService = {
  // Start exam
  startExam: async (examId) => {
    const { data } = await api.post('/api/v1/submissions/start', { exam_id: examId });
    return data;
  },

  // Save answer (auto-save)
  saveAnswer: async (answerData) => {
    const { data } = await api.post('/api/v1/submissions/answer', answerData);
    return data;
  },

  // Submit exam
  submitExam: async (userExamId) => {
    const { data } = await api.post('/api/v1/submissions/submit', { user_exam_id: userExamId });
    return data;
  },

  // Get result
  getResult: async (userExamId) => {
    const { data } = await api.get(`/api/v1/submissions/result/${userExamId}`);
    return data;
  },
};