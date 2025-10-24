import { get } from 'react-hook-form';
import api from '../lib/api';

export const practiceService = {
  // Create practice session
  createSession: async (sessionData) => {
    const { data } = await api.post('/api/v1/practice/sessions', sessionData);
    return data;
  },

  // Get all sessions
  getSessions: async (status = null) => {
    const { data } = await api.get('/api/v1/practice/sessions', {
      params: status ? { status } : {},
    });
    return data;
  },

  // Get session by ID
  getSession: async (sessionId) => {
    const { data } = await api.get(`/api/v1/practice/sessions/${sessionId}`);
    return data;
  },

  // Get questions in session
  getQuestions: async (sessionId) => {
    const { data } = await api.get(`/api/v1/practice/sessions/${sessionId}/questions`);
    return data;
  },

  // Mark question as completed
  completeQuestion: async (sessionId, questionId) => {
    const { data } = await api.post(`/api/v1/practice/sessions/${sessionId}/complete-question/${questionId}`);
    return data;
  },

  // Complete session
  completeSession: async (sessionId) => {
    const { data } = await api.post(`/api/v1/practice/sessions/${sessionId}/complete`);
    return data;
  },

  // Get practice suggestions
  getSuggestions: async () => {
    const { data } = await api.get('/api/v1/practice/suggestions');
    return data;
  },
};