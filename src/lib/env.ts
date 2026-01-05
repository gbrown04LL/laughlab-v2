/**
 * Centralized Environment Variable Validation
 * 
 * This module validates all required environment variables at startup using Zod.
 * It enforces type safety and provides clear error messages for missing or invalid variables.
 * 
 * CANONICAL SOURCE: This is the single source of truth for environment variable access.
 * All server-side code MUST import env vars from this module, not directly from process.env.
 * 
 * @module env
 */

import { z } from 'zod';

/**
 * Server-side environment variable schema.
 * These variables MUST NEVER be exposed to client code.
 */
const serverEnvSchema = z.object({
  // ============================================
  // REQUIRED - OpenAI Configuration
  // ============================================
  
  /**
   * OpenAI API Key (required)
   * Get from: https://platform.openai.com/api-keys
   */
  OPENAI_API_KEY: z
    .string()
    .min(1, 'OPENAI_API_KEY is required')
    .startsWith('sk-', 'OPENAI_API_KEY must start with "sk-"'),

  /**
   * LLM Model Name (required)
   * Must be explicitly set - no defaults allowed.
   * Example: "gpt-5.2", "gpt-4-turbo", etc.
   */
  LAUGHLAB_LLM_MODEL: z
    .string()
    .min(1, 'LAUGHLAB_LLM_MODEL is required and must not be empty')
    .refine(
      (val) => val.trim().length > 0,
      'LAUGHLAB_LLM_MODEL cannot be whitespace only'
    ),

  // ============================================
  // OPTIONAL - OpenAI Configuration
  // ============================================
  
  /**
   * OpenAI API URL (optional)
   * Override for custom endpoints or proxies.
   * Default: https://api.openai.com/v1/chat/completions
   */
  OPENAI_API_URL: z
    .string()
    .url('OPENAI_API_URL must be a valid URL')
    .optional(),

  // ============================================
  // OPTIONAL - Supabase Server Configuration
  // ============================================
  
  /**
   * Supabase Project URL (optional, for server-side persistence)
   * Can fall back to NEXT_PUBLIC_SUPABASE_URL if not set.
   */
  SUPABASE_URL: z
    .string()
    .url('SUPABASE_URL must be a valid URL')
    .optional(),

  /**
   * Supabase Service Role Key (optional, for server-side admin operations)
   * This key has elevated privileges and MUST NEVER be exposed to clients.
   */
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(1)
    .optional(),

  /**
   * Alias for SUPABASE_SERVICE_ROLE_KEY (optional)
   * Some deployments use this naming convention.
   */
  SUPABASE_SERVICE_KEY: z
    .string()
    .min(1)
    .optional(),

  // ============================================
  // PUBLIC - Client-Exposed Variables
  // ============================================
  // These are safe to expose to client code via NEXT_PUBLIC_ prefix
  
  /**
   * Supabase Project URL (public, for client-side SDK)
   */
  NEXT_PUBLIC_SUPABASE_URL: z
    .string()
    .url('NEXT_PUBLIC_SUPABASE_URL must be a valid URL')
    .optional(),

  /**
   * Supabase Anonymous Key (public, for client-side SDK)
   * This key is safe to expose as it's protected by RLS policies.
   */
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(1)
    .optional(),

  // ============================================
  // SYSTEM - Node Environment
  // ============================================
  
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .optional()
    .default('development'),
});

/**
 * Validated and typed environment variables.
 * This object is frozen and cannot be modified at runtime.
 */
export type ServerEnv = z.infer<typeof serverEnvSchema>;

/**
 * Parse and validate environment variables.
 * This function is called at module load time and will throw if validation fails.
 */
function validateEnv(): ServerEnv {
  try {
    const parsed = serverEnvSchema.parse(process.env);
    return Object.freeze(parsed);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors
        .map((err) => `  - ${err.path.join('.')}: ${err.message}`)
        .join('\n');

      console.error(
        '❌ Environment variable validation failed:\n\n' +
        missingVars +
        '\n\n' +
        '💡 Fix: Add missing variables to your .env.local file or deployment environment.\n' +
        '📖 See .env.example for reference.\n'
      );
    }
    throw error;
  }
}

/**
 * Validated environment variables (server-only).
 * 
 * ⚠️ SECURITY WARNING:
 * This object contains sensitive secrets and MUST ONLY be imported in server-side code:
 * - API routes (src/app/api/**/route.ts)
 * - Server-only libraries (src/lib/**/server*.ts)
 * 
 * DO NOT import this in:
 * - Client components (files with 'use client' directive)
 * - Client-side code (client/ directory)
 * - Shared utilities that run on both client and server
 * 
 * @example
 * ```typescript
 * import { env } from '@/lib/env';
 * 
 * const openai = new OpenAI({
 *   apiKey: env.OPENAI_API_KEY,
 * });
 * ```
 */
export const env = validateEnv();

/**
 * Type-safe helper to check if Supabase is configured.
 * Returns true if both URL and service role key are available.
 */
export function isSupabaseConfigured(): boolean {
  const url = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_KEY;
  return Boolean(url && key);
}

/**
 * Type-safe helper to get Supabase configuration.
 * Returns null if not fully configured.
 */
export function getSupabaseConfig(): { url: string; serviceKey: string } | null {
  const url = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_KEY;

  if (!url || !serviceKey) {
    return null;
  }

  return { url, serviceKey };
}
