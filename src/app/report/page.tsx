'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Header,
  ReportNavigation,
  PageNavButtons,
  Page1Dashboard,
  Page2Timeline,
  Page3Feedback,
  Page4Gaps,
  Page5PunchUps,
  Page6Characters,
  MentorFeedbackCard,
} from '@/components';
import { useAnalysisStore } from '@/lib/store';
import { fetchAnalysisById } from '@/lib/supabase';

export default function ReportPage() {
  const router = useRouter();

  // Read directly from store - safe after hydration
  const currentAnalysis = useAnalysisStore((state) => state.currentAnalysis);
  const currentPage = useAnalysisStore((state) => state.currentPage);
  const canAccessPage = useAnalysisStore((state) => state.canAccessPage);
  const hasHydrated = useAnalysisStore((state) => state.hasHydrated);
  const hasLoggedGuardRead = useRef(false);

  // Defensive recovery: if hydration finishes but analysis is missing, attempt to read persisted state
  useEffect(() => {
    if (!hasHydrated || currentAnalysis) return;
    try {
      const raw = typeof window !== 'undefined' ? window.localStorage.getItem('laugh-lab-storage') : null;
      if (!raw) return;
      const parsed = JSON.parse(raw);
      const storedAnalysis = parsed?.state?.currentAnalysis;

      if (storedAnalysis) {
        console.log('[Instrumentation] /report recovered analysis from storage', {
          timestamp: new Date().toISOString(),
          analysisId: storedAnalysis.id,
        });
        useAnalysisStore.setState({
          currentAnalysis: storedAnalysis,
          currentPage: 1,
        });
      }
    } catch (error) {
      console.warn('[Instrumentation] /report failed to recover analysis from storage', error);
    }
  }, [currentAnalysis, hasHydrated]);

  useEffect(() => {
    console.log('[RaceInstrumentation] /report mounted', {
      timestamp: performance.now(),
      initialHasHydrated: hasHydrated,
      hasAnalysis: !!currentAnalysis,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    console.log('[RaceInstrumentation] /report hydration status', {
      timestamp: performance.now(),
      hasHydrated,
      hasAnalysis: !!currentAnalysis,
    });
  }, [currentAnalysis, hasHydrated]);

  useEffect(() => {
    if (!hasLoggedGuardRead.current) {
      hasLoggedGuardRead.current = true;
      console.log('[RaceInstrumentation] /report guard first read', {
        timestamp: performance.now(),
        hasHydrated,
        hasAnalysis: !!currentAnalysis,
      });
    }
  }, [currentAnalysis, hasHydrated]);

  // Redirect once hydrated without analysis
  useEffect(() => {
    if (!hasHydrated) return;
    
    if (currentAnalysis == null) {
      console.log('[Instrumentation] /report analysis null after hydration, attempting manual recovery', {
        timestamp: new Date().toISOString(),
      });

      const attemptRecovery = async () => {
        try {
          // 1. Try Local Storage first
          const stored = localStorage.getItem('laugh-lab-storage');
          if (stored) {
            const parsed = JSON.parse(stored);
            const persistedAnalysis = parsed.state?.currentAnalysis;
            
            if (persistedAnalysis) {
              console.log('[Instrumentation] /report local recovery successful', {
                timestamp: new Date().toISOString(),
                analysisId: persistedAnalysis.id,
              });
              useAnalysisStore.setState({ currentAnalysis: persistedAnalysis });
              return;
            }
          }

          // 2. Try Supabase fallback if local fails
          // We need the ID from the URL. Next.js App Router doesn't have a direct way to get params in 'use client' 
          // without using useParams(), but we can parse the URL.
          const pathParts = window.location.pathname.split('/');
          const idFromUrl = pathParts[2]; // /report/[id]/metrics

          if (idFromUrl && idFromUrl !== 'metrics') {
            console.log('[Instrumentation] /report attempting Supabase fallback for ID:', idFromUrl);
            const { success, data } = await fetchAnalysisById(idFromUrl);
            
            if (success && data) {
              console.log('[Instrumentation] /report Supabase recovery successful');
              useAnalysisStore.setState({ currentAnalysis: data });
              return;
            }
          }
        } catch (e) {
          console.error('[Instrumentation] /report recovery failed', e);
        }

        // 3. Final Redirect if all recovery fails
        console.log('[Instrumentation] /report redirecting - no analysis found in local or cloud');
        router.replace('/analyze');
      };

      attemptRecovery();
    } else {
      console.log('[Instrumentation] /report ready to render analysis', {
        timestamp: new Date().toISOString(),
        analysisId: currentAnalysis.id,
      });
    }
  }, [currentAnalysis, hasHydrated, router]);

  const renderLoading = () => (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="spinner" />
        <p className="text-ink-400 text-sm">Loading your report…</p>
      </div>
    </div>
  );

  // Hydration-aware render states
  if (!hasHydrated) {
    return renderLoading();
  }

  if (currentAnalysis == null) {
    return renderLoading();
  }

  const analysis = currentAnalysis;
  const page = currentPage ?? 1;

  // Render current page
  const renderPage = () => {
    switch (page) {
      case 1:
        return <Page1Dashboard analysis={analysis} />;
      case 2:
        return <Page2Timeline analysis={analysis} />;
      case 3:
        return <Page3Feedback analysis={analysis} />;
      case 4:
        if (!canAccessPage(4)) return <LockedPage page={4} />;
        return <Page4Gaps analysis={analysis} />;
      case 5:
        if (!canAccessPage(5)) return <LockedPage page={5} />;
        return <Page5PunchUps analysis={analysis} />;
      case 6:
        if (!canAccessPage(6)) return <LockedPage page={6} />;
        return <Page6Characters analysis={analysis} />;
      default:
        return <Page1Dashboard analysis={analysis} />;
    }
  };

  return (
    <>
      <Header />
      <ReportNavigation />
      <main className="flex-1 pb-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {renderPage()}
          <PageNavButtons />
        </div>
      </main>
    </>
  );
}

// Locked page component
function LockedPage({ page }: { page: number }) {
  const pageNames: Record<number, { name: string; tier: string }> = {
    4: { name: 'Gap Analysis', tier: 'Starter' },
    5: { name: 'Punch-Up Workshop', tier: 'Starter' },
    6: { name: 'Character Analysis', tier: 'Professional' },
  };

  const info = pageNames[page] || { name: 'This feature', tier: 'Starter' };

  return (
    <div className="report-section text-center py-16">
      <span className="text-6xl mb-6 block">🔒</span>
      <h2 className="text-2xl font-display font-bold text-ink-100 mb-3">
        {info.name} is a {info.tier} Feature
      </h2>
      <p className="text-ink-400 mb-8 max-w-md mx-auto">
        Upgrade to unlock detailed {info.name.toLowerCase()} and take your comedy writing to the next level.
      </p>
      <button className="btn-primary">
        Upgrade to {info.tier} →
      </button>
    </div>
  );
}
