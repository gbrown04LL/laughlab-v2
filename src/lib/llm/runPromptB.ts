import Anthropic from '@anthropic-ai/sdk';
import { anthropic, getAnthropicModelName } from '@/lib/llm/client';
import { PROMPT_B_SYSTEM } from '@/lib/llm/promptB';
import { validatePromptB } from '@/lib/llm/validatePromptB';
import type { NormalizedAnalysis } from '@/lib/llm/validatePromptA';

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
  const baseMessage: Anthropic.MessageParam = {
    role: 'user',
    content: [{ type: 'text', text: buildUserMessage(analysis) }],
  };

  const messages: Anthropic.MessageParam[] = [baseMessage];
  let attempts = 0;
  let lastError = '';

  while (attempts < 2) {
    const response = await anthropic.messages.create({
      model: getAnthropicModelName(),
      max_tokens: 1024,
      temperature: 0.3,
      system: PROMPT_B_SYSTEM,
      messages,
    });

    const textBlock = response.content.find((block) => block.type === 'text');
    if (textBlock && textBlock.type === 'text') {
      const validation = validatePromptB(textBlock.text);
      if (validation.ok) {
        return validation.value;
      }
      lastError = validation.error;
    } else {
      lastError = 'Missing text response';
    }

    attempts += 1;
    messages.push({ role: 'assistant', content: response.content });
    messages.push({
      role: 'user',
      content: [
        {
          type: 'text',
          text: 'Fix formatting: exactly 3 paragraphs and end with the required line.',
        },
      ],
    });
  }

  throw new Error(`Prompt B failed after retries: ${lastError || 'Unknown error'}`);
}
