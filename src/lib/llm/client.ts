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

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});
