// ===========================================
// LAUGH LAB PRO - CENTRAL CONFIGURATION
// ===========================================
// This file is the SINGLE SOURCE OF TRUTH for all limits and constants.
// Do NOT hardcode these values elsewhere in the codebase.

/**
 * Script size limits
 */
export const SCRIPT_LIMITS = {
  /** Maximum script length in characters */
  MAX_CHARS: parseInt(process.env.SCRIPT_MAX_CHARS || '150000', 10),
  /** Maximum script length in tokens (estimated) */
  MAX_TOKENS: parseInt(process.env.SCRIPT_MAX_TOKENS || '50000', 10),
  /** Minimum script length in characters */
  MIN_CHARS: 100,
  /** Maximum pages (estimated at 250 words/page, 5 chars/word) */
  MAX_PAGES: 120,
} as const;

/**
 * Rate limiting configuration
 */
export const RATE_LIMITS = {
  /** Maximum analyses per minute per fingerprint/user */
  ANALYSES_PER_MINUTE: parseInt(process.env.RATE_LIMIT_PER_MINUTE || '5', 10),
  /** Maximum analyses per hour per fingerprint/user */
  ANALYSES_PER_HOUR: parseInt(process.env.RATE_LIMIT_PER_HOUR || '20', 10),
  /** Maximum analyses per day per fingerprint/user */
  ANALYSES_PER_DAY: parseInt(process.env.RATE_LIMIT_PER_DAY || '50', 10),
} as const;

/**
 * Tier-based monthly quotas
 */
export const TIER_QUOTAS = {
  free: {
    analysesPerMonth: 2,
    maxScriptChars: 50000,
    promptBEnabled: false,
    characterAnalysis: false,
    callbackAnalysis: false,
    exportPdf: false,
  },
  starter: {
    analysesPerMonth: Infinity,
    maxScriptChars: 100000,
    promptBEnabled: true,
    characterAnalysis: false,
    callbackAnalysis: false,
    exportPdf: false,
  },
  professional: {
    analysesPerMonth: Infinity,
    maxScriptChars: 150000,
    promptBEnabled: true,
    characterAnalysis: true,
    callbackAnalysis: true,
    exportPdf: true,
  },
  enterprise: {
    analysesPerMonth: Infinity,
    maxScriptChars: 200000,
    promptBEnabled: true,
    characterAnalysis: true,
    callbackAnalysis: true,
    exportPdf: true,
  },
} as const;

export type UserTier = keyof typeof TIER_QUOTAS;

/**
 * Request timeout configuration (in milliseconds)
 */
export const TIMEOUTS = {
  /** LLM request timeout */
  LLM_REQUEST_MS: parseInt(process.env.LLM_TIMEOUT_MS || '120000', 10),
  /** Database query timeout */
  DB_QUERY_MS: parseInt(process.env.DB_TIMEOUT_MS || '30000', 10),
  /** Job heartbeat interval */
  JOB_HEARTBEAT_MS: 30000,
  /** Job stuck timeout (minutes) */
  JOB_STUCK_TIMEOUT_MINUTES: 15,
} as const;

/**
 * LLM configuration
 */
export const LLM_CONFIG = {
  /** Model name (from environment) */
  MODEL_NAME: process.env.LLM_MODEL_NAME || 'gpt-5.2',
  /** Maximum retries for LLM requests */
  MAX_RETRIES: parseInt(process.env.LLM_MAX_RETRIES || '3', 10),
  /** Retry delay base (exponential backoff) */
  RETRY_DELAY_BASE_MS: 1000,
  /** Temperature for analysis prompts */
  TEMPERATURE: 0.7,
  /** Max tokens for response */
  MAX_RESPONSE_TOKENS: parseInt(process.env.LLM_MAX_RESPONSE_TOKENS || '8000', 10),
} as const;

/**
 * Data retention configuration
 */
export const DATA_RETENTION = {
  /** Free tier script retention (days) */
  FREE_TIER_SCRIPT_DAYS: 7,
  /** Paid tier script retention (days) */
  PAID_TIER_SCRIPT_DAYS: 365,
  /** Report retention (days) - all tiers */
  REPORT_RETENTION_DAYS: 365,
  /** Usage counter cleanup (days) */
  USAGE_COUNTER_CLEANUP_DAYS: 90,
} as const;

/**
 * Validation thresholds
 */
export const VALIDATION_THRESHOLDS = {
  /** Minimum overall score */
  MIN_SCORE: 0,
  /** Maximum overall score */
  MAX_SCORE: 100,
  /** Minimum jokes to be considered valid */
  MIN_JOKES: 0,
  /** Maximum jokes (sanity check) */
  MAX_JOKES: 500,
  /** Minimum LPM */
  MIN_LPM: 0,
  /** Maximum LPM (sanity check) */
  MAX_LPM: 10,
} as const;

/**
 * Feature flags
 */
export const FEATURE_FLAGS = {
  /** Enable Prompt B for enhanced analysis */
  PROMPT_B_ENABLED: process.env.FEATURE_PROMPT_B_ENABLED !== 'false',
  /** Enable character analysis */
  CHARACTER_ANALYSIS_ENABLED: process.env.FEATURE_CHARACTER_ANALYSIS !== 'false',
  /** Enable callback analysis */
  CALLBACK_ANALYSIS_ENABLED: process.env.FEATURE_CALLBACK_ANALYSIS !== 'false',
  /** Enable evaluation harness */
  EVAL_HARNESS_ENABLED: process.env.FEATURE_EVAL_HARNESS === 'true',
} as const;

/**
 * Get tier configuration for a user
 */
export function getTierConfig(tier: UserTier) {
  return TIER_QUOTAS[tier] || TIER_QUOTAS.free;
}

/**
 * Check if a script exceeds the tier's character limit
 */
export function isScriptTooLarge(charCount: number, tier: UserTier): boolean {
  const config = getTierConfig(tier);
  return charCount > config.maxScriptChars;
}

/**
 * Check if user has exceeded their monthly quota
 */
export function hasExceededQuota(analysesThisMonth: number, tier: UserTier): boolean {
  const config = getTierConfig(tier);
  return analysesThisMonth >= config.analysesPerMonth;
}

/**
 * Check if a feature is available for a tier
 */
export function isFeatureAvailable(feature: keyof typeof TIER_QUOTAS.free, tier: UserTier): boolean {
  const config = getTierConfig(tier);
  return Boolean(config[feature]);
}
