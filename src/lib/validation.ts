// ===========================================
// LAUGH LAB PRO - RESPONSE VALIDATION
// ===========================================
// Zod schemas to validate and sanitize LLM output

import { z } from 'zod';

// The system will often return fabricated 'valid' analyses (or none at all) because it silently masks schema failures, uses an invalid model name, and exposes stored results via a wide-open Supabase policy.

// Helper to enforce numeric ranges without mutating LLM output
const safeNumber = (
  defaultVal: number,
  min: number = 0,
  max: number = Infinity,
  fieldName: string = 'value'
) =>
  (() => {
    let schema = z
      .number({ invalid_type_error: `${fieldName} must be a number` })
      .finite(`${fieldName} must be a finite number`)
      .min(min, { message: `${fieldName} must be >= ${min}` });

    if (Number.isFinite(max)) {
      schema = schema.max(max, { message: `${fieldName} must be <= ${max}` });
    }

    return schema.optional().default(defaultVal);
  })();

const safePercentage = (defaultVal: number = 0, fieldName: string = 'percentage') =>
  safeNumber(defaultVal, 0, 100, fieldName);

const safeString = (defaultVal: string = '') =>
  z.string().optional().default(defaultVal).transform(s => (s ?? defaultVal).slice(0, 2000)); // Cap string length

// ===========================================
// SUB-SCHEMAS
// ===========================================

const ScriptStatsSchema = z.object({
  totalLines: safeNumber(0, 0, 10000),
  dialogueLines: safeNumber(0, 0, 10000),
  estimatedRuntime: safeNumber(0, 0, 300), // Max 5 hours
  wordCount: safeNumber(0, 0, 200000),
  sceneCount: safeNumber(0, 0, 500),
  characterCount: safeNumber(0, 0, 100),
}).optional().default({
  totalLines: 0,
  dialogueLines: 0,
  estimatedRuntime: 0,
  wordCount: 0,
  sceneCount: 0,
  characterCount: 0,
});

const JokeDistributionSchema = z.object({
  basic: safeNumber(0, 0, 500),
  standard: safeNumber(0, 0, 500),
  intermediate: safeNumber(0, 0, 500),
  advanced: safeNumber(0, 0, 500),
  high: safeNumber(0, 0, 500),
}).optional().default({
  basic: 0,
  standard: 0,
  intermediate: 0,
  advanced: 0,
  high: 0,
});

const FormatComparisonSchema = z.object({
  targetLPM: safeNumber(2.0, 0.1, 10),
  targetLPJ: safeNumber(5.5, 1, 30),
  lpmStatus: z.enum(['above', 'on-target', 'below']).optional().default('on-target'),
  lpjStatus: z.enum(['above', 'on-target', 'below']).optional().default('on-target'),
  industryPercentile: safePercentage(50),
}).optional().default({
  targetLPM: 2.0,
  targetLPJ: 5.5,
  lpmStatus: 'on-target',
  lpjStatus: 'on-target',
  industryPercentile: 50,
});

const MetricsSchema = z.object({
  overallScore: safePercentage(65),
  laughsPerMinute: safeNumber(1.5, 0, 20),
  linesPerJoke: safeNumber(6, 1, 100),
  totalJokes: safeNumber(0, 0, 1000),
  peakLaughMoments: safeNumber(0, 0, 100),
  sustainedLaughSequences: safeNumber(0, 0, 100),
  callbackFrequency: safePercentage(0),
  jokeDistribution: JokeDistributionSchema,
  formatComparison: FormatComparisonSchema,
}).optional().default({
  overallScore: 65,
  laughsPerMinute: 1.5,
  linesPerJoke: 6,
  totalJokes: 0,
  peakLaughMoments: 0,
  sustainedLaughSequences: 0,
  callbackFrequency: 0,
  jokeDistribution: {
    basic: 0,
    standard: 0,
    intermediate: 0,
    advanced: 0,
    high: 0,
  },
  formatComparison: {
    targetLPM: 2.0,
    targetLPJ: 5.5,
    lpmStatus: 'on-target',
    lpjStatus: 'on-target',
    industryPercentile: 50,
  },
});

