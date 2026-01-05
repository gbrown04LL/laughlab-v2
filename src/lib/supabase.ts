import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseRlsClient, getRequestContext, type RequestContext } from '@/lib/serverSupabaseClient';
import { validateAndSanitizeAnalysis, type ValidatedAnalysisResponse } from '@/lib/validation';
import { coerceAnalysis } from '@/lib/llm/utils/coerce';
import type { FullAnalysis } from '@/types';

const MAX_ANALYSIS_BYTES = 200_000; // ~200KB safety limit for analysis payload

function requireContext(ctx: RequestContext): asserts ctx is RequestContext & ({ userId: string } | { sessionId: string }) {
  if (!ctx.userId && !ctx.sessionId) {
    throw new Error('Supabase context missing: userId or sessionId is required');
  }
}

function ensureSize(payload: unknown) {
  const serialized = JSON.stringify(payload);
  if (serialized.length > MAX_ANALYSIS_BYTES) {
    throw new Error('Analysis payload exceeds size limit');
  }
}

type RlsClient = SupabaseClient;

export function getClientForContext(ctx: RequestContext): RlsClient {
  requireContext(ctx);
  return getSupabaseRlsClient(ctx);
}

export async function saveAnalysisToSupabase(
  analysis: ValidatedAnalysisResponse,
  ctx: RequestContext
) {
  const supabase = getClientForContext(ctx);
  ensureSize(analysis);

  const payload = validateAndSanitizeAnalysis(analysis);

  const insertData = {
    id: (analysis as any).id ?? undefined,
    title: (analysis as any).title ?? 'Untitled Script',
    format: (analysis as any).format ?? 'auto',
    overall_score: payload.metrics.overallScore,
    analysis_data: payload,
    user_id: ctx.userId ?? null,
    session_id: ctx.sessionId ?? null,
  };

  const { data, error } = await supabase.from('reports').insert(insertData).select();
  if (error) {
    throw error;
  }
  return data;
}

export async function fetchAnalysisHistory(ctx: RequestContext) {
  const supabase = getClientForContext(ctx);

  const query = supabase
    .from('reports')
    .select('id, title, format, overall_score, created_at')
    .order('created_at', { ascending: false })
    .eq(ctx.userId ? 'user_id' : 'session_id', ctx.userId ?? ctx.sessionId ?? '');

  const { data, error } = await query;
  if (error) {
    throw error;
  }
  return data;
}

export async function fetchAnalysisById(id: string, ctx: RequestContext): Promise<ValidatedAnalysisResponse> {
  const supabase = getClientForContext(ctx);

  const { data, error } = await supabase
    .from('reports')
    .select('analysis_data')
    .eq('id', id)
    .eq(ctx.userId ? 'user_id' : 'session_id', ctx.userId ?? ctx.sessionId ?? '')
    .maybeSingle();

  if (error || !data) {
    throw error ?? new Error('Analysis not found');
  }

  ensureSize(data.analysis_data);
  return coerceAnalysis(data.analysis_data);
}

export async function fetchAnalysisByIdClient(id: string): Promise<FullAnalysis | null> {
  if (typeof window !== 'undefined') {
    const res = await fetch(`/api/report?id=${encodeURIComponent(id)}`, { credentials: 'include' });
    if (!res.ok) return null;
    const json = (await res.json()) as { success: boolean; data?: FullAnalysis };
    return json.success ? json.data ?? null : null;
  }

  const ctx = getRequestContext();
  try {
    return await fetchAnalysisById(id, ctx);
  } catch {
    return null;
  }
}
