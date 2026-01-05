import OpenAI from 'openai';
import { env } from '@/lib/env';

/**
 * Get the configured LLM model name.
 * 
 * This function returns the model name from the validated environment.
 * No fallback or default is provided - the env var MUST be set.
 * 
 * @returns {string} The LLM model name (e.g., "gpt-5.2")
 */
export function getLLMModelName(): string {
  return env.LAUGHLAB_LLM_MODEL;
}

/**
 * Configured OpenAI client instance.
 * 
 * This client is initialized with the validated API key from the environment.
 * If the API key is missing or invalid, the env module will throw at startup.
 */
export const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
});
