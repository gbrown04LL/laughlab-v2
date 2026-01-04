/**
 * Lightweight OpenAI API client with retry logic and timeouts.
 * Used for non-streaming chat completions.
 */

export type PromptLabel = 'A' | 'B' | 'coach' | 'format';

const OPENAI_API_URL = process.env.OPENAI_API_URL ?? 'https://api.openai.com/v1/chat/completions';
const DEFAULT_MODEL = 'gpt-5.2';
const CHATGPT_TIMEOUT_MS = 60000; // 60s
const MAX_ATTEMPTS = 3;
const BASE_BACKOFF_MS = [1000, 2000, 4000];
const JITTER_MAX_MS = 500;

export class UpstreamError extends Error {
  statusCode: number;
  promptLabel: PromptLabel;
  constructor(message: string, options: { statusCode: number; promptLabel: PromptLabel }) {
    super(message);
    this.statusCode = options.statusCode;
    this.promptLabel = options.promptLabel;
  }
}

class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TimeoutError';
  }
}

class OpenAIHTTPError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, message: string, body: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

export type ChatToolFunction = {
  type: 'function';
  function: {
    name: string;
    description?: string;
    parameters: Record<string, unknown>;
  };
};

export type ChatMessage =
  | { role: 'system'; content: string }
  | { role: 'user'; content: string }
  | {
      role: 'assistant';
      content: string | null;
      tool_calls?: Array<{
        id: string;
        type: 'function';
        function: { name: string; arguments: string };
      }>;
    };

export interface ChatCompletionRequest {
  model?: string;
  messages: ChatMessage[];
  tools?: ChatToolFunction[];
  tool_choice?: 'none' | 'auto' | { type: 'function'; function: { name: string } };
  temperature?: number;
  max_tokens?: number;
}

export interface ChatCompletionResponse {
  choices: Array<{
    message: {
      content: string | null;
      role: 'assistant';
      tool_calls?: Array<{
        id: string;
        type: 'function';
        function: { name: string; arguments: string };
      }>;
    };
  }>;
}

function shouldRetry(error: unknown): boolean {
  if (error instanceof TimeoutError) return true;
  if (error instanceof OpenAIHTTPError) {
    if (error.status === 429) return true;
    if (error.status === 408) return true;
    if (error.status >= 500) return true;
    return false;
  }
  if (error instanceof Error) {
    if (error.name === 'AbortError') return true;
    const message = error.message.toLowerCase();
    const networkHints = ['network', 'socket', 'timeout', 'econn', 'fetch failed'];
    if (networkHints.some((hint) => message.includes(hint))) return true;
  }
  return false;
}

function deriveStatusCode(error: unknown): number {
  if (error instanceof TimeoutError) return 504;
  if (error instanceof OpenAIHTTPError) {
    if (error.status === 429) return 429;
    if (error.status >= 500) return 502;
    if (error.status === 408) return 504;
    return error.status;
  }
  if (error instanceof Error && error.name === 'AbortError') return 504;
  return 502;
}

function withTimeout<T>(
  requestId: string,
  promptLabel: PromptLabel,
  fn: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number = CHATGPT_TIMEOUT_MS
): Promise<T> {
  const controller = new AbortController();

  return new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(() => {
      controller.abort();
      reject(new TimeoutError(`ChatGPT ${promptLabel} timed out after ${timeoutMs}ms [${requestId}]`));
    }, timeoutMs);

    fn(controller.signal)
      .then((result) => {
        clearTimeout(timeout);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timeout);
        reject(error);
      });
  });
}

function jitterDelay(baseMs: number): number {
  return baseMs + Math.floor(Math.random() * JITTER_MAX_MS);
}

export async function createChatCompletion(
  payload: ChatCompletionRequest,
  signal?: AbortSignal
): Promise<ChatCompletionResponse> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new OpenAIHTTPError(500, 'Missing OPENAI_API_KEY', null);
  }

  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: payload.model ?? process.env.LLM_MODEL_NAME ?? DEFAULT_MODEL,
      ...payload,
    }),
    signal,
  });

  if (!response.ok) {
    let body: unknown = null;
    try {
      body = await response.json();
    } catch {
      body = await response.text();
    }
    throw new OpenAIHTTPError(response.status, `OpenAI request failed with status ${response.status}`, body);
  }

  return (await response.json()) as ChatCompletionResponse;
}

export async function callChatGPTWithRetry<T>(
  params: {
    requestId: string;
    promptLabel: PromptLabel;
    timeoutMs?: number;
  },
  fn: (signal: AbortSignal) => Promise<T>
): Promise<T> {
  const { requestId, promptLabel, timeoutMs = CHATGPT_TIMEOUT_MS } = params;
  let attempt = 0;
  let lastError: unknown;

  while (attempt < MAX_ATTEMPTS) {
    attempt += 1;
    try {
      return await withTimeout(requestId, promptLabel, fn, timeoutMs);
    } catch (error) {
      lastError = error;
      const retryable = shouldRetry(error);
      console.warn(
        `[ChatGPT][${promptLabel}][${requestId}] attempt ${attempt} failed (${retryable ? 'retryable' : 'fatal'})`,
        error
      );

      if (!retryable || attempt >= MAX_ATTEMPTS) {
        const statusCode = deriveStatusCode(error);
        throw new UpstreamError(`ChatGPT ${promptLabel} failed after ${attempt} attempt(s)`, {
          statusCode,
          promptLabel,
        });
      }

      const backoffIndex = Math.min(attempt - 1, BASE_BACKOFF_MS.length - 1);
      const delayMs = jitterDelay(BASE_BACKOFF_MS[backoffIndex]);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  const statusCode = deriveStatusCode(lastError);
  throw new UpstreamError(`ChatGPT ${promptLabel} failed after retries`, {
    statusCode,
    promptLabel,
  });
}
