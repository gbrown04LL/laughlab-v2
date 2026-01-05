import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/serverSupabaseClient', () => {
  const mockClient = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: { analysis_data: { metrics: { overallScore: 1 }, scriptStats: {}, timeline: {}, feedback: {}, gaps: {}, punchUps: {}, characters: {}, callbacks: {}, summary: '', coachNote: '' } } }),
  };
  return {
    getSupabaseRlsClient: vi.fn(() => mockClient),
    getRequestContext: vi.fn(() => ({ sessionId: 'session-test' })),
  };
});

import { fetchAnalysisById, getClientForContext } from '@/lib/supabase';

describe('supabase helpers', () => {
  it('throws when context is missing', () => {
    expect(() => getClientForContext({} as any)).toThrow(/context missing/i);
  });

  it('applies ownership filter when fetching by id', async () => {
    await fetchAnalysisById('id-123', { sessionId: 'session-abc' });
    const { getSupabaseRlsClient } = await import('@/lib/serverSupabaseClient');
    const client: any = (getSupabaseRlsClient as any).mock.results[0].value;
    expect(client.from).toHaveBeenCalledWith('reports');
    expect(client.eq).toHaveBeenCalledWith('session_id', 'session-abc');
  });
});
