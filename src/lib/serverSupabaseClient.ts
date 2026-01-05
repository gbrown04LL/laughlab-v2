import { cookies, headers } from 'next/headers';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';

export type RequestContext = {
  userId?: string;
  sessionId?: string;
};

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

function ensureConfig() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase configuration missing: SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }
}

export function getRequestContext(): RequestContext {
  const headerStore = headers();
  const cookieStore = cookies();
  const userId = headerStore.get('x-user-id') ?? undefined;
  const existingSession = cookieStore.get('ll_guest_session')?.value;
  const sessionId = existingSession ?? randomUUID();

  if (!existingSession) {
    cookieStore.set({
      name: 'll_guest_session',
      value: sessionId,
      httpOnly: true,
      sameSite: 'lax',
      secure: true,
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });
  }

  return { userId, sessionId };
}

export function getSupabaseRlsClient(ctx: RequestContext): SupabaseClient {
  ensureConfig();
  if (!ctx.userId && !ctx.sessionId) {
    throw new Error('Missing Supabase context: provide userId or sessionId');
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: ctx.sessionId
        ? {
            'X-Session-Id': ctx.sessionId,
          }
        : undefined,
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
