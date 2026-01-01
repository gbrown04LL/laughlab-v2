import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials missing. Persistent storage will be disabled.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Helper to save an analysis to Supabase
 */
export async function saveAnalysisToSupabase(analysis: any, fingerprint?: string) {
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
export async function fetchAnalysisById(id: string) {
  try {
    const { data, error } = await supabase
      .from("reports")
      .select("analysis_data")
      .eq("id", id)
      .single();

    if (error) throw error;
    return { success: true, data: data.analysis_data };
  } catch (error) {
    console.error("Error fetching analysis by ID:", error);
    return { success: false, error };
  }
}