const TimelineSegmentSchema = z.object({
  segmentNumber: safeNumber(0, 0, 100),
  startLine: safeNumber(0, 0, 10000),
  endLine: safeNumber(0, 0, 10000),
  startMinute: safeNumber(0, 0, 300),
  endMinute: safeNumber(0, 0, 300),
  jokeCount: safeNumber(0, 0, 100),
  laughScore: safeNumber(0, 0, 10),
  dominantType: z.enum(['basic', 'standard', 'intermediate', 'advanced', 'high']).optional().default('standard'),
});

const HotSpotSchema = z.object({
  startMinute: safeNumber(0, 0, 300),
  endMinute: safeNumber(0, 0, 300),
  description: safeString(''),
  jokeCount: safeNumber(0, 0, 100),
});

const ColdSpotSchema = z.object({
  startMinute: safeNumber(0, 0, 300),
  endMinute: safeNumber(0, 0, 300),
  durationMinutes: safeNumber(0, 0, 60),
  severity: z.enum(['minor', 'moderate', 'critical']).optional().default('minor'),
  suggestion: safeString(''),
});

const TimelineMomentSchema = z.object({
  minute: safeNumber(0, 0, 300),
  line: safeNumber(0, 0, 10000),
  description: safeString('N/A'),
  quote: safeString(''),
});

const TimelineSchema = z.object({
  segments: z.array(TimelineSegmentSchema).optional().default([]),
  hotSpots: z.array(HotSpotSchema).optional().default([]),
  coldSpots: z.array(ColdSpotSchema).optional().default([]),
  biggestLaugh: TimelineMomentSchema.optional().default({ minute: 0, line: 0, description: 'N/A', quote: '' }),
  longestDrySpell: TimelineMomentSchema.optional().default({ minute: 0, line: 0, description: 'N/A', quote: '' }),
}).optional().default({
  segments: [],
  hotSpots: [],
  coldSpots: [],
  biggestLaugh: { minute: 0, line: 0, description: 'N/A', quote: '' },
  longestDrySpell: { minute: 0, line: 0, description: 'N/A', quote: '' },
});

const FeedbackItemSchema = z.object({
  title: safeString(''),
  description: safeString(''),
  lineReference: safeString(''),
  quote: safeString(''),
  impact: z.enum(['high', 'medium', 'low']).optional().default('medium'),
});

const QuickWinSchema = z.object({
  action: safeString(''),
  expectedImpact: safeString(''),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional().default('easy'),
});

const FeedbackSchema = z.object({
  strengths: z.array(FeedbackItemSchema).optional().default([]),
  opportunities: z.array(FeedbackItemSchema).optional().default([]),
  quickWins: z.array(QuickWinSchema).optional().default([]),
}).optional().default({
  strengths: [],
  opportunities: [],
  quickWins: [],
});

const GapSchema = z.object({
  id: safeString('gap_0'),
  startLine: safeNumber(0, 0, 10000),
  endLine: safeNumber(0, 0, 10000),
  startMinute: safeNumber(0, 0, 300),
  endMinute: safeNumber(0, 0, 300),
  durationMinutes: safeNumber(0, 0, 60),
  durationLines: safeNumber(0, 0, 500),
  severity: z.enum(['minor', 'moderate', 'critical']).optional().default('minor'),
  isRetentionCliff: z.boolean().optional().default(false),
  context: safeString(''),
  suggestion: safeString(''),
  priority: safeNumber(1, 1, 100),
});

const GapRecommendationSchema = z.object({
  gapId: safeString(''),
  recommendation: safeString(''),
  exampleLine: safeString(''),
  type: z.enum(['add-joke', 'add-callback', 'add-character-moment', 'restructure']).optional().default('add-joke'),
});

const GapAnalysisSchema = z.object({
  gaps: z.array(GapSchema).optional().default([]),
  retentionCliff: GapSchema.nullable().optional().default(null),
  averageGapDuration: safeNumber(0, 0, 60),
  longestGap: safeNumber(0, 0, 60),
  gapScore: safePercentage(100),
  recommendations: z.array(GapRecommendationSchema).optional().default([]),
}).optional().default({
  gaps: [],
  retentionCliff: null,
  averageGapDuration: 0,
  longestGap: 0,
  gapScore: 100,
  recommendations: [],
});

