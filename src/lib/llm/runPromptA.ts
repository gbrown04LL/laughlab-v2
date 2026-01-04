import type { ScriptFormat } from '@/types';
import { openai, getLLMModelName } from '@/lib/llm/client';
import { PROMPT_A_SYSTEM } from '@/lib/llm/promptA';
import { PROMPT_A_TOOL } from '@/lib/llm/tools/promptA.tool';
import { translatePromptAToFullAnalysis, type PromptARaw } from '@/lib/llm/translatePromptAToFullAnalysis';
import { validateAndSanitizeAnalysis } from '@/lib/validation';
import type { ValidatedAnalysisResponse } from '@/lib/validation';
import type OpenAI from 'openai';

interface RunPromptAParams {
  script: string;
  format: ScriptFormat;
  title: string;
  requestId?: string;
}

export async function runPromptA({
  script,
  format,
  title,
}: RunPromptAParams): Promise<ValidatedAnalysisResponse> {
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    {
      role: 'system',
      content: PROMPT_A_SYSTEM,
    },
    {
      role: 'user',
      content: `Analyze this comedy script and call the tool with the full analysis object.\nFormat: ${format}\nTitle: ${title}\n\nSCRIPT:\n${script}`,
    },
  ];

  const tools: OpenAI.Chat.ChatCompletionTool[] = [
    {
      type: 'function',
      function: {
        name: 'analyze_script',
        description: PROMPT_A_TOOL.description,
        parameters: PROMPT_A_TOOL.input_schema,
      },
    },
  ];

  let attempts = 0;
  let lastError = '';

  while (attempts < 2) {
    const response = await openai.chat.completions.create({
      model: getLLMModelName(),
      messages,
      tools,
      tool_choice: { type: 'function', function: { name: 'analyze_script' } },
      temperature: 0,
    });

    const toolCall = response.choices[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.type !== 'function') {
      lastError = 'Missing tool_call block';
    } else {
      try {
        const parsedInput = JSON.parse(toolCall.function.arguments) as PromptARaw;
        const translated = translatePromptAToFullAnalysis(parsedInput);
        const validated = validateAndSanitizeAnalysis(translated);
        return validated;
      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Translation failed';
      }
    }

    attempts += 1;
    const assistantMessage = response.choices[0]?.message;
    if (assistantMessage) {
      messages.push(assistantMessage);
    }
    messages.push({
      role: 'user',
      content: `Your tool output failed validation because: ${lastError}. Fix your JSON output to conform to the schema and call the tool again.`,
    });
  }

  throw new Error(`Prompt A failed after retries: ${lastError}`);
}
