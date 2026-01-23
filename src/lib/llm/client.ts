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

let _openai: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (_openai) {
    return _openai;
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is missing or empty. Set it in your environment before running LLM calls.');
  }

  _openai = new OpenAI({
    apiKey,
  });

  return _openai;
}

export const openai = new Proxy({} as OpenAI, {
  get(_target, prop) {
    const client = getOpenAIClient();
    const value = client[prop as keyof OpenAI];
    return typeof value === 'function' ? value.bind(client) : value;
  },
});
