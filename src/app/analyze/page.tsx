'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header, Footer, ScriptInput, LoadingAnalysis } from '@/components';
import { useAnalysisStore } from '@/lib/store';
import type { ScriptFormat, AnalyzeResponse } from '@/types';

// Align with server timeout (55s) - give server a little headroom
const CLIENT_TIMEOUT_MS = 58000; // 58 seconds

export default function AnalyzePage() {
  const router = useRouter();
  const { setAnalysis, setAnalyzing, setError, isAnalyzing, error, userTier } = useAnalysisStore();
  const [localLoading, setLocalLoading] = useState(false);

  const handleSubmit = async (script: string, format: ScriptFormat, title: string) => {
    setLocalLoading(true);
    setAnalyzing(true);
    setError(null);

    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ script, format, title, tier: userTier }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      console.log('[Instrumentation] API response received', { timestamp: new Date().toISOString(), status: response.status });

      // Handle rate limiting
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        const message = retryAfter 
          ? `Too many requests. Please wait ${retryAfter} seconds.`
          : 'Too many requests. Please slow down.';
        throw new Error(message);
      }

      // Handle usage limit
      if (response.status === 403) {
        const result = await response.json();
        throw new Error(result.error || 'Monthly analysis limit reached. Please upgrade to continue.');
      }

      const result: AnalyzeResponse = await response.json();
      console.log('[Instrumentation] Parsed API response', { timestamp: new Date().toISOString(), success: result.success, hasData: !!result.data });

      if (!result.success || !result.data) {
        console.error('[DEBUG] API response failed:', result.error);
        throw new Error(result.error || 'Analysis failed');
      }

      // Log remaining usage from headers
      const remaining = response.headers.get('X-Usage-Remaining');
      if (remaining) {
        console.log(`[Analysis] Remaining analyses this month: ${remaining}`);
      }

      console.log('[Instrumentation] About to call setAnalysis', { timestamp: new Date().toISOString(), analysisId: result.data.id });
      setAnalysis(result.data);
      console.log('[Instrumentation] setAnalysis call returned', { timestamp: new Date().toISOString(), analysisId: result.data.id });
      
      setLocalLoading(false);
      setAnalyzing(false);
      console.log('[Instrumentation] Loading states reset', { timestamp: new Date().toISOString() });
      
      // Wait for Zustand persist middleware to write to localStorage
      // Poll localStorage to verify the write completed
      const maxWaitTime = 2000; // 2 seconds max
      const pollInterval = 50; // Check every 50ms
      const startTime = Date.now();
      
      while (Date.now() - startTime < maxWaitTime) {
        try {
          const stored = localStorage.getItem('laugh-lab-storage');
          if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed.state?.currentAnalysis?.id === result.data.id) {
              console.log('[Instrumentation] Verified localStorage write completed', { 
                timestamp: new Date().toISOString(),
                waitTime: Date.now() - startTime 
              });
              break;
            }
          }
        } catch (e) {
          console.warn('[Instrumentation] Error checking localStorage', e);
        }
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      }
      
      console.log('[Instrumentation] About to navigate to /report', { timestamp: new Date().toISOString() });
      
      router.push('/report');
      console.log('[Instrumentation] Navigation initiated', { timestamp: new Date().toISOString() });
    } catch (err) {
      clearTimeout(timeoutId);
      
      let message: string;
      
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          message = 'Analysis timed out. Try a shorter script or check your connection.';
        } else {
          message = err.message;
        }
      } else {
        message = 'Something went wrong. Please try again.';
      }
      
      setError(message);
      setLocalLoading(false);
      setAnalyzing(false);
    }
  };

  return (
    <>
      <Header />
      <main className="flex-1">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center mb-10">
            <h1 className="text-3xl sm:text-4xl font-display font-bold text-ink-100 mb-3">
              Analyze Your Script
            </h1>
            <p className="text-ink-400">
              Paste your comedy script below and get professional feedback in seconds.
            </p>
          </div>

          {localLoading ? (
            <LoadingAnalysis />
          ) : (
            <div className="card p-6 sm:p-8">
              {error && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400">
                  <p className="font-medium">Analysis Error</p>
                  <p className="text-sm mt-1">{error}</p>
                </div>
              )}

              <ScriptInput onSubmit={handleSubmit} isLoading={localLoading} />

              <div className="mt-8 pt-6 border-t border-ink-800">
                <h3 className="text-sm font-medium text-ink-300 mb-3">Tips for best results:</h3>
                <ul className="grid sm:grid-cols-2 gap-2 text-xs text-ink-500">
                  <li className="flex items-start gap-2">
                    <span className="text-laugh-400">•</span>
                    Use standard screenplay format (INT./EXT., CHARACTER names in caps)
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-laugh-400">•</span>
                    Include at least a few scenes for meaningful analysis
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-laugh-400">•</span>
                    Works with sitcoms, features, sketches, and stand-up
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-laugh-400">•</span>
                    Dialogue-heavy scenes get the most detailed feedback
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
