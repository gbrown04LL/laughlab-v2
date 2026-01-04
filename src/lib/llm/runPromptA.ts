import Anthropic from '@anthropic-ai/sdk';
import type { ScriptFormat } from '@/types';
import { anthropic, getAnthropicModelName } from '@/lib/llm/client';
import { PROMPT_A_SYSTEM } from '@/lib/llm/promptA';
import { PROMPT_A_TOOL } from '@/lib/llm/tools/promptA.tool';
import { translatePromptAToFullAnalysis, type PromptARaw } from '@/lib/llm/translatePromptAToFullAnalysis';
import { validateAndSanitizeAnalysis } from '@/lib/validation';
import type { ValidatedAnalysisResponse } from '@/lib/validation';

interface RunPromptAParams {
  script: string;
  format: ScriptFormat;
  title: string;
}

export async function runPromptA({
  script,
  format,
  title,
}: RunPromptAParams): Promise<ValidatedAnalysisResponse> {
  const messages: Anthropic.MessageParam[] = [
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: `Analyze this comedy script and call the tool with the full analysis object.\nFormat: ${format}\nTitle: ${title}\n\nSCRIPT:\n${script}`,
        },
      ],
    },
  ];

  let attempts = 0;
  let lastError = '';

  while (attempts < 2) {
    const response = await anthropic.messages.create({
      model: getAnthropicModelName(),
      max_tokens: 8192,
      temperature: 0,
      system: PROMPT_A_SYSTEM,
      tools: [PROMPT_A_TOOL],
      tool_choice: { type: 'tool', name: 'analyze_script' },
      messages,
    });

    const toolUse = response.content.find((block) => block.type === 'tool_use');
    if (!toolUse || toolUse.type !== 'tool_use') {
      lastError = 'Missing tool_use block';
    } else {
      try {
        const translated = translatePromptAToFullAnalysis(toolUse.input as PromptARaw);
        const validated = validateAndSanitizeAnalysis(translated);
        return validated;
      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Translation failed';
      }
    }

    attempts += 1;
    messages.push({ role: 'assistant', content: response.content });
    messages.push({
      role: 'user',
      content: [
        {
          type: 'text',
          text: `Your tool output failed validation because: ${lastError}. Fix your JSON output to conform to the schema and call the tool again.`,
        },
      ],
    });
  }

  throw new Error(`Prompt A failed after retries: ${lastError}`);
}
