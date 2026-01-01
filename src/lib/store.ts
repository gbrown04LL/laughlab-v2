import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
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
      partialize: (state) => ({
        currentAnalysis: state.currentAnalysis,
        history: state.history,
        userTier: state.userTier,
        analysesThisMonth: state.analysesThisMonth,
        usageMonthKey: state.usageMonthKey,
      }),
      storage: createJSONStorage(() => ({
        getItem: (name: string) => {
          const timestamp = new Date().toISOString();
          console.log(`[PERSIST][${timestamp}] getItem called for ${name}`);
          return localStorage.getItem(name);
        },
        setItem: (name: string, value: string) => {
          const start = new Date().toISOString();
          console.log(`[PERSIST][${start}] setItem start for ${name}`);
          localStorage.setItem(name, value);
          const end = new Date().toISOString();
          console.log(`[PERSIST][${end}] setItem end for ${name}`);
        },
        removeItem: (name: string) => {
          const timestamp = new Date().toISOString();
          console.log(`[PERSIST][${timestamp}] removeItem called for ${name}`);
          localStorage.removeItem(name);
        },
      })),
      onRehydrateStorage: () => {
        const timestamp = new Date().toISOString();
        console.log(`[PERSIST][${timestamp}] onRehydrateStorage start`);
        return (state, error) => {
          const completeTimestamp = new Date().toISOString();
          if (error) {
            console.error(`[PERSIST][${completeTimestamp}] rehydration error`, error);
          }
          useAnalysisStore.setState({ hasHydrated: true });
          console.log(
            `[PERSIST][${completeTimestamp}] onRehydrateStorage complete | hasHydrated=true | currentAnalysis present: ${Boolean(state?.currentAnalysis)}`
          );
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
