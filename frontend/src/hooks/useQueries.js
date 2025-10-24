import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { statisticsService } from '../services/statisticsService';
import { examService } from '../services/examService';
import { practiceService } from '../services/practiceService';

// Query Keys
export const queryKeys = {
  // Statistics
  stats: ['stats'],
  history: ['history'],
  chartData: (days) => ['chartData', days],
  questionTypes: ['questionTypes'],
  weakAreas: ['weakAreas'],
  
  // Exams
  exams: (params) => ['exams', params],
  exam: (id) => ['exam', id],
  
  // Practice
  practiceSuggestions: ['practiceSuggestions'],
  practiceSessions: ['practiceSessions'],
  
  // Question Banks
  questionBanks: ['questionBanks'],
  questionBank: (id) => ['questionBank', id],
};

// Statistics Queries
export const useStats = () => {
  return useQuery({
    queryKey: queryKeys.stats,
    queryFn: () => statisticsService.getOverview(),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

export const useHistory = (limit = 50) => {
  return useQuery({
    queryKey: [...queryKeys.history, limit],
    queryFn: () => statisticsService.getHistory({ limit }),
    staleTime: 1 * 60 * 1000, // 1 minute
  });
};

export const useChartData = (days = 30) => {
  return useQuery({
    queryKey: queryKeys.chartData(days),
    queryFn: () => statisticsService.getScoresChart({ days }),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useQuestionTypes = () => {
  return useQuery({
    queryKey: queryKeys.questionTypes,
    queryFn: () => statisticsService.getQuestionTypes(),
    staleTime: 5 * 60 * 1000,
  });
};

export const useWeakAreas = () => {
  return useQuery({
    queryKey: queryKeys.weakAreas,
    queryFn: () => statisticsService.getWeakAreas(),
    staleTime: 2 * 60 * 1000,
  });
};

// Exam Queries
export const useExams = (params = {}) => {
  return useQuery({
    queryKey: queryKeys.exams(params),
    queryFn: () => examService.getAll(params),
    staleTime: 1 * 60 * 1000,
  });
};

export const useExam = (id) => {
  return useQuery({
    queryKey: queryKeys.exam(id),
    queryFn: () => examService.getById(id),
    enabled: !!id, // Only run if id exists
    staleTime: 5 * 60 * 1000,
  });
};

// Practice Queries
export const usePracticeSuggestions = () => {
  return useQuery({
    queryKey: queryKeys.practiceSuggestions,
    queryFn: () => practiceService.getSuggestions(),
    staleTime: 2 * 60 * 1000,
  });
};

export const usePracticeSessions = () => {
  return useQuery({
    queryKey: queryKeys.practiceSessions,
    queryFn: () => practiceService.getSessions(),
    staleTime: 1 * 60 * 1000,
  });
};