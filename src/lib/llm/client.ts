import Anthropic from '@anthropic-ai/sdk';

const DEFAULT_MODEL = 'claude-3-5-sonnet-20240620';

export function getAnthropicModelName(): string {
  const envModel = process.env.LLM_MODEL_NAME;

  if (envModel !== undefined) {
    const trimmed = envModel.trim();

    if (!trimmed) {
      throw new Error('LLM_MODEL_NAME is set but empty. Provide a valid Anthropic model name.');
    }

    if (!trimmed.startsWith('claude-')) {
      throw new Error(`LLM_MODEL_NAME="${trimmed}" is invalid. Expected an Anthropic Claude model identifier.`);
    }

    return trimmed;
  }

  if (!DEFAULT_MODEL) {
    throw new Error('LLM model name is not configured. Set LLM_MODEL_NAME to a supported model.');
  }

  return DEFAULT_MODEL;
}

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});
