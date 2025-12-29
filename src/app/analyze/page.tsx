'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header, Footer, ScriptInput, LoadingAnalysis } from '@/components';
import { useAnalysisStore } from '@/lib/store';
import type { ScriptFormat, AnalyzeResponse } from '@/types';

export default function AnalyzePage() {
  const router = useRouter();
  const { setAnalysis, setAnalyzing, setError, isAnalyzing, error } = useAnalysisStore();
  const [localLoading, setLocalLoading] = useState(false);

  const handleSubmit = async (script: string, format: ScriptFormat, title: string) => {
    setLocalLoading(true);
    setAnalyzing(true);
    setError(null);

    try {
      // Add timeout wrapper - 2 minutes max
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000);

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ script, format, title }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Check HTTP status before parsing JSON
      if (!response.ok) {
        if (response.status === 504) {
          throw new Error(
            'Analysis timed out. Your script may be too long for processing. ' +
            'Try analyzing a shorter section (under 200 lines) or upgrade to a Pro plan for longer processing times.'
          );
        }
        if (response.status === 429) {
          throw new Error('Rate limit exceeded. Please wait a moment and try again.');
        }
        if (response.status === 401) {
          throw new Error('API key not configured. Please contact support.');
        }
        
        // Try to get error message from response
        let errorMessage = `Server error (${response.status})`;
        try {
          const errorData = await response.json();
          if (errorData.error) {
            errorMessage = errorData.error;
          }
        } catch {
          // If JSON parsing fails, use default message
        }
        throw new Error(errorMessage);
      }

      const result: AnalyzeResponse = await response.json();

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Analysis failed');
      }

      setAnalysis(result.data);
      router.push('/report');
    } catch (err) {
      // Handle abort/timeout
      if (err instanceof Error && err.name === 'AbortError') {
        setError(
          'Analysis is taking too long (over 2 minutes). ' +
          'This usually means your script is very long. ' +
          'Try analyzing a shorter section or contact support for help with large scripts.'
        );
      } else {
        const message = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
        setError(message);
      }
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
                  <li className="flex items-start gap-2">
                    <span className="text-laugh-400">•</span>
                    <strong>For scripts over 500 lines, analysis may take 60-90 seconds</strong>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-laugh-400">•</span>
                    <strong>Very long scripts may timeout - try analyzing scenes individually</strong>
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
