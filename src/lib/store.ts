import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { StateStorage } from 'zustand/middleware';
import type { AnalysisState, FullAnalysis, UserTier, AnalysisHistoryItem, TIER_FEATURES } from '@/types';

// Tier feature access
const TIER_PAGE_ACCESS: Record<UserTier, number[]> = {
  free: [1, 2, 3],
  starter: [1, 2, 3, 4, 5],
  professional: [1, 2, 3, 4, 5, 6],
  enterprise: [1, 2, 3, 4, 5, 6],
};

// Get current month key for tracking (e.g., "2025-01")
function getCurrentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

const logWithTimestamp = (scope: string, message: string, details?: unknown) => {
  const timestamp = new Date().toISOString();
  if (details !== undefined) {
    console.log(`[${scope}][${timestamp}] ${message}`, details);
  } else {
    console.log(`[${scope}][${timestamp}] ${message}`);
  }
};

const getInstrumentedStorage = (): StateStorage => ({
  getItem: (name) => {
    logWithTimestamp('PERSIST', 'storage.getItem start', { name });
    if (typeof window === 'undefined') {
      logWithTimestamp('PERSIST', 'storage.getItem skipped (window undefined)', { name });
      return null;
    }
    const value = window.localStorage.getItem(name);
    logWithTimestamp('PERSIST', 'storage.getItem end', { name, hasValue: value != null });
    return value;
  },
  setItem: (name, value) => {
    logWithTimestamp('PERSIST', 'storage.setItem start', { name, bytes: value?.length });
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(name, value);
    }
    logWithTimestamp('PERSIST', 'storage.setItem end', { name });
  },
  removeItem: (name) => {
    logWithTimestamp('PERSIST', 'storage.removeItem start', { name });
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(name);
    }
    logWithTimestamp('PERSIST', 'storage.removeItem end', { name });
  },
});

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
      usageMonthKey: getCurrentMonthKey(), // Track which month the count is for
      history: [],
      hasHydrated: false,

      // Actions
      setAnalysis: (analysis: FullAnalysis) => {
        logWithTimestamp('STORE', 'setAnalysis invoked', { id: analysis.id });
        const state = get();
        const currentMonth = getCurrentMonthKey();
        
        // Check if we need to reset for a new month
        let newCount = state.analysesThisMonth;
        let newMonthKey = state.usageMonthKey;
        
        if (state.usageMonthKey !== currentMonth) {
          // New month - reset counter
          newCount = 0;
          newMonthKey = currentMonth;
        }
        
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
          analysesThisMonth: newCount + 1,
          usageMonthKey: newMonthKey,
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
      
      // Get remaining analyses with month check
      getRemainingAnalyses: () => {
        const state = get();
        const currentMonth = getCurrentMonthKey();
        
        // If month changed, they have full quota
        if (state.usageMonthKey !== currentMonth) {
          return state.userTier === 'free' ? 2 : Infinity;
        }
        
        if (state.userTier !== 'free') return Infinity;
        return Math.max(0, 2 - state.analysesThisMonth);
      },
    }),
    {
      name: 'laugh-lab-storage',
      storage: createJSONStorage(() => getInstrumentedStorage()),
      partialize: (state) => ({
        currentAnalysis: state.currentAnalysis,
        history: state.history,
        userTier: state.userTier,
        analysesThisMonth: state.analysesThisMonth,
        usageMonthKey: state.usageMonthKey,
      }),
      onRehydrateStorage: () => {
        logWithTimestamp('PERSIST', 'onRehydrateStorage start');
        return (_state, error) => {
          if (error) {
            logWithTimestamp('PERSIST', 'onRehydrateStorage error', { error: error.message });
          } else {
            logWithTimestamp('PERSIST', 'onRehydrateStorage complete');
          }
          set({ hasHydrated: true });
        };
      },
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
