import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { AnalysisState, FullAnalysis, UserTier, AnalysisHistoryItem, TIER_FEATURES } from '@/types';
import { saveAnalysisToSupabase } from './supabase';

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
      currentAnalysisId: null,
      hasHydrated: false,
      isAnalyzing: false,
      error: null,
      currentPage: 1,
      userTier: 'free' as UserTier,
      analysesThisMonth: 0,
      usageMonthKey: getCurrentMonthKey(), // Track which month the count is for
      history: [],

      // Actions
      setAnalysis: (analysis: FullAnalysis) => {
        const state = get();
        const currentMonth = getCurrentMonthKey();
        const start = new Date().toISOString();
        console.log('[AnalysisStore] setAnalysis start', { analysisId: analysis.id, start });
        
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
          currentAnalysisId: analysis.id,
          isAnalyzing: false,
          error: null,
          currentPage: 1,
          history: newHistory,
          analysesThisMonth: newCount + 1,
          usageMonthKey: newMonthKey,
        });

        // Sync to Supabase (async, don't block UI)
        saveAnalysisToSupabase(analysis).then(result => {
          if (result.success) {
            console.log('[AnalysisStore] Successfully synced to Supabase');
          } else {
            console.warn('[AnalysisStore] Supabase sync failed, falling back to local only');
          }
        });

        const end = new Date().toISOString();
        console.log('[AnalysisStore] setAnalysis end', { analysisId: analysis.id, end });
      },

      setAnalyzing: (isAnalyzing: boolean) => {
        set({ isAnalyzing, error: null });
      },

      setCurrentAnalysisId: (id: string | null) => {
        set({ currentAnalysisId: id });
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
        set({ currentAnalysis: null, currentAnalysisId: null, error: null, currentPage: 1 });
      },

      markHydrated: () => {
        set({ hasHydrated: true });
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
      storage: createJSONStorage(() => {
        if (typeof window === 'undefined') {
          const memoryStorage = new Map<string, string>();
          return {
            getItem: (name) => memoryStorage.get(name) ?? null,
            removeItem: (name) => memoryStorage.delete(name) ? undefined : undefined,
            setItem: (name, value) => {
              const start = performance.now();
              console.log('[RaceInstrumentation] Zustand write start (memory)', { name, timestamp: start });
              memoryStorage.set(name, value);
              const end = performance.now();
              console.log('[RaceInstrumentation] Zustand write end (memory)', { name, timestamp: end });
            },
            clear: () => memoryStorage.clear(),
            key: (index: number) => Array.from(memoryStorage.keys())[index] ?? null,
            get length() {
              return memoryStorage.size;
            },
          };
        }

        const storage = window.localStorage;

        return {
          getItem: storage.getItem.bind(storage),
          removeItem: storage.removeItem.bind(storage),
          setItem: (name, value) => {
            const start = performance.now();
            console.log('[RaceInstrumentation] Zustand write start', { name, timestamp: start });
            storage.setItem(name, value);
            const end = performance.now();
            console.log('[RaceInstrumentation] Zustand write end', { name, timestamp: end });
          },
          clear: storage.clear.bind(storage),
          key: storage.key.bind(storage),
          get length() {
            return storage.length;
          },
        } as Storage;
      }),
      partialize: (state) => ({
        currentAnalysis: state.currentAnalysis,
        currentAnalysisId: state.currentAnalysisId,
        history: state.history,
        userTier: state.userTier,
        analysesThisMonth: state.analysesThisMonth,
        usageMonthKey: state.usageMonthKey,
      }),
      onRehydrateStorage: () => {
        const start = performance.now();
        console.log('[RaceInstrumentation] Hydration start', { timestamp: start });
        return (state, error) => {
          if (error) {
            console.error('[RaceInstrumentation] Hydration error', error);
          }
          const end = performance.now();
          console.log('[RaceInstrumentation] Hydration complete', {
            timestamp: end,
            hasAnalysis: !!state?.currentAnalysis,
          });
          if (state) state.hasHydrated = true;
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
