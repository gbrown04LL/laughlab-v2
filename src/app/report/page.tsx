'use client';

import { useEffect, useState } from 'react';
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

export default function ReportPage() {
  const router = useRouter();
  const [hasHydrated, setHasHydrated] = useState(false);

  // Read directly from store - safe after hydration
  const currentAnalysis = useAnalysisStore((state) => state.currentAnalysis);
  const currentPage = useAnalysisStore((state) => state.currentPage);
  const canAccessPage = useAnalysisStore((state) => state.canAccessPage);

  // Track hydration state
  useEffect(() => {
    const persist = useAnalysisStore.persist;
    if (!persist) {
      // No persist middleware - consider hydrated
      setHasHydrated(true);
      return;
    }

    // Check if already hydrated
    if (persist.hasHydrated?.()) {
      setHasHydrated(true);
      return;
    }

    // Wait for hydration to complete
    const unsubscribe = persist.onFinishHydration?.(() => {
      setHasHydrated(true);
    });

    return () => {
      unsubscribe?.();
    };
  }, []);

  // Redirect if no analysis after hydration completes
  useEffect(() => {
    if (!hasHydrated) return;
    if (currentAnalysis == null) {
      router.replace('/analyze');
    }
  }, [currentAnalysis, hasHydrated, router]);

  // Show spinner until hydration completes
  if (!hasHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner" />
      </div>
    );
  }

  // Show spinner while redirecting (no analysis)
  if (currentAnalysis == null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner" />
      </div>
    );
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
