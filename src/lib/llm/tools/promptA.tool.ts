export interface PromptATool {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

export const PROMPT_A_TOOL: PromptATool = {
  name: 'analyze_script',
  description: 'Deterministic Laugh Lab scoring engine. Return structured analysis JSON ONLY via tool_use. No prose.',
  input_schema: {
    type: 'object',
    additionalProperties: false,
    required: [
      'metadata',
      'scores',
      'metrics',
      'jokeAnalysis',
      'characterAnalysis',
      'callbackAnalysis',
      'gapAnalysis',
      'hackyJokeAnalysis',
      'recommendations',
    ],
    properties: {
      metadata: {
        type: 'object',
        additionalProperties: false,
        required: ['formatType', 'totalLines', 'estimatedRuntimeMin'],
        properties: {
          formatType: {
            type: 'string',
            enum: ['auto', 'sitcom', 'singlecam', 'sketch', 'standup', 'feature'],
          },
          totalLines: { type: 'number' },
          estimatedRuntimeMin: { type: 'number' },
        },
      },
      scores: {
        type: 'object',
        additionalProperties: false,
        required: ['overallScore', 'CHS'],
        properties: {
          overallScore: { type: 'number' },
          CHS: { type: 'number' },
        },
      },
      metrics: {
        type: 'object',
        additionalProperties: false,
        required: [
          'totalJokes',
          'laughsPerMinute',
          'linesPerJoke',
          'peakLaughMoments',
          'sustainedLaughCount',
          'callbackFrequency',
          'characterBalanceScore',
          'runtimeMinutes',
        ],
        properties: {
          totalJokes: { type: 'number' },
          laughsPerMinute: { type: 'number' },
          linesPerJoke: { type: 'number' },
          peakLaughMoments: { type: 'number' },
          sustainedLaughCount: { type: 'number' },
          callbackFrequency: { type: 'number' },
          characterBalanceScore: { type: 'number' },
          runtimeMinutes: { type: 'number' },
        },
      },
      jokeAnalysis: {
        type: 'object',
        additionalProperties: false,
        required: ['categoryCounts', 'weightedScores', 'runtimeFactor', 'bonusPoints', 'penaltyPoints', 'jokesByLine'],
        properties: {
          categoryCounts: {
            type: 'object',
            additionalProperties: false,
            required: ['Basic', 'Standard', 'Intermediate', 'Advanced', 'HighComplexity'],
            properties: {
              Basic: { type: 'number' },
              Standard: { type: 'number' },
              Intermediate: { type: 'number' },
              Advanced: { type: 'number' },
              HighComplexity: { type: 'number' },
            },
          },
          weightedScores: {
            type: 'object',
            additionalProperties: false,
            required: [
              'BasicScore',
              'StandardScore',
              'IntermediateScore',
              'AdvancedScore',
              'HighScore',
              'TotalWeightedJokeScore',
              'MaxPossibleScore',
              'JokeRatio',
            ],
            properties: {
              BasicScore: { type: 'number' },
              StandardScore: { type: 'number' },
              IntermediateScore: { type: 'number' },
              AdvancedScore: { type: 'number' },
              HighScore: { type: 'number' },
              TotalWeightedJokeScore: { type: 'number' },
              MaxPossibleScore: { type: 'number' },
              JokeRatio: { type: 'number' },
            },
          },
          runtimeFactor: { type: 'number' },
          bonusPoints: { type: 'number' },
          penaltyPoints: { type: 'number' },
          jokesByLine: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['line', 'type', 'character'],
              properties: {
                line: { type: 'number' },
                type: {
                  type: 'string',
                  enum: ['Basic', 'Standard', 'Intermediate', 'Advanced', 'HighComplexity'],
                },
                character: { type: 'string' },
              },
            },
          },
        },
      },
      characterAnalysis: {
        type: 'object',
        additionalProperties: false,
        required: ['jokesPerCharacter', 'characterBalanceScore'],
        properties: {
          jokesPerCharacter: {
            type: 'object',
            additionalProperties: { type: 'number' },
          },
          characterBalanceScore: { type: 'number' },
        },
      },
      callbackAnalysis: {
        type: 'object',
        additionalProperties: false,
        required: ['totalCallbacks', 'callbackFrequency', 'callbacksDetail', 'missedCallbacks'],
        properties: {
          totalCallbacks: { type: 'number' },
          callbackFrequency: { type: 'number' },
          callbacksDetail: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['setupLine', 'callbackLine', 'description'],
              properties: {
                setupLine: { type: 'number' },
                callbackLine: { type: 'number' },
                description: { type: 'string' },
              },
            },
          },
          missedCallbacks: { type: 'number' },
        },
      },
      gapAnalysis: {
        type: 'object',
        additionalProperties: false,
        required: ['gaps', 'retentionCliff', 'gapPriorityScores'],
        properties: {
          gaps: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['startLine', 'endLine', 'length', 'durationMin'],
              properties: {
                startLine: { type: 'number' },
                endLine: { type: 'number' },
                length: { type: 'number' },
                durationMin: { type: 'number' },
              },
            },
          },
          retentionCliff: {
            anyOf: [
              { type: 'null' },
              {
                type: 'object',
                additionalProperties: false,
                required: ['startLine', 'endLine', 'length', 'durationMin'],
                properties: {
                  startLine: { type: 'number' },
                  endLine: { type: 'number' },
                  length: { type: 'number' },
                  durationMin: { type: 'number' },
                },
              },
            ],
          },
          gapPriorityScores: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['startLine', 'endLine', 'priority'],
              properties: {
                startLine: { type: 'number' },
                endLine: { type: 'number' },
                priority: { type: 'number' },
              },
            },
          },
        },
      },
      hackyJokeAnalysis: {
        type: 'object',
        additionalProperties: false,
        required: ['hackyCount', 'issues'],
        properties: {
          hackyCount: { type: 'number' },
          issues: { type: 'array', items: { type: 'string' } },
        },
      },
      recommendations: {
        type: 'array',
        items: { type: 'string' },
      },
    },
  },
};
