import { NextRequest, NextResponse } from 'next/server';
import { fetchAnalysisById } from '@/lib/supabase';
import { getRequestContext } from '@/lib/serverSupabaseClient';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ success: false, error: 'Missing id' }, { status: 400 });
  }

  try {
    const ctx = getRequestContext();
    const analysis = await fetchAnalysisById(id, ctx);
    return NextResponse.json({ success: true, data: analysis });
  } catch (error) {
    const status = 404;
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Not found' },
      { status }
    );
  }
}
