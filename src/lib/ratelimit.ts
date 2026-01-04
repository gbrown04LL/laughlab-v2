// ===========================================
// LAUGH LAB PRO - RATE LIMITING & USAGE TRACKING
// ===========================================
// Persistent Supabase-backed rate limiter + usage tracking with calendar month reset

import type { UserTier } from '@/types';
import { getServerSupabaseClient } from '@/lib/serverSupabaseClient';

export class RateLimitStoreError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RateLimitStoreError';
  }
}

// ===========================================
// RATE LIMITING (IP-based)
// ===========================================

// Rate limit configuration
const RATE_LIMIT_CONFIG = {
  windowMs: 60 * 1000, // 1 minute window
  maxRequests: 5, // Max 5 requests per minute per IP
  maxRequestsPerDay: 20, // Max 20 requests per day per IP (free tier protection)
};

function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

function normalizeIdentifier(identifier: string): string {
  if (!identifier || identifier === 'unknown') {
    return 'anon-unknown';
  }
  return identifier;
}

function getWindowStart(windowMs: number): Date {
  const now = Date.now();
  const start = Math.floor(now / windowMs) * windowMs;
  const date = new Date(start);
  date.setMilliseconds(0);
  return date;
}

function getSupabaseOrThrow() {
  const supabase = getServerSupabaseClient();
  if (!supabase) {
    throw new RateLimitStoreError('Persistent usage store is not configured (missing Supabase credentials).');
  }
  return supabase;
}

async function incrementPersistentCounter(
  key: string,
  windowType: 'minute' | 'day' | 'month',
  windowStart: Date,
  amount: number = 1
): Promise<number> {
  const supabase = getSupabaseOrThrow();

  try {
    const { data, error } = await supabase.rpc('increment_usage_counter', {
      p_key: key,
      p_window_type: windowType,
      p_window_start: windowStart.toISOString(),
      p_amount: amount,
    });

    if (error) throw error;
    if (typeof data !== 'number') {
      throw new RateLimitStoreError('Supabase increment_usage_counter returned a non-numeric payload');
    }
    return data;
  } catch (error) {
    if (error instanceof RateLimitStoreError) throw error;
    const message = error instanceof Error ? error.message : 'Unknown Supabase error';
    throw new RateLimitStoreError(`Failed to increment usage counter: ${message}`);
  }
}

async function getPersistentCounter(
  key: string,
  windowType: 'minute' | 'day' | 'month',
  windowStart: Date
): Promise<number> {
  const supabase = getSupabaseOrThrow();

  try {
    const { data, error } = await supabase
      .from('usage_counters')
      .select('count')
      .eq('key', key)
      .eq('window_type', windowType)
      .eq('window_start', windowStart.toISOString())
      .maybeSingle();

    if (error) throw error;
    return data?.count ?? 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown Supabase error';
    throw new RateLimitStoreError(`Failed to read usage counters: ${message}`);
  }
}

export async function checkRateLimit(ip: string): Promise<{ allowed: boolean; retryAfter?: number; reason?: string }> {
  const now = Date.now();
  const today = getTodayString();
  const key = normalizeIdentifier(ip);

  const minuteStart = getWindowStart(RATE_LIMIT_CONFIG.windowMs);
  const dayStart = new Date(`${today}T00:00:00.000Z`);

  const minuteCount = await incrementPersistentCounter(key, 'minute', minuteStart);
  const dayCount = await incrementPersistentCounter(key, 'day', dayStart);

  if (minuteCount > RATE_LIMIT_CONFIG.maxRequests) {
    const retryAfter = Math.ceil((minuteStart.getTime() + RATE_LIMIT_CONFIG.windowMs - now) / 1000);
    return {
      allowed: false,
      retryAfter,
      reason: `Too many requests. Please wait ${retryAfter} seconds.`,
    };
  }

  if (dayCount > RATE_LIMIT_CONFIG.maxRequestsPerDay) {
    return {
      allowed: false,
      reason: 'Daily limit reached. Please try again tomorrow or upgrade your plan.',
    };
  }

  return { allowed: true };
}

// Cleanup old entries periodically (called on each request)
export function cleanupRateLimitStore(): void {
  // No-op; persistence handled by Supabase.
}

// ===========================================
// USAGE TRACKING (with calendar month reset)
// ===========================================

function getCurrentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function getMonthStartDate(monthKey: string): Date {
  return new Date(`${monthKey}-01T00:00:00.000Z`);
}

// Tier limits
const TIER_LIMITS: Record<UserTier, number> = {
  free: 2,
  starter: Infinity,
  professional: Infinity,
  enterprise: Infinity,
};

export async function checkUsageLimit(
  identifier: string, 
  tier: UserTier = 'free'
): Promise<{ allowed: boolean; remaining: number; limit: number; reason?: string }> {
  const monthKey = getCurrentMonthKey();
  const limit = TIER_LIMITS[tier];
  const key = normalizeIdentifier(identifier);
  const monthStart = getMonthStartDate(monthKey);

  const persistentCount = await getPersistentCounter(key, 'month', monthStart);
  const remaining = Math.max(0, limit - persistentCount);
  if (persistentCount >= limit) {
    return {
      allowed: false,
      remaining: 0,
      limit,
      reason: `You've used all ${limit} free analyses this month. Upgrade to continue.`,
    };
  }

  return { allowed: true, remaining, limit };
}

export async function incrementUsage(identifier: string): Promise<void> {
  const key = normalizeIdentifier(identifier);
  const monthKey = getCurrentMonthKey();
  const monthStart = getMonthStartDate(monthKey);

  await incrementPersistentCounter(key, 'month', monthStart, 1);
}

export async function getUsageStats(identifier: string): Promise<{ count: number; monthKey: string }> {
  const key = normalizeIdentifier(identifier);
  const monthKey = getCurrentMonthKey();
  const monthStart = getMonthStartDate(monthKey);
  const count = await getPersistentCounter(key, 'month', monthStart);
  return { count, monthKey };
}

// ===========================================
// HELPERS
// ===========================================

export function getClientIP(request: Request): string {
  // Try various headers in order of preference
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    // Take the first IP in the chain (client IP)
    return forwardedFor.split(',')[0].trim();
  }
  
  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }
  
  // Vercel-specific
  const vercelForwardedFor = request.headers.get('x-vercel-forwarded-for');
  if (vercelForwardedFor) {
    return vercelForwardedFor.split(',')[0].trim();
  }
  
  // Fallback
  return 'unknown';
}

// Generate a simple fingerprint from request headers
export function generateFingerprint(request: Request): string {
  const ip = getClientIP(request);
  const userAgent = request.headers.get('user-agent') || 'unknown';
  
  // Simple hash combining IP and user agent
  const combined = `${ip}:${userAgent.slice(0, 50)}`;
  
  // Basic hash
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  return `fp_${Math.abs(hash).toString(36)}`;
}