const PunchUpAlternativeSchema = z.object({
  text: safeString(''),
  style: z.enum(['sharper', 'broader', 'subtler', 'callback', 'tag']).optional().default('sharper'),
  whyItWorks: safeString(''),
});

const PunchUpSchema = z.object({
  id: safeString('punchup_0'),
  originalLine: safeString(''),
  lineNumber: safeNumber(0, 0, 10000),
  character: safeString(''),
  issue: safeString(''),
  alternatives: z.array(PunchUpAlternativeSchema).optional().default([]),
  explanation: safeString(''),
  priority: z.enum(['high', 'medium', 'low']).optional().default('medium'),
});

const PunchUpSectionSchema = z.object({
  punchUps: z.array(PunchUpSchema).optional().default([]),
  overallTone: safeString(''),
  styleNotes: z.array(z.string().transform(s => s.slice(0, 500))).optional().default([]),
}).optional().default({
  punchUps: [],
  overallTone: '',
  styleNotes: [],
});

const CharacterProfileSchema = z.object({
  name: safeString('Unknown'),
  jokeCount: safeNumber(0, 0, 500),
  jokePercentage: safePercentage(0),
  primaryStyle: safeString(''),
  strongestMoment: safeString(''),
  voiceConsistency: safePercentage(0),
  screenTimeEstimate: safePercentage(0),
});

const CharacterBalanceSchema = z.object({
  score: safePercentage(100),
  status: z.enum(['balanced', 'slightly-unbalanced', 'unbalanced']).optional().default('balanced'),
  dominantCharacter: z.string().nullable().optional().default(null),
  underutilized: z.array(z.string()).optional().default([]),
});

const CharacterInteractionSchema = z.object({
  character1: safeString(''),
  character2: safeString(''),
  jokeCount: safeNumber(0, 0, 200),
  chemistry: safePercentage(0),
  bestMoment: safeString(''),
});

const CharacterAnalysisSchema = z.object({
  characters: z.array(CharacterProfileSchema).optional().default([]),
  balance: CharacterBalanceSchema.optional().default({ score: 100, status: 'balanced', dominantCharacter: null, underutilized: [] }),
  interactions: z.array(CharacterInteractionSchema).optional().default([]),
  recommendations: z.array(z.string().transform(s => s.slice(0, 500))).optional().default([]),
}).optional().default({
  characters: [],
  balance: { score: 100, status: 'balanced', dominantCharacter: null, underutilized: [] },
  interactions: [],
  recommendations: [],
});

const CallbackSchema = z.object({
  setupLine: safeNumber(0, 0, 10000),
  setupQuote: safeString(''),
  payoffLine: safeNumber(0, 0, 10000),
  payoffQuote: safeString(''),
  effectiveness: z.enum(['strong', 'medium', 'weak']).optional().default('medium'),
});

const CallbackOpportunitySchema = z.object({
  setupLine: safeNumber(0, 0, 10000),
  setupQuote: safeString(''),
  suggestedPayoffLocation: safeString(''),
  suggestedPayoff: safeString(''),
  potentialImpact: z.enum(['high', 'medium']).optional().default('medium'),
});

const CallbackAnalysisSchema = z.object({
  existingCallbacks: z.array(CallbackSchema).optional().default([]),
  missedOpportunities: z.array(CallbackOpportunitySchema).optional().default([]),
  callbackScore: safePercentage(0),
  recommendations: z.array(z.string().transform(s => s.slice(0, 500))).optional().default([]),
}).optional().default({
  existingCallbacks: [],
  missedOpportunities: [],
  callbackScore: 0,
  recommendations: [],
});

// ===========================================
// MAIN ANALYSIS SCHEMA
// ===========================================

