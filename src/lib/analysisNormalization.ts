import { z } from 'zod';
import {
  type Callback,
  type CallbackAnalysis,
  type CallbackOpportunity,
  type CharacterAnalysis,
  type CharacterBalance,
  type CharacterInteraction,
  type CharacterProfile,
} from '@/types';

export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends Array<infer U>
    ? Array<DeepPartial<U>>
    : T[K] extends object
      ? DeepPartial<T[K]>
      : T[K];
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

export function deepMerge<T>(base: T, patch: DeepPartial<T>): T {
  if (patch == null) return base;
  const output: any = Array.isArray(base) ? [...(base as any)] : { ...(base as any) };

  for (const key of Object.keys(patch) as Array<keyof T>) {
    const patchValue = patch[key];
    if (patchValue === undefined) continue;

    const baseValue = (base as any)[key];
    output[key] =
      isPlainObject(baseValue) && isPlainObject(patchValue)
        ? deepMerge(baseValue, patchValue as any)
        : patchValue;
  }

  return output as T;
}

const stringSchema = z.string().trim().max(2000);
const percentageSchema = z.number().min(0).max(100);
const countSchema = (max: number) => z.number().min(0).max(max);

export const CharacterProfileSchema = z
  .object({
    name: stringSchema,
    jokeCount: countSchema(500),
    jokePercentage: percentageSchema,
    primaryStyle: stringSchema,
    strongestMoment: stringSchema,
    voiceConsistency: percentageSchema,
    screenTimeEstimate: percentageSchema,
  })
  .strict();

export const CharacterBalanceSchema = z
  .object({
    score: percentageSchema,
    status: z.enum(['balanced', 'slightly-unbalanced', 'unbalanced']),
    dominantCharacter: z.string().nullable(),
    underutilized: z.array(stringSchema),
  })
  .strict();

export const CharacterInteractionSchema = z
  .object({
    character1: stringSchema,
    character2: stringSchema,
    jokeCount: countSchema(200),
    chemistry: percentageSchema,
    bestMoment: stringSchema,
  })
  .strict();

export const CharacterAnalysisSchema = z
  .object({
    characters: z.array(CharacterProfileSchema),
    balance: CharacterBalanceSchema,
    interactions: z.array(CharacterInteractionSchema),
    recommendations: z.array(stringSchema),
  })
  .strict();

export const CallbackSchema = z
  .object({
    setupLine: countSchema(10000),
    setupQuote: stringSchema,
    payoffLine: countSchema(10000),
    payoffQuote: stringSchema,
    effectiveness: z.enum(['strong', 'medium', 'weak']),
  })
  .strict();

export const CallbackOpportunitySchema = z
  .object({
    setupLine: countSchema(10000),
    setupQuote: stringSchema,
    suggestedPayoffLocation: stringSchema,
    suggestedPayoff: stringSchema,
    potentialImpact: z.enum(['high', 'medium']),
  })
  .strict();

export const CallbackAnalysisSchema = z
  .object({
    existingCallbacks: z.array(CallbackSchema),
    missedOpportunities: z.array(CallbackOpportunitySchema),
    callbackScore: percentageSchema,
    recommendations: z.array(stringSchema),
  })
  .strict();

export const DEFAULT_CHARACTER_PROFILE: CharacterProfile = {
  name: 'Unknown',
  jokeCount: 0,
  jokePercentage: 0,
  primaryStyle: '',
  strongestMoment: '',
  voiceConsistency: 0,
  screenTimeEstimate: 0,
};

export const DEFAULT_CHARACTER_BALANCE: CharacterBalance = {
  score: 100,
  status: 'balanced',
  dominantCharacter: null,
  underutilized: [],
};

export const DEFAULT_CHARACTER_INTERACTION: CharacterInteraction = {
  character1: '',
  character2: '',
  jokeCount: 0,
  chemistry: 0,
  bestMoment: '',
};

export const DEFAULT_CHARACTER_ANALYSIS: CharacterAnalysis = {
  characters: [],
  balance: DEFAULT_CHARACTER_BALANCE,
  interactions: [],
  recommendations: [],
};

export const DEFAULT_CALLBACK: Callback = {
  setupLine: 0,
  setupQuote: '',
  payoffLine: 0,
  payoffQuote: '',
  effectiveness: 'medium',
};

export const DEFAULT_CALLBACK_OPPORTUNITY: CallbackOpportunity = {
  setupLine: 0,
  setupQuote: '',
  suggestedPayoffLocation: '',
  suggestedPayoff: '',
  potentialImpact: 'medium',
};

export const DEFAULT_CALLBACK_ANALYSIS: CallbackAnalysis = {
  existingCallbacks: [],
  missedOpportunities: [],
  callbackScore: 0,
  recommendations: [],
};

export function coerceCharacterProfile(raw: unknown): CharacterProfile {
  const parsed = CharacterProfileSchema.safeParse(raw);
  return deepMerge(DEFAULT_CHARACTER_PROFILE, parsed.success ? parsed.data : {});
}

export function coerceCharacterBalance(raw: unknown): CharacterBalance {
  const parsed = CharacterBalanceSchema.safeParse(raw);
  return deepMerge(DEFAULT_CHARACTER_BALANCE, parsed.success ? parsed.data : {});
}

export function coerceCharacterAnalysis(raw: unknown): CharacterAnalysis {
  const parsed = CharacterAnalysisSchema.safeParse(raw);
  return deepMerge(DEFAULT_CHARACTER_ANALYSIS, parsed.success ? parsed.data : {});
}

export function coerceCallbackAnalysis(raw: unknown): CallbackAnalysis {
  const parsed = CallbackAnalysisSchema.safeParse(raw);
  return deepMerge(DEFAULT_CALLBACK_ANALYSIS, parsed.success ? parsed.data : {});
}
