import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AnalysisState, FullAnalysis, UserTier, AnalysisHistoryItem, TIER_FEATURES } from '@/types';

// Tier feature access
const TIER_PAGE_ACCESS: Record<UserTier, number[]> = {
  free: [1, 2, 3],
  starter: [1, 2, 3, 4, 5],
  professional: [1, 2, 3, 4, 5, 6],
  enterprise: [1, 2, 3, 4, 5, 6],
};

export const useAnalysisStore = create<AnalysisState>()(
  persist(
    (set, get) => ({
      // Initial state
      currentAnalysis: null,
      isAnalyzing: false,
      error: null,
      currentPage: 1,
      userTier: 'free' as UserTier,
      analysesThisMonth: 0,
      history: [],

      // Actions
      setAnalysis: (analysis: FullAnalysis) => {
        const state = get();
        
        // Add to history
        const historyItem: AnalysisHistoryItem = {
          id: analysis.id,
          title: analysis.title,
          timestamp: analysis.timestamp,
          overallScore: analysis.metrics.overallScore,
          format: analysis.format,
        };
        
        const newHistory = [
          historyItem,
          ...state.history.filter(h => h.id !== analysis.id)
        ].slice(0, 20); // Keep last 20
        
        set({
          currentAnalysis: analysis,
          isAnalyzing: false,
          error: null,
          currentPage: 1,
          history: newHistory,
          analysesThisMonth: state.analysesThisMonth + 1,
        });
      },

      setAnalyzing: (isAnalyzing: boolean) => {
        set({ isAnalyzing, error: null });
      },

      setError: (error: string | null) => {
        set({ error, isAnalyzing: false });
      },

      setCurrentPage: (page: number) => {
        const state = get();
        if (state.canAccessPage(page)) {
          set({ currentPage: page });
        }
      },

      clearAnalysis: () => {
        set({ currentAnalysis: null, error: null, currentPage: 1 });
      },

      canAccessPage: (pageNumber: number) => {
        const state = get();
        const allowedPages = TIER_PAGE_ACCESS[state.userTier];
        return allowedPages.includes(pageNumber);
      },
    }),
    {
      name: 'laugh-lab-storage',
      partialize: (state) => ({
        history: state.history,
        userTier: state.userTier,
        analysesThisMonth: state.analysesThisMonth,
      }),
    }
  )
);

// Helper hooks
export const useCanAccessPage = (pageNumber: number) => {
  return useAnalysisStore((state) => state.canAccessPage(pageNumber));
};

export const useCurrentAnalysis = () => {
  return useAnalysisStore((state) => state.currentAnalysis);
};

export const useIsAnalyzing = () => {
  return useAnalysisStore((state) => state.isAnalyzing);
};
