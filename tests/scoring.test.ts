import { describe, expect, it } from 'vitest';
import {
  calculateGapPriority,
  calculateLpm,
  calculateOverallScore,
  calculateRuntimeFactor,
  calculateWeightedJokeScore,
  JOKE_MULTIPLIERS,
} from '@/lib/scoring';

describe('scoring formulas', () => {
  it('applies multipliers to joke ratio and propagates into overall score', () => {
    const baseJokes = [
      { complexity: 'basic', count: 4 },
      { complexity: 'standard', count: 3 },
      { complexity: 'intermediate', count: 2 },
      { complexity: 'advanced', count: 1 },
    ] as const;
    const upgradedJokes = [
      { complexity: 'basic', count: 2 },
      { complexity: 'standard', count: 2 },
      { complexity: 'intermediate', count: 3 },
      { complexity: 'advanced', count: 2 },
      { complexity: 'high', count: 1 },
    ] as const;

    const baseWeighted = calculateWeightedJokeScore(baseJokes);
    const upgradedWeighted = calculateWeightedJokeScore(upgradedJokes);

    expect(upgradedWeighted.jokeRatio).toBeGreaterThan(baseWeighted.jokeRatio);

    const baseScore = calculateOverallScore({
      jokeRatio: baseWeighted.jokeRatio,
      runtimeMinutes: 15,
      genreFactor: 1.1,
      positiveAdjustments: 2,
      negativeAdjustments: 1,
    });
    const upgradedScore = calculateOverallScore({
      jokeRatio: upgradedWeighted.jokeRatio,
      runtimeMinutes: 15,
      genreFactor: 1.1,
      positiveAdjustments: 2,
      negativeAdjustments: 1,
    });

    const expectedBase =
      baseWeighted.jokeRatio * 100 * Math.sqrt(30 / 15) * 1.1 + (0.07 * 2 - 0.05 * 1);
    const expectedUpgrade =
      upgradedWeighted.jokeRatio * 100 * Math.sqrt(30 / 15) * 1.1 + (0.07 * 2 - 0.05 * 1);

    expect(baseScore).toBeCloseTo(expectedBase, 6);
    expect(upgradedScore).toBeCloseTo(expectedUpgrade, 6);
    expect(upgradedScore).toBeGreaterThan(baseScore);
  });

  it('computes runtime factor as sqrt(30 / T)', () => {
    expect(calculateRuntimeFactor(10)).toBeCloseTo(Math.sqrt(3), 6);
    expect(calculateRuntimeFactor(30)).toBeCloseTo(1, 6);
  });

  it('excludes multipliers below intermediate when computing LPM', () => {
    const jokes = [
      { complexity: 'basic', count: 3 },
      { complexity: 'standard', count: 2 },
      { complexity: 'intermediate', count: 2 },
      { complexity: 'advanced', count: 1 },
      { complexity: 'high', count: 1 },
    ] as const;

    const lpm = calculateLpm({ jokes, runtimeMinutes: 4 });
    const qualifyingJokes = 2 + 1 + 1;
    expect(lpm).toBeCloseTo(qualifyingJokes / 4, 6);
  });

  it('ranks gap priority by duration, position weight, and inverse density', () => {
    const shortGap = calculateGapPriority({ durationMinutes: 1, positionWeight: 0.2, localDensity: 2 });
    const longGap = calculateGapPriority({ durationMinutes: 2, positionWeight: 0.2, localDensity: 2 });
    const sparseGap = calculateGapPriority({ durationMinutes: 1, positionWeight: 0.2, localDensity: 1 });

    expect(longGap).toBeGreaterThan(shortGap);
    expect(sparseGap).toBeGreaterThan(shortGap);
  });
});
