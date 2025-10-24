import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import adminAnalyticsService from '../services/adminAnalyticService';

export const adminAnalyticsKeys = {
  all: ['adminAnalytics'],
  
  // Dashboard
  dashboard: () => [...adminAnalyticsKeys.all, 'dashboard'],
  
  // Feature Usage
  featureUsage: (days) => [...adminAnalyticsKeys.all, 'featureUsage', days],
  featureUsageDetails: (actionType, params) => [
    ...adminAnalyticsKeys.all, 
    'featureUsageDetails', 
    actionType, 
    params
  ],
  
  // User Engagement
  userEngagement: (days) => [...adminAnalyticsKeys.all, 'userEngagement', days],
  userRetention: (cohortDays) => [...adminAnalyticsKeys.all, 'retention', cohortDays],
  topUsers: (days, limit) => [...adminAnalyticsKeys.all, 'topUsers', days, limit],
  
  // Content Stats
  contentStats: () => [...adminAnalyticsKeys.all, 'contentStats'],
  popularExams: (params) => [...adminAnalyticsKeys.all, 'popularExams', params],
  questionAnalytics: () => [...adminAnalyticsKeys.all, 'questionAnalytics'],
  
  // Reports
  reports: (params) => [...adminAnalyticsKeys.all, 'reports', params],
  reportsDetails: (params) => [...adminAnalyticsKeys.all, 'reportsDetails', params],
  
  // System Health
  systemHealth: () => [...adminAnalyticsKeys.all, 'systemHealth'],
};

// ============================================================================
// DASHBOARD
// ============================================================================
export const useAdminDashboard = () => {
  return useQuery({
    queryKey: adminAnalyticsKeys.dashboard(),
    queryFn: () => adminAnalyticsService.getAdminDashboard(),
    staleTime: 2 * 60 * 1000, // 2 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });
};

// ============================================================================
// FEATURE USAGE
// ============================================================================
export const useFeatureUsage = (days = 30) => {
  return useQuery({
    queryKey: adminAnalyticsKeys.featureUsage(days),
    queryFn: () => adminAnalyticsService.getFeatureUsage({ days }),
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 15 * 60 * 1000, // 15 minutes
  });
};

export const useFeatureUsageDetails = (actionType, params = {}) => {
  return useQuery({
    queryKey: adminAnalyticsKeys.featureUsageDetails(actionType, params),
    queryFn: () => adminAnalyticsService.getFeatureUsageDetails(actionType, params),
    enabled: !!actionType, // Only run if actionType exists
    staleTime: 3 * 60 * 1000, // 3 minutes
  });
};

export const useUserEngagement = (days = 30) => {
  return useQuery({
    queryKey: adminAnalyticsKeys.userEngagement(days),
    queryFn: () => adminAnalyticsService.getUserEngagement(days),
    staleTime: 3 * 60 * 1000, // 3 minutes
    cacheTime: 10 * 60 * 1000,
  });
};

export const useUserRetention = (cohortDays = 30) => {
  return useQuery({
    queryKey: adminAnalyticsKeys.userRetention(cohortDays),
    queryFn: () => adminAnalyticsService.getUserRetention(cohortDays),
    staleTime: 10 * 60 * 1000, // 10 minutes - retention data changes slowly
    cacheTime: 30 * 60 * 1000, // 30 minutes
  });
};

export const useTopUsers = (days = 30, limit = 10) => {
  return useQuery({
    queryKey: adminAnalyticsKeys.topUsers(days, limit),
    queryFn: () => adminAnalyticsService.getTopUsers({ days, limit }),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useContentStats = () => {
  return useQuery({
    queryKey: adminAnalyticsKeys.contentStats(),
    queryFn: () => adminAnalyticsService.getContentStats(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 15 * 60 * 1000,
  });
};

export const usePopularExams = (params = {}) => {
  return useQuery({
    queryKey: adminAnalyticsKeys.popularExams(params),
    queryFn: () => adminAnalyticsService.getPopularExams(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useQuestionAnalytics = () => {
  return useQuery({
    queryKey: adminAnalyticsKeys.questionAnalytics(),
    queryFn: () => adminAnalyticsService.getQuestionAnalytics(),
    staleTime: 10 * 60 * 1000, // 10 minutes - changes slowly
    cacheTime: 30 * 60 * 1000,
  });
};


export const useReportsAnalytics = (params = {}) => {
  return useQuery({
    queryKey: adminAnalyticsKeys.reports(params),
    queryFn: () => adminAnalyticsService.getReportsAnalytics(params),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

export const useReportsDetails = (params = {}) => {
  return useQuery({
    queryKey: adminAnalyticsKeys.reportsDetails(params),
    queryFn: () => adminAnalyticsService.getReportsDetails(params),
    staleTime: 1 * 60 * 1000, // 1 minute
  });
};


export const useSystemHealth = () => {
  return useQuery({
    queryKey: adminAnalyticsKeys.systemHealth(),
    queryFn: () => adminAnalyticsService.getSystemHealth(),
    staleTime: 30 * 1000, // 30 seconds - health data should be fresh
    cacheTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 60 * 1000, // Auto-refetch every 60 seconds
  });
};

export const useRefreshAnalytics = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      // Invalidate all admin analytics queries
      await queryClient.invalidateQueries({
        queryKey: adminAnalyticsKeys.all
      });
      return { success: true };
    },
  });
};


export const usePrefetchAnalytics = () => {
  const queryClient = useQueryClient();
  
  const prefetchDashboard = () => {
    queryClient.prefetchQuery({
      queryKey: adminAnalyticsKeys.dashboard(),
      queryFn: () => adminAnalyticsService.getAdminDashboard(),
    });
  };
  
  const prefetchAll = (days = 30) => {
    // Prefetch common queries
    queryClient.prefetchQuery({
      queryKey: adminAnalyticsKeys.dashboard(),
      queryFn: () => adminAnalyticsService.getAdminDashboard(),
    });
    
    queryClient.prefetchQuery({
      queryKey: adminAnalyticsKeys.featureUsage(days),
      queryFn: () => adminAnalyticsService.getFeatureUsage({ days }),
    });
    
    queryClient.prefetchQuery({
      queryKey: adminAnalyticsKeys.userEngagement(days),
      queryFn: () => adminAnalyticsService.getUserEngagement(days),
    });
    
    queryClient.prefetchQuery({
      queryKey: adminAnalyticsKeys.contentStats(),
      queryFn: () => adminAnalyticsService.getContentStats(),
    });
    
    queryClient.prefetchQuery({
      queryKey: adminAnalyticsKeys.systemHealth(),
      queryFn: () => adminAnalyticsService.getSystemHealth(),
    });
  };
  
  return { prefetchDashboard, prefetchAll };
};