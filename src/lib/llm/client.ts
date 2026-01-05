import OpenAI from 'openai';

const DEFAULT_MODEL = 'gpt-5.2';

export function getLLMModelName(): string {
  const envModel = process.env.LLM_MODEL_NAME;

  if (envModel !== undefined) {
    const trimmed = envModel.trim();

    if (!trimmed) {
      throw new Error('LLM_MODEL_NAME is set but empty. Provide a valid model name.');
    }

    return trimmed;
  }

  return DEFAULT_MODEL;
}

const apiKey = process.env.OPENAI_API_KEY?.trim();
if (!apiKey) {
  throw new Error('OPENAI_API_KEY is missing or empty. Set it in your environment before running LLM calls.');
}

export const openai = new OpenAI({
  apiKey,
});
