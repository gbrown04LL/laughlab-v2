import { z } from 'zod';
import { coerceAnalysis } from '@/lib/llm/utils/coerce';
import { AnalysisSchema } from '@/lib/llm/utils/schemas';
import type { AnalysisShape } from '@/lib/llm/utils/defaults';

export type ValidatedAnalysisResponse = AnalysisShape;

function formatIssues(error: z.ZodError): string {
  return error.issues
    .slice(0, 5)
    .map((issue) => issue.message)
    .join('; ');
}

export function validateAndSanitizeAnalysis(rawData: unknown): ValidatedAnalysisResponse {
  try {
    if (!rawData || typeof rawData !== 'object') {
      throw new Error('Analysis must be an object');
    }

    const requiredKeys: Array<keyof AnalysisShape> = [
      'scriptStats',
      'metrics',
      'timeline',
      'feedback',
      'gaps',
      'punchUps',
      'characters',
      'callbacks',
    ];

    for (const key of requiredKeys) {
      if (!(key in (rawData as Record<string, unknown>))) {
        throw new Error(`Missing required analysis section: ${key}`);
      }
    }

    return coerceAnalysis(rawData);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Analysis validation failed: ${formatIssues(error)}`);
    }
    throw error instanceof Error ? error : new Error('Analysis validation failed');
  }
}
