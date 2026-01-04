// ===========================================
// LAUGH LAB PRO - RATE LIMITING & USAGE TRACKING
// ===========================================
// Simple in-memory rate limiter + usage tracking with calendar month reset

import type { UserTier } from '@/types';
import { getServerSupabaseClient } from '@/lib/serverSupabaseClient';

// ===========================================
// RATE LIMITING (IP-based)
// ===========================================

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory store (resets on cold start, but provides basic protection)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Rate limit configuration
const RATE_LIMIT_CONFIG = {
  windowMs: 60 * 1000, // 1 minute window
  maxRequests: 5, // Max 5 requests per minute per IP
  maxRequestsPerDay: 20, // Max 20 requests per day per IP (free tier protection)
};

// Daily tracking
const dailyStore = new Map<string, { count: number; resetDate: string }>();

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

async function incrementPersistentCounter(
  key: string,
  windowType: 'minute' | 'day' | 'month',
  windowStart: Date,
  amount: number = 1
): Promise<number | null> {
  const supabase = getServerSupabaseClient();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase.rpc('increment_usage_counter', {
      p_key: key,
      p_window_type: windowType,
      p_window_start: windowStart.toISOString(),
      p_amount: amount,
    });

    if (error) throw error;
    if (typeof data === 'number') return data;
    return null;
  } catch (error) {
    console.warn('[RateLimit] Supabase increment failed, falling back to memory', error);
    return null;
  }
}

async function getPersistentCounter(
  key: string,
  windowType: 'minute' | 'day' | 'month',
  windowStart: Date
): Promise<number | null> {
  const supabase = getServerSupabaseClient();
  if (!supabase) return null;

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
    console.warn('[RateLimit] Supabase read failed, falling back to memory', error);
    return null;
  }
}

export async function checkRateLimit(ip: string): Promise<{ allowed: boolean; retryAfter?: number; reason?: string }> {
  const now = Date.now();
  const today = getTodayString();
  const key = normalizeIdentifier(ip);

  // Try persistent counters first
  const minuteStart = getWindowStart(RATE_LIMIT_CONFIG.windowMs);
  const dayStart = new Date(`${today}T00:00:00.000Z`);

  const minuteCount = await incrementPersistentCounter(key, 'minute', minuteStart);
  const dayCount = await incrementPersistentCounter(key, 'day', dayStart);

  if (minuteCount !== null && dayCount !== null) {
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
  
  // Check per-minute rate limit
  const entry = rateLimitStore.get(key);
  
  if (entry) {
    if (now < entry.resetTime) {
      if (entry.count >= RATE_LIMIT_CONFIG.maxRequests) {
        const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
        return { 
          allowed: false, 
          retryAfter, 
          reason: `Too many requests. Please wait ${retryAfter} seconds.` 
        };
      }
      entry.count++;
    } else {
      // Window expired, reset
      entry.count = 1;
      entry.resetTime = now + RATE_LIMIT_CONFIG.windowMs;
    }
  } else {
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + RATE_LIMIT_CONFIG.windowMs,
    });
  }
  
  // Check daily limit
  const dailyEntry = dailyStore.get(key);
  
  if (dailyEntry) {
    if (dailyEntry.resetDate === today) {
      if (dailyEntry.count >= RATE_LIMIT_CONFIG.maxRequestsPerDay) {
        return { 
          allowed: false, 
          reason: 'Daily limit reached. Please try again tomorrow or upgrade your plan.' 
        };
      }
      dailyEntry.count++;
    } else {
      // New day, reset
      dailyEntry.count = 1;
      dailyEntry.resetDate = today;
    }
  } else {
    dailyStore.set(key, { count: 1, resetDate: today });
  }
  
  return { allowed: true };
}

// Cleanup old entries periodically (called on each request)
export function cleanupRateLimitStore(): void {
  const now = Date.now();
  const today = getTodayString();
  
  // Clean minute-based entries
  const rateLimitKeys = Array.from(rateLimitStore.keys());
  for (const ip of rateLimitKeys) {
    const entry = rateLimitStore.get(ip);
    if (entry && now > entry.resetTime + 60000) { // Keep for 1 extra minute
      rateLimitStore.delete(ip);
    }
  }
  
  // Clean daily entries
  const dailyKeys = Array.from(dailyStore.keys());
  for (const ip of dailyKeys) {
    const entry = dailyStore.get(ip);
    if (entry && entry.resetDate !== today) {
      dailyStore.delete(ip);
    }
  }
}

// ===========================================
// USAGE TRACKING (with calendar month reset)
// ===========================================

interface UsageEntry {
  count: number;
  monthKey: string; // "2025-01"
  tier: UserTier;
}

// In-memory usage store (keyed by fingerprint/IP for anonymous users)
const usageStore = new Map<string, UsageEntry>();

const fallbackUsageStore = usageStore;

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
  if (persistentCount !== null) {
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
  
  const entry = fallbackUsageStore.get(key);
  
  if (entry) {
    // Check if we're in a new month
    if (entry.monthKey !== monthKey) {
      // Reset for new month
      entry.count = 0;
      entry.monthKey = monthKey;
      entry.tier = tier;
    }
    
    const remaining = Math.max(0, limit - entry.count);
    
    if (entry.count >= limit) {
      return {
        allowed: false,
        remaining: 0,
        limit,
        reason: `You've used all ${limit} free analyses this month. Upgrade to continue.`,
      };
    }
    
    return { allowed: true, remaining, limit };
  }
  
  // New user
  fallbackUsageStore.set(key, {
    count: 0,
    monthKey,
    tier,
  });
  
  return { allowed: true, remaining: limit, limit };
}

export async function incrementUsage(identifier: string): Promise<void> {
  const key = normalizeIdentifier(identifier);
  const monthKey = getCurrentMonthKey();
  const monthStart = getMonthStartDate(monthKey);

  const incremented = await incrementPersistentCounter(key, 'month', monthStart, 1);
  if (incremented !== null) {
    return;
  }

  const entry = fallbackUsageStore.get(key);
  if (entry) {
    entry.count++;
    return;
  }

  fallbackUsageStore.set(key, {
    count: 1,
    monthKey,
    tier: 'free',
  });
}

export function getUsageStats(identifier: string): { count: number; monthKey: string } | null {
  const entry = usageStore.get(normalizeIdentifier(identifier));
  if (!entry) return null;
  
  // Check for month rollover
  const currentMonth = getCurrentMonthKey();
  if (entry.monthKey !== currentMonth) {
    entry.count = 0;
    entry.monthKey = currentMonth;
  }
  
  return { count: entry.count, monthKey: entry.monthKey };
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
