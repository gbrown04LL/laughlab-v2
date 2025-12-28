'use client';

import { useEffect } from 'react';
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
  const { currentAnalysis, currentPage, canAccessPage } = useAnalysisStore();

  // Redirect if no analysis
  useEffect(() => {
    if (!currentAnalysis) {
      router.push('/analyze');
    }
  }, [currentAnalysis, router]);

  if (!currentAnalysis) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner" />
      </div>
    );
  }

  // Render current page
  const renderPage = () => {
    switch (currentPage) {
      case 1:
        return <Page1Dashboard analysis={currentAnalysis} />;
      case 2:
        return <Page2Timeline analysis={currentAnalysis} />;
      case 3:
        return <Page3Feedback analysis={currentAnalysis} />;
      case 4:
        if (!canAccessPage(4)) return <LockedPage page={4} />;
        return <Page4Gaps analysis={currentAnalysis} />;
      case 5:
        if (!canAccessPage(5)) return <LockedPage page={5} />;
        return <Page5PunchUps analysis={currentAnalysis} />;
      case 6:
        if (!canAccessPage(6)) return <LockedPage page={6} />;
        return <Page6Characters analysis={currentAnalysis} />;
      default:
        return <Page1Dashboard analysis={currentAnalysis} />;
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
