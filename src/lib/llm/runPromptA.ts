import type { ScriptFormat } from '@/types';
import { PROMPT_A_SYSTEM } from '@/lib/llm/promptA';
import { PROMPT_A_TOOL } from '@/lib/llm/tools/promptA.tool';
import { callChatGPTWithRetry, createChatCompletion, type ChatMessage, type ChatToolFunction } from '@/lib/llm/chatgptRequest';
import { translatePromptAToFullAnalysis, type PromptARaw } from '@/lib/llm/translatePromptAToFullAnalysis';
import { validateAndSanitizeAnalysis } from '@/lib/validation';
import type { ValidatedAnalysisResponse } from '@/lib/validation';

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
  requestId = 'unknown',
}: RunPromptAParams): Promise<ValidatedAnalysisResponse> {
  const messages: ChatMessage[] = [
    { role: 'system', content: PROMPT_A_SYSTEM },
    {
      role: 'user',
      content: `Analyze this comedy script and call the tool with the full analysis object.\nFormat: ${format}\nTitle: ${title}\n\nSCRIPT:\n${script}`,
    },
  ];

  const tools: ChatToolFunction[] = [
    {
      type: 'function',
      function: {
        name: PROMPT_A_TOOL.name,
        description: PROMPT_A_TOOL.description,
        parameters: PROMPT_A_TOOL.input_schema,
      },
    },
  ];

  let attempts = 0;
  let lastError = '';

  while (attempts < 2) {
    const response = await callChatGPTWithRetry(
      { requestId, promptLabel: 'A' },
      (signal) =>
        createChatCompletion(
          {
            messages,
            tools,
            tool_choice: { type: 'function', function: { name: PROMPT_A_TOOL.name } },
            temperature: 0,
            max_tokens: 8192,
          },
          signal
        )
    );

    const toolCall = response.choices[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      lastError = 'Missing tool call';
    } else {
      try {
        const parsedArgs = JSON.parse(toolCall.function.arguments) as PromptARaw;
        const translated = translatePromptAToFullAnalysis(parsedArgs);
        const validated = validateAndSanitizeAnalysis(translated);
        return validated;
      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Translation failed';
      }
    }

    attempts += 1;
    messages.push({
      role: 'assistant',
      content: response.choices[0]?.message?.content ?? null,
      tool_calls: response.choices[0]?.message?.tool_calls,
    });
    messages.push({
      role: 'user',
      content: `Your tool output failed validation because: ${lastError}. Fix your JSON output to conform to the schema and call the tool again.`,
    });
  }

  throw new Error(`Prompt A failed after retries: ${lastError}`);
}
