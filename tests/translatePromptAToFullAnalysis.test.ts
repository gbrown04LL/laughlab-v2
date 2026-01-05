import { describe, expect, it } from 'vitest';
import { translatePromptAToFullAnalysis, type PromptARaw } from '@/lib/llm/translatePromptAToFullAnalysis';
import { validateAndSanitizeAnalysis } from '@/lib/validation';

const raw: PromptARaw = {
  metadata: { formatType: 'sitcom', totalLines: 120, estimatedRuntimeMin: 10 },
  scores: { overallScore: 75, CHS: 80 },
  metrics: {
    totalJokes: 20,
    laughsPerMinute: 2,
    linesPerJoke: 6,
    peakLaughMoments: 3,
    sustainedLaughCount: 2,
    callbackFrequency: 10,
    characterBalanceScore: 0.6,
    runtimeMinutes: 10,
  },
  jokeAnalysis: {
    categoryCounts: { Basic: 5, Standard: 8, Intermediate: 4, Advanced: 2, HighComplexity: 1 },
    weightedScores: {
      BasicScore: 5,
      StandardScore: 8,
      IntermediateScore: 6,
      AdvancedScore: 5,
      HighScore: 3,
      TotalWeightedJokeScore: 27,
      MaxPossibleScore: 50,
      JokeRatio: 0.5,
    },
    runtimeFactor: 1,
    bonusPoints: 2,
    penaltyPoints: 1,
    jokesByLine: [],
  },
  characterAnalysis: { jokesPerCharacter: { ALICE: 10, BOB: 10 }, characterBalanceScore: 0.5 },
  callbackAnalysis: {
    totalCallbacks: 2,
    callbackFrequency: 10,
    callbacksDetail: [{ setupLine: 10, callbackLine: 50, description: 'test' }],
    missedCallbacks: 1,
  },
  gapAnalysis: {
    gaps: [
      { startLine: 30, endLine: 60, length: 30, durationMin: 2 },
      { startLine: 90, endLine: 130, length: 40, durationMin: 3.5 },
    ],
    retentionCliff: { startLine: 200, endLine: 240, length: 40, durationMin: 4.5 },
    gapPriorityScores: [
      { startLine: 30, endLine: 60, priority: 2 },
      { startLine: 90, endLine: 130, priority: 1 },
    ],
  },
  hackyJokeAnalysis: { hackyCount: 0, issues: [] },
  recommendations: ['Add more callbacks'],
};

describe('translatePromptAToFullAnalysis', () => {
  it('maps Prompt A raw payload to validated analysis shape', () => {
    const translated = translatePromptAToFullAnalysis(raw);
    const validated = validateAndSanitizeAnalysis(translated);

    expect(validated.metrics.totalJokes).toBe(raw.metrics.totalJokes);
    expect(validated.metrics.laughsPerMinute).toBe(raw.metrics.laughsPerMinute);
    expect(validated.characters.characters.length).toBe(Object.keys(raw.characterAnalysis.jokesPerCharacter).length);
    expect(validated.callbacks.existingCallbacks.length).toBe(raw.callbackAnalysis.callbacksDetail.length);
    expect(validated.gaps.gaps.some((gap) => gap.priority === 1)).toBe(true);
    expect(validated.timeline.coldSpots.length).toBe(validated.gaps.gaps.length);
  });
});
