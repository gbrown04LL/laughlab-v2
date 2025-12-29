// ===========================================
// LAUGH LAB PRO - RATE LIMITING & USAGE TRACKING
// ===========================================
// Simple in-memory rate limiter + usage tracking with calendar month reset

import type { UserTier } from '@/types';

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

export function checkRateLimit(ip: string): { allowed: boolean; retryAfter?: number; reason?: string } {
  const now = Date.now();
  const today = getTodayString();
  
  // Check per-minute rate limit
  const entry = rateLimitStore.get(ip);
  
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
    rateLimitStore.set(ip, {
      count: 1,
      resetTime: now + RATE_LIMIT_CONFIG.windowMs,
    });
  }
  
  // Check daily limit
  const dailyEntry = dailyStore.get(ip);
  
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
    dailyStore.set(ip, { count: 1, resetDate: today });
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

function getCurrentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

// Tier limits
const TIER_LIMITS: Record<UserTier, number> = {
  free: 2,
  starter: Infinity,
  professional: Infinity,
  enterprise: Infinity,
};

export function checkUsageLimit(
  identifier: string, 
  tier: UserTier = 'free'
): { allowed: boolean; remaining: number; limit: number; reason?: string } {
  const monthKey = getCurrentMonthKey();
  const limit = TIER_LIMITS[tier];
  
  const entry = usageStore.get(identifier);
  
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
  usageStore.set(identifier, {
    count: 0,
    monthKey,
    tier,
  });
  
  return { allowed: true, remaining: limit, limit };
}

export function incrementUsage(identifier: string): void {
  const entry = usageStore.get(identifier);
  if (entry) {
    entry.count++;
  } else {
    // Entry should exist from checkUsageLimit(), but create it if missing
    console.warn('[Usage] incrementUsage called before checkUsageLimit for:', identifier.slice(0, 10));
    usageStore.set(identifier, {
      count: 1,
      monthKey: getCurrentMonthKey(),
      tier: 'free',
    });
  }
}

export function getUsageStats(identifier: string): { count: number; monthKey: string } | null {
  const entry = usageStore.get(identifier);
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

// Validate IP address format
function isValidIP(ip: string): boolean {
  // IPv4 regex
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  // IPv6 regex (simplified)
  const ipv6Regex = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/;

  if (!ipv4Regex.test(ip) && !ipv6Regex.test(ip)) {
    return false;
  }

  // For IPv4, validate octets are in range 0-255
  if (ipv4Regex.test(ip)) {
    const octets = ip.split('.');
    return octets.every(octet => {
      const num = parseInt(octet, 10);
      return num >= 0 && num <= 255;
    });
  }

  return true; // IPv6 basic validation passed
}

// Check if we're running on Vercel (trusted proxy environment)
function isTrustedProxyEnvironment(): boolean {
  return process.env.VERCEL === '1' || process.env.NODE_ENV === 'production';
}

export function getClientIP(request: Request): string {
  const isTrusted = isTrustedProxyEnvironment();

  // Only trust proxy headers in production/Vercel environments
  if (isTrusted) {
    // Vercel-specific header (most reliable on Vercel)
    const vercelForwardedFor = request.headers.get('x-vercel-forwarded-for');
    if (vercelForwardedFor) {
      const ip = vercelForwardedFor.split(',')[0].trim();
      if (isValidIP(ip)) {
        return ip;
      }
    }

    // Standard forwarded-for header
    const forwardedFor = request.headers.get('x-forwarded-for');
    if (forwardedFor) {
      // Take the first IP in the chain (client IP)
      const ip = forwardedFor.split(',')[0].trim();
      if (isValidIP(ip)) {
        return ip;
      }
    }

    const realIP = request.headers.get('x-real-ip');
    if (realIP && isValidIP(realIP)) {
      return realIP;
    }
  }

  // In development or if headers are invalid, use a fallback
  // This prevents IP spoofing in development environments
  return 'local-dev';
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
