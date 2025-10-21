import api from '../lib/api';

export const aiService = {
  // Analyze text
  analyzeText: async (text, language = 'vi') => {
    const { data } = await api.post('/api/v1/ai/analyze-text', { 
      text,
      language 
    });
    return data;
  },

  // Analyze file and create exam
  analyzeFile: async (fileId, examTitle = null) => {
    const { data } = await api.post(`/api/v1/ai/analyze-file/${fileId}`, {
      exam_title: examTitle,
    });
    return data;
  },

  // Generate similar questions
  generateSimilar: async (questionData) => {
    const { data } = await api.post('/api/v1/ai/generate-similar', questionData);
    return data;
  },

  // Grade essay
  gradeEssay: async (questionText, userAnswer, correctAnswer) => {
    const { data } = await api.post('/api/v1/ai/grade-essay', {
      question_text: questionText,
      user_answer: userAnswer,
      correct_answer: correctAnswer,
    });
    return data;
  },
};