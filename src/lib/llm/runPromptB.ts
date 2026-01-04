import { PROMPT_B_SYSTEM } from '@/lib/llm/promptB';
import { validatePromptB } from '@/lib/llm/validatePromptB';
import type { NormalizedAnalysis } from '@/lib/llm/validatePromptA';
import { callChatGPTWithRetry, createChatCompletion, type ChatMessage } from '@/lib/llm/chatgptRequest';

interface RunPromptBParams {
  analysis: NormalizedAnalysis;
  requestId?: string;
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
  requestId = 'unknown',
}: RunPromptBParams): Promise<string> {
  const messages: ChatMessage[] = [
    { role: 'system', content: PROMPT_B_SYSTEM },
    { role: 'user', content: buildUserMessage(analysis) },
  ];

  let attempts = 0;
  let lastError = '';

  while (attempts < 2) {
    const response = await callChatGPTWithRetry(
      { requestId, promptLabel: 'B' },
      (signal) =>
        createChatCompletion(
          {
            messages,
            temperature: 0.3,
            max_tokens: 1024,
          },
          signal
        )
    );

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
    messages.push({
      role: 'assistant',
      content: response.choices[0]?.message?.content ?? '',
    });
    messages.push({
      role: 'user',
      content: 'Fix formatting: exactly 3 paragraphs and end with the required line.',
    });
  }

  return fallbackFeedback(analysis);
}
