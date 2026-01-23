import Anthropic from '@anthropic-ai/sdk';

const DEFAULT_MODEL = 'claude-3-5-sonnet-20240620';

export function getAnthropicModelName(): string {
  const envModel = process.env.LLM_MODEL_NAME;

  if (envModel !== undefined) {
    const trimmed = envModel.trim();

    if (!trimmed) {
      throw new Error('LLM_MODEL_NAME is set but empty. Provide a valid Anthropic model name.');
    }

    const allowedPrefixes = ['claude-', 'gpt-'];
    if (!allowedPrefixes.some((prefix) => trimmed.startsWith(prefix))) {
      throw new Error(
        `LLM_MODEL_NAME="${trimmed}" is invalid. Expected model to start with one of: ${allowedPrefixes.join(', ')}.`
      );
    }

    return trimmed;
  }

  if (!DEFAULT_MODEL) {
    throw new Error('LLM model name is not configured. Set LLM_MODEL_NAME to a supported model.');
  }

  return DEFAULT_MODEL;
}

let _anthropic: Anthropic | null = null;

function getAnthropicClient(): Anthropic {
  if (_anthropic) {
    return _anthropic;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY || '';

  _anthropic = new Anthropic({
    apiKey,
  });

  return _anthropic;
}

export const anthropic = new Proxy({} as Anthropic, {
  get(_target, prop) {
    const client = getAnthropicClient();
    const value = client[prop as keyof Anthropic];
    return typeof value === 'function' ? value.bind(client) : value;
  },
});
