import type { MessageParam } from '@anthropic-ai/sdk/resources/messages';
import { anthropic, getAnthropicModelName } from '@/lib/llm/anthropic_client';

const ANTHROPIC_TIMEOUT_MS = Number(process.env.ANTHROPIC_TIMEOUT_MS ?? process.env.LLM_TIMEOUT_MS ?? 15000);
const ANTHROPIC_MAX_ATTEMPTS = 3;
const BASE_BACKOFF_MS = 1000;

function isRetryableStatus(status: number | null): boolean {
  if (status === null) return false;
  if (status === 429 || status === 408) return true;
  return status >= 500;
}

export interface AnthropicCompletionResult {
  telemetry: { model: string; latencyMs: number; attempts: number };
  response: unknown;
}

export async function callAnthropicWithBackoff(params: {
  messages: MessageParam[];
  system?: string;
  maxTokens?: number;
}): Promise<AnthropicCompletionResult> {
  const model = getAnthropicModelName();
  let attempt = 0;
  let lastError: unknown;
  const startedAt = Date.now();

  while (attempt < ANTHROPIC_MAX_ATTEMPTS) {
    attempt += 1;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), ANTHROPIC_TIMEOUT_MS);

    try {
      const response = await anthropic.messages.create(
        {
          model,
          max_tokens: params.maxTokens ?? 1024,
          system: params.system,
          messages: params.messages,
        },
        {
          signal: controller.signal,
          timeout: ANTHROPIC_TIMEOUT_MS,
        }
      );

      clearTimeout(timeout);
      return {
        response,
        telemetry: { model, latencyMs: Date.now() - startedAt, attempts: attempt },
      };
    } catch (error) {
      clearTimeout(timeout);
      lastError = error;
      const status = typeof (error as any)?.status === 'number' ? (error as any).status : null;
      const retryable =
        isRetryableStatus(status) ||
        (error instanceof Error && (error.name === 'AbortError' || error.message.toLowerCase().includes('timeout')));

      console.warn(
        `[Anthropic] attempt ${attempt} failed${retryable && attempt < ANTHROPIC_MAX_ATTEMPTS ? ', retrying' : ''}`,
        error
      );

      if (!retryable || attempt >= ANTHROPIC_MAX_ATTEMPTS) {
        throw new Error(
          `Anthropic request failed after ${attempt} attempt(s): ${error instanceof Error ? error.message : 'unknown error'}`
        );
      }

      const backoff = Math.min(15000, BASE_BACKOFF_MS * 2 ** (attempt - 1));
      await new Promise((resolve) => setTimeout(resolve, backoff));
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Anthropic request failed after retries');
}
