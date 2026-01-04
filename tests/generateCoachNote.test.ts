import { beforeEach, describe, expect, it, vi } from 'vitest';
import { generateCoachNote } from '@/lib/llm/generateCoachNote';
import { callChatGPTWithRetry, createChatCompletion } from '@/lib/llm/chatgptRequest';

vi.mock('@/lib/llm/chatgptRequest', async () => {
  const actual = await vi.importActual<typeof import('@/lib/llm/chatgptRequest')>('@/lib/llm/chatgptRequest');
  return {
    ...actual,
    callChatGPTWithRetry: vi.fn((_, fn) => fn(undefined as unknown as AbortSignal)),
    createChatCompletion: vi.fn(),
  };
});

const mockedCreateChatCompletion = vi.mocked(createChatCompletion);
const mockedCallChatGPTWithRetry = vi.mocked(callChatGPTWithRetry);

const FALLBACK =
  'Your script has some great moments! Pick one spot where the energy dips and add a clean, character-driven button that echoes your strongest earlier joke. Ready to analyze some punchline gaps?';

beforeEach(() => {
  vi.clearAllMocks();
  mockedCallChatGPTWithRetry.mockImplementation((_, fn) => fn(undefined as unknown as AbortSignal));
});

describe('generateCoachNote', () => {
  it('returns parsed coach note when the tool call succeeds', async () => {
    mockedCreateChatCompletion.mockResolvedValue({
      choices: [
        {
          message: {
            role: 'assistant',
            content: null,
            tool_calls: [
              {
                id: 'tool-1',
                type: 'function',
                function: {
                  name: 'create_coach_note',
                  arguments: JSON.stringify({ coachNote: 'Tighten the middle beat and keep the pace up.' }),
                },
              },
            ],
          },
        },
      ],
    });

    const result = await generateCoachNote({ analysisJson: { foo: 'bar' }, requestId: 'test-success' });

    expect(result).toBe('Tighten the middle beat and keep the pace up.');
  });

  it('returns fallback and logs when the tool call is missing', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    mockedCreateChatCompletion.mockResolvedValue({
      choices: [{ message: { role: 'assistant', content: 'no tool call here' } }],
    });

    const result = await generateCoachNote({ analysisJson: {}, requestId: 'missing-tool' });

    expect(result).toBe(FALLBACK);
    expect(warnSpy).toHaveBeenCalledWith('[CoachNote] Missing tool call on response', { requestId: 'missing-tool' });
  });

  it('returns fallback and logs when tool arguments are not valid JSON', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    mockedCreateChatCompletion.mockResolvedValue({
      choices: [
        {
          message: {
            role: 'assistant',
            content: null,
            tool_calls: [
              {
                id: 'tool-1',
                type: 'function',
                function: {
                  name: 'create_coach_note',
                  arguments: '{invalid-json',
                },
              },
            ],
          },
        },
      ],
    });

    const result = await generateCoachNote({ analysisJson: {}, requestId: 'bad-json' });

    expect(result).toBe(FALLBACK);
    expect(warnSpy).toHaveBeenCalledWith(
      '[CoachNote] Tool args parse failed',
      expect.objectContaining({ requestId: 'bad-json' })
    );
  });

  it('returns fallback and logs when validation fails', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    mockedCreateChatCompletion.mockResolvedValue({
      choices: [
        {
          message: {
            role: 'assistant',
            content: null,
            tool_calls: [
              {
                id: 'tool-1',
                type: 'function',
                function: {
                  name: 'create_coach_note',
                  arguments: JSON.stringify({ coachNote: '' }),
                },
              },
            ],
          },
        },
      ],
    });

    const result = await generateCoachNote({ analysisJson: {}, requestId: 'validation-fail' });

    expect(result).toBe(FALLBACK);
    expect(warnSpy).toHaveBeenCalledWith(
      '[CoachNote] Validation failed',
      expect.objectContaining({ requestId: 'validation-fail' })
    );
  });
});
