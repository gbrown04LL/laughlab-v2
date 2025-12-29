import Anthropic from '@anthropic-ai/sdk';
import { anthropic } from '@/lib/llm/client';
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

function fallbackFeedback(analysis: NormalizedAnalysis): string {
  const lpm = analysis.metrics.laughsPerMinute.toFixed(1);
  const lpj = analysis.metrics.linesPerJoke.toFixed(1);
  const retention =
    analysis.gaps.retentionCliff &&
    `A late gap spans lines ${analysis.gaps.retentionCliff.startLine}-${analysis.gaps.retentionCliff.endLine}.`;
  const gap =
    analysis.gaps.gaps[0] &&
    `Noticeable gap around lines ${analysis.gaps.gaps[0].startLine}-${analysis.gaps.gaps[0].endLine}.`;
  const character =
    analysis.characters.characters[0] &&
    `${analysis.characters.characters[0].name} carries ${analysis.characters.characters[0].jokeCount} jokes.`;

  const gapLine = retention || gap || 'No major retention cliff detected yet.';
  const characterLine = character || 'Joke load is not yet assigned to characters.';

  return [
    `LaughsPerMinute sits at ${lpm} with linesPerJoke at ${lpj}, setting a clear baseline while ${gapLine}`,
    `Let’s tighten pacing by turning that note into punchlines and balancing delivery so ${characterLine}`,
    'Next, increase early joke density, make each beat land a punchline, and share the laugh lines across characters. Ready to analyze some punchline gaps?',
  ].join('\n\n');
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
      model: 'claude-sonnet-4-20250514',
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

  return fallbackFeedback(analysis);
}