export const AnalysisResponseSchema = z.object({
  scriptStats: ScriptStatsSchema,
  metrics: MetricsSchema,
  timeline: TimelineSchema,
  feedback: FeedbackSchema,
  gaps: GapAnalysisSchema,
  punchUps: PunchUpSectionSchema,
  characters: CharacterAnalysisSchema,
  callbacks: CallbackAnalysisSchema,
  summary: safeString('Analysis complete.'),
  coachNote: safeString('Keep writing!'),
});

export type ValidatedAnalysisResponse = z.infer<typeof AnalysisResponseSchema>;

export class AnalysisValidationError extends Error {
  reason: 'schema' | 'metrics';
  constructor(message: string, reason: 'schema' | 'metrics') {
    super(message);
    this.name = 'AnalysisValidationError';
    this.reason = reason;
  }
}

function collectNumericIssues(
  value: unknown,
  field: string,
  min: number,
  max: number,
  issues: string[]
) {
  if (value === undefined || value === null) {
    return;
  }

  if (typeof value !== 'number' || Number.isNaN(value) || !Number.isFinite(value)) {
    issues.push(`${field} must be a finite number (received ${String(value)})`);
    return;
  }

  if (value < min) {
    issues.push(`${field} must be >= ${min} (received ${value})`);
  } else if (value > max) {
    issues.push(`${field} must be <= ${max} (received ${value})`);
  }
}

export function validateAnalysisMetrics(json: unknown): boolean {
  const data = json as any;
  const issues: string[] = [];

  collectNumericIssues(data?.metrics?.totalJokes, 'metrics.totalJokes', 0, 1000, issues);

  const categories = data?.jokeAnalysis?.categoryCounts;
  if (categories && typeof categories === 'object') {
    collectNumericIssues(categories.Basic, 'jokeAnalysis.categoryCounts.Basic', 0, 500, issues);
    collectNumericIssues(categories.Standard, 'jokeAnalysis.categoryCounts.Standard', 0, 500, issues);
    collectNumericIssues(categories.Intermediate, 'jokeAnalysis.categoryCounts.Intermediate', 0, 500, issues);
    collectNumericIssues(categories.Advanced, 'jokeAnalysis.categoryCounts.Advanced', 0, 500, issues);
    collectNumericIssues(categories.HighComplexity, 'jokeAnalysis.categoryCounts.HighComplexity', 0, 500, issues);
  }

  const estimatedRuntime =
    data?.metadata?.estimatedRuntimeMin ?? data?.metrics?.runtimeMinutes ?? undefined;
  collectNumericIssues(estimatedRuntime, 'metadata.estimatedRuntimeMin', 0, 600, issues);

  const gaps = Array.isArray(data?.gapAnalysis?.gaps) ? data.gapAnalysis.gaps : null;
  if (gaps === null && data?.gapAnalysis?.gaps !== undefined) {
    issues.push('gapAnalysis.gaps must be an array when provided');
  }

  gaps?.forEach((gap: any, index: number) => {
    collectNumericIssues(gap?.durationMin, `gapAnalysis.gaps[${index}].durationMin`, 0, 120, issues);
    collectNumericIssues(gap?.length, `gapAnalysis.gaps[${index}].length`, 0, 10000, issues);
  });

  const retention = data?.gapAnalysis?.retentionCliff;
  if (retention) {
    collectNumericIssues(retention.durationMin, 'gapAnalysis.retentionCliff.durationMin', 0, 120, issues);
    collectNumericIssues(retention.length, 'gapAnalysis.retentionCliff.length', 0, 10000, issues);
  }

  if (issues.length > 0) {
    throw new AnalysisValidationError(`Invalid analysis metrics: ${issues.join('; ')}`, 'metrics');
  }

  return true;
}

// ===========================================
// VALIDATION FUNCTION
// ===========================================

export function validateAndSanitizeAnalysis(rawData: unknown): ValidatedAnalysisResponse {
  const result = AnalysisResponseSchema.safeParse(rawData);

  if (!result.success) {
    const issues = result.error.issues
      .slice(0, 5)
      .map((issue) => `${issue.path.join('.') || 'root'}: ${issue.message}`)
      .join('; ');
    throw new AnalysisValidationError(`Analysis validation failed: ${issues || 'invalid schema'}`, 'schema');
  }

  return result.data;
}
