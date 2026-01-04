import { validateAndSanitizeAnalysis, type ValidatedAnalysisResponse } from '@/lib/validation';

export type NormalizedAnalysis = ValidatedAnalysisResponse;

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function hasInvalidNumber(value: unknown): boolean {
  if (isFiniteNumber(value)) return false;
  if (value && typeof value === 'object') {
    return Object.values(value).some(hasInvalidNumber);
  }
  return false;
}

export function validatePromptA(raw: unknown):
  | { ok: true; value: NormalizedAnalysis }
  | { ok: false; error: string } {
  if (!raw || typeof raw !== 'object') {
    return { ok: false, error: 'Analysis must be an object' };
  }

  let sanitized: NormalizedAnalysis;
  try {
    sanitized = validateAndSanitizeAnalysis(raw);
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Analysis validation failed' };
  }

  if (hasInvalidNumber(sanitized)) {
    return { ok: false, error: 'Analysis contains invalid numeric values' };
  }

  return { ok: true, value: sanitized };
}
