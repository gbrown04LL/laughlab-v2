import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { FullAnalysis } from '@/types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Lazy initialization to avoid errors during build/SSG
let _supabase: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient | null {
  if (_supabase) return _supabase;

  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  _supabase = createClient(supabaseUrl, supabaseAnonKey);
  return _supabase;
}

/**
 * Helper to save an analysis to Supabase
 */
export async function saveAnalysisToSupabase(analysis: any, fingerprint?: string) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { success: false, error: 'Supabase not configured' };
  }

  try {
    const { data, error } = await supabase
      .from('reports')
      .insert({
        id: analysis.id,
        title: analysis.title,
        format: analysis.format,
        overall_score: analysis.metrics.overallScore,
        analysis_data: analysis,
        fingerprint: fingerprint || null,
      })
      .select();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error saving analysis to Supabase:', error);
    return { success: false, error };
  }
}

/**
 * Helper to fetch analysis history from Supabase
 */
export async function fetchAnalysisHistory(fingerprint?: string) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { success: false, error: 'Supabase not configured', data: [] };
  }

  try {
    let query = supabase
      .from('reports')
      .select('id, title, format, overall_score, created_at')
      .order('created_at', { ascending: false });

    if (fingerprint) {
      query = query.eq('fingerprint', fingerprint);
    }

    const { data, error } = await query;

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error fetching analysis history:', error);
    return { success: false, error };
  }
}

/**
 * Helper to fetch a single analysis by ID from Supabase
 */
export async function fetchAnalysisById(
  id: string
): Promise<FullAnalysis | null> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from('reports')
    .select('analysis_data')
    .eq('id', id)
    .single();

  if (error || !data) {
    return null;
  }

  return data.analysis_data as FullAnalysis;
}
