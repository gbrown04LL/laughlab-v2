import type { JokeComplexity } from '@/types';

export const JOKE_MULTIPLIERS: Record<JokeComplexity, number> = {
  basic: 1.2, // Setup
  standard: 1.7, // Light
  intermediate: 2.3, // Intermediate
  advanced: 2.8, // Strong
  high: 3.3, // Exceptional
};

export interface WeightedJokeCount {
  complexity: JokeComplexity;
  count: number;
}

export function calculateRuntimeFactor(runtimeMinutes: number): number {
  if (!Number.isFinite(runtimeMinutes) || runtimeMinutes <= 0) {
    throw new Error('runtimeMinutes must be positive and finite for runtime factor calculation');
  }
  return Math.sqrt(30 / runtimeMinutes);
}

export function calculateWeightedJokeScore(jokes: ReadonlyArray<WeightedJokeCount>) {
  jokes.forEach((joke) => {
    if (!Number.isFinite(joke.count) || joke.count < 0) {
      throw new Error('Joke counts must be non-negative numbers');
    }
  });

  const totalJokes = jokes.reduce((sum, joke) => sum + joke.count, 0);
  if (totalJokes === 0) {
    return { weightedScore: 0, maxPossibleScore: 0, jokeRatio: 0 };
  }

  const weightedScore = jokes.reduce(
    (sum, joke) => sum + JOKE_MULTIPLIERS[joke.complexity] * joke.count,
    0
  );
  const maxPossibleScore = totalJokes * JOKE_MULTIPLIERS.high;
  const jokeRatio = weightedScore / maxPossibleScore;

  return { weightedScore, maxPossibleScore, jokeRatio };
}

export interface OverallScoreInput {
  jokeRatio: number;
  runtimeMinutes: number;
  genreFactor: number;
  positiveAdjustments: number;
  negativeAdjustments: number;
}

export function calculateOverallScore({
  jokeRatio,
  runtimeMinutes,
  genreFactor,
  positiveAdjustments,
  negativeAdjustments,
}: OverallScoreInput): number {
  const values = [jokeRatio, runtimeMinutes, genreFactor, positiveAdjustments, negativeAdjustments];
  if (values.some((value) => !Number.isFinite(value))) {
    throw new Error('Overall score inputs must be finite numbers');
  }
  if (runtimeMinutes <= 0) {
    throw new Error('runtimeMinutes must be greater than 0');
  }
  if (genreFactor <= 0) {
    throw new Error('genreFactor must be greater than 0');
  }
  if (jokeRatio < 0) {
    throw new Error('jokeRatio cannot be negative');
  }
  if (positiveAdjustments < 0 || negativeAdjustments < 0) {
    throw new Error('Adjustment counts cannot be negative');
  }

  const runtimeFactor = calculateRuntimeFactor(runtimeMinutes);
  const adjustment = 0.07 * positiveAdjustments - 0.05 * negativeAdjustments;

  return jokeRatio * 100 * runtimeFactor * genreFactor + adjustment;
}

export interface LpmInput {
  jokes: ReadonlyArray<WeightedJokeCount>;
  runtimeMinutes: number;
}

export function calculateLpm({ jokes, runtimeMinutes }: LpmInput): number {
  if (!Number.isFinite(runtimeMinutes) || runtimeMinutes <= 0) {
    throw new Error('runtimeMinutes must be positive and finite for LPM calculation');
  }

  const qualifyingJokes = jokes.reduce(
    (sum, joke) =>
      JOKE_MULTIPLIERS[joke.complexity] >= JOKE_MULTIPLIERS.intermediate ? sum + joke.count : sum,
    0
  );

  return qualifyingJokes / runtimeMinutes;
}

export interface GapPriorityInput {
  durationMinutes: number;
  positionWeight: number;
  localDensity: number;
}

export function calculateGapPriority({
  durationMinutes,
  positionWeight,
  localDensity,
}: GapPriorityInput): number {
  if ([durationMinutes, positionWeight, localDensity].some((value) => !Number.isFinite(value))) {
    throw new Error('Gap priority inputs must be finite numbers');
  }
  if (durationMinutes < 0) {
    throw new Error('durationMinutes cannot be negative');
  }
  if (localDensity <= 0) {
    throw new Error('localDensity must be greater than 0 to avoid division by zero');
  }

  return durationMinutes ** 2 * (1 + positionWeight) * (1 / localDensity);
}
