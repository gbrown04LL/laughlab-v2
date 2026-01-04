import { describe, expect, it } from 'vitest';
import { AnalysisValidationError, validateAnalysisMetrics } from '@/lib/validation';

describe('validateAnalysisMetrics', () => {
  it('rejects negative or extreme numeric metrics', () => {
    const invalidPayload = {
      metadata: { estimatedRuntimeMin: -5 },
      metrics: { totalJokes: -1 },
      jokeAnalysis: {
        categoryCounts: { Basic: -1, Standard: 2, Intermediate: 1, Advanced: 1, HighComplexity: 0 },
      },
      gapAnalysis: {
        gaps: [{ startLine: 10, endLine: 20, length: 10, durationMin: -3 }],
      },
    };

    expect(() => validateAnalysisMetrics(invalidPayload)).toThrow(AnalysisValidationError);
  });

  it('returns true for valid metric ranges without mutating input', () => {
    const validPayload = {
      metadata: { estimatedRuntimeMin: 15 },
      metrics: { totalJokes: 25 },
      jokeAnalysis: {
        categoryCounts: { Basic: 5, Standard: 8, Intermediate: 6, Advanced: 4, HighComplexity: 2 },
      },
      gapAnalysis: {
        gaps: [{ startLine: 10, endLine: 40, length: 30, durationMin: 2.5 }],
      },
    };

    const clone = structuredClone(validPayload);
    expect(validateAnalysisMetrics(validPayload)).toBe(true);
    expect(validPayload).toEqual(clone);
  });
});
