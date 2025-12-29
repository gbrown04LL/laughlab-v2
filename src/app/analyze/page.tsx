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

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Analysis failed');
      }

      setAnalysis(result.data);

      setLocalLoading(false);
      setAnalyzing(false);

      // Store analysis ID for verification
      const analysisId = result.data.id;

      // Wait for Zustand persist middleware to write to localStorage
      // Check up to 10 times with exponential backoff (max ~500ms total)
      const verifyPersistence = async () => {
        const maxAttempts = 10;
        const storageKey = 'laugh-lab-storage';

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
          const stored = localStorage.getItem(storageKey);
          if (stored) {
            try {
              const parsed = JSON.parse(stored);
              if (parsed.state?.currentAnalysis?.id === analysisId) {
                return true;
              }
            } catch (e) {
              // Silent failure - proceed with navigation anyway
            }
          }
          // Exponential backoff: 10ms, 20ms, 40ms, etc.
          await new Promise(resolve => setTimeout(resolve, Math.min(10 * Math.pow(2, attempt), 100)));
        }
        return false;
      };

      await verifyPersistence();
      router.push('/report');
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
