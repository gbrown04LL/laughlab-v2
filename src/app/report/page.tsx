'use client';

import { useEffect, useRef, useState } from 'react';
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
} from '@/components';
import { useAnalysisStore } from '@/lib/store';
import { fetchAnalysisById } from '@/lib/supabase';

export default function ReportPage() {
  const router = useRouter();
  const [isFetchingFromSupabase, setIsFetchingFromSupabase] = useState(false);
  const fetchAttemptedRef = useRef(false);

  // Read directly from store - safe after hydration
  const currentAnalysis = useAnalysisStore((state) => state.currentAnalysis);
  const currentAnalysisId = useAnalysisStore((state) => state.currentAnalysisId);
  const currentPage = useAnalysisStore((state) => state.currentPage);
  const canAccessPage = useAnalysisStore((state) => state.canAccessPage);
  const hasHydrated = useAnalysisStore((state) => state.hasHydrated);

  // Three-stage guard: Supabase fallback when analysis is null but ID exists
  useEffect(() => {
    // Stage 1: If we have analysis, nothing to do
    if (currentAnalysis) return;

    // Stage 2: Wait for hydration
    if (!hasHydrated) return;

    // Stage 3: Supabase fallback
    // Prevent duplicate fetch attempts
    if (fetchAttemptedRef.current || isFetchingFromSupabase) return;

    // No ID available - redirect to analyze
    if (!currentAnalysisId) {
      router.replace('/analyze');
      return;
    }

    // Fetch from Supabase
    fetchAttemptedRef.current = true;
    setIsFetchingFromSupabase(true);

    fetchAnalysisById(currentAnalysisId).then((result) => {
      if (!result) {
        // Fetch failed or no data - redirect
        router.replace('/analyze');
        return;
      }

      // Hydrate store with fetched analysis
      useAnalysisStore.setState({ currentAnalysis: result });
      setIsFetchingFromSupabase(false);
    });
  }, [currentAnalysis, hasHydrated, currentAnalysisId, router, isFetchingFromSupabase]);

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

  // Show loading while fetching from Supabase
  if (isFetchingFromSupabase) {
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
