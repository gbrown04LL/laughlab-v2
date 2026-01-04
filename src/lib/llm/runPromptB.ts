import { openai, getLLMModelName } from '@/lib/llm/client';
import { PROMPT_B_SYSTEM } from '@/lib/llm/promptB';
import { validatePromptB } from '@/lib/llm/validatePromptB';
import type { NormalizedAnalysis } from '@/lib/llm/validatePromptA';
import type OpenAI from 'openai';

interface RunPromptBParams {
  analysis: NormalizedAnalysis;
}

function buildUserMessage(analysis: NormalizedAnalysis): string {
  const payload = {
    metrics: analysis.metrics,
    gapAnalysis: analysis.gaps,
    characterAnalysis: analysis.characters,
    recommendations: analysis.gaps.recommendations,
  };
  return `Generate coaching feedback for this analysis. Follow the system formatting rules strictly.\n\nDATA:\n${JSON.stringify(
    payload
  )}`;
}

export async function runPromptB({
  analysis,
}: RunPromptBParams): Promise<string> {
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: PROMPT_B_SYSTEM },
    { role: 'user', content: buildUserMessage(analysis) },
  ];

  let attempts = 0;
  let lastError = '';

  while (attempts < 2) {
    const response = await openai.chat.completions.create({
      model: getLLMModelName(),
      messages,
      max_tokens: 1024,
      temperature: 0.3,
    });

    const content = response.choices[0]?.message?.content;
    if (content) {
      const validation = validatePromptB(content);
      if (validation.ok) {
        return validation.value;
      }
      lastError = validation.error;
    } else {
      lastError = 'Missing text response';
    }

    attempts += 1;
    const assistantMessage = response.choices[0]?.message;
    if (assistantMessage) {
      messages.push(assistantMessage);
    }
    messages.push({
      role: 'user',
      content: 'Fix formatting: exactly 3 paragraphs and end with the required line.',
    });
  }

  throw new Error(`Prompt B failed after retries: ${lastError || 'Unknown error'}`);
}
