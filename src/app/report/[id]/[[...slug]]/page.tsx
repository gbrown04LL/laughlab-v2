'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAnalysisStore } from '@/lib/store';

export default function ReportByIdWithSlugPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  useEffect(() => {
    if (id) {
      // Set the analysis ID in the store so /report can fetch it
      useAnalysisStore.setState({ currentAnalysisId: id });
      // Redirect to the main report page which handles fetching
      router.replace('/report');
    }
  }, [id, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="spinner" />
        <p className="text-ink-400 text-sm">Loading your report…</p>
      </div>
    </div>
  );
}
