import { z } from 'zod';

const finiteNumber = () => z.number().finite();
const nonEmptyString = () => z.string().min(1);
const boundedPercentage = () => finiteNumber().min(0).max(100);

export const ScriptStatsSchema = z
  .object({
    totalLines: finiteNumber(),
    dialogueLines: finiteNumber(),
    estimatedRuntime: finiteNumber(),
    wordCount: finiteNumber(),
    sceneCount: finiteNumber(),
    characterCount: finiteNumber(),
  })
  .strict()
  .partial();

export const JokeDistributionSchema = z
  .object({
    basic: finiteNumber(),
    standard: finiteNumber(),
    intermediate: finiteNumber(),
    advanced: finiteNumber(),
    high: finiteNumber(),
  })
  .strict()
  .partial();

export const FormatComparisonSchema = z
  .object({
    targetLPM: finiteNumber(),
    targetLPJ: finiteNumber(),
    lpmStatus: z.enum(['above', 'on-target', 'below']),
    lpjStatus: z.enum(['above', 'on-target', 'below']),
    industryPercentile: boundedPercentage(),
  })
  .strict()
  .partial();

export const MetricsSchema = z
  .object({
    overallScore: boundedPercentage(),
    laughsPerMinute: finiteNumber(),
    linesPerJoke: finiteNumber(),
    totalJokes: finiteNumber(),
    peakLaughMoments: finiteNumber(),
    sustainedLaughSequences: finiteNumber(),
    callbackFrequency: boundedPercentage(),
    jokeDistribution: JokeDistributionSchema.optional(),
    formatComparison: FormatComparisonSchema.optional(),
  })
  .strict()
  .partial();

export const TimelineSegmentSchema = z
  .object({
    segmentNumber: finiteNumber(),
    startLine: finiteNumber(),
    endLine: finiteNumber(),
    startMinute: finiteNumber(),
    endMinute: finiteNumber(),
    jokeCount: finiteNumber(),
    laughScore: finiteNumber(),
    dominantType: z.enum(['basic', 'standard', 'intermediate', 'advanced', 'high']),
  })
  .strict()
  .partial();

export const HotSpotSchema = z
  .object({
    startMinute: finiteNumber(),
    endMinute: finiteNumber(),
    description: z.string(),
    jokeCount: finiteNumber(),
  })
  .strict()
  .partial();

export const ColdSpotSchema = z
  .object({
    startMinute: finiteNumber(),
    endMinute: finiteNumber(),
    durationMinutes: finiteNumber(),
    severity: z.enum(['minor', 'moderate', 'critical']),
    suggestion: z.string(),
  })
  .strict()
  .partial();

export const TimelineMomentSchema = z
  .object({
    minute: finiteNumber(),
    line: finiteNumber(),
    description: z.string(),
    quote: z.string().optional(),
  })
  .strict()
  .partial();

export const TimelineSchema = z
  .object({
    segments: z.array(TimelineSegmentSchema).optional(),
    hotSpots: z.array(HotSpotSchema).optional(),
    coldSpots: z.array(ColdSpotSchema).optional(),
    biggestLaugh: TimelineMomentSchema.optional(),
    longestDrySpell: TimelineMomentSchema.optional(),
  })
  .strict()
  .partial();

export const FeedbackItemSchema = z
  .object({
    title: z.string(),
    description: z.string(),
    lineReference: z.string().optional(),
    quote: z.string().optional(),
    impact: z.enum(['high', 'medium', 'low']),
  })
  .strict()
  .partial();

export const QuickWinSchema = z
  .object({
    action: nonEmptyString(),
    expectedImpact: z.string(),
    difficulty: z.enum(['easy', 'medium', 'hard']),
  })
  .strict()
  .partial();

export const FeedbackSchema = z
  .object({
    strengths: z.array(FeedbackItemSchema).optional(),
    opportunities: z.array(FeedbackItemSchema).optional(),
    quickWins: z.array(QuickWinSchema).optional(),
  })
  .strict()
  .partial();

export const GapSchema = z
  .object({
    id: z.string(),
    startLine: finiteNumber(),
    endLine: finiteNumber(),
    startMinute: finiteNumber(),
    endMinute: finiteNumber(),
    durationMinutes: finiteNumber(),
    durationLines: finiteNumber(),
    severity: z.enum(['minor', 'moderate', 'critical']),
    isRetentionCliff: z.boolean(),
    context: z.string(),
    suggestion: z.string(),
    priority: finiteNumber(),
  })
  .strict()
  .partial();

export const GapRecommendationSchema = z
  .object({
    gapId: z.string(),
    recommendation: z.string(),
    exampleLine: z.string().optional(),
    type: z.enum(['add-joke', 'add-callback', 'add-character-moment', 'restructure']),
  })
  .strict()
  .partial();

export const GapAnalysisSchema = z
  .object({
    gaps: z.array(GapSchema).optional(),
    retentionCliff: GapSchema.nullable().optional(),
    averageGapDuration: finiteNumber(),
    longestGap: finiteNumber(),
    gapScore: boundedPercentage(),
    recommendations: z.array(GapRecommendationSchema).optional(),
  })
  .strict()
  .partial();

export const PunchUpAlternativeSchema = z
  .object({
    text: z.string(),
    style: z.enum(['sharper', 'broader', 'subtler', 'callback', 'tag']),
    whyItWorks: z.string(),
  })
  .strict()
  .partial();

export const PunchUpSchema = z
  .object({
    id: z.string(),
    originalLine: z.string(),
    lineNumber: finiteNumber(),
    character: z.string().optional(),
    issue: z.string(),
    alternatives: z.array(PunchUpAlternativeSchema).optional(),
    explanation: z.string(),
    priority: z.enum(['high', 'medium', 'low']),
  })
  .strict()
  .partial();

export const PunchUpSectionSchema = z
  .object({
    punchUps: z.array(PunchUpSchema).optional(),
    overallTone: z.string(),
    styleNotes: z.array(z.string()).optional(),
  })
  .strict()
  .partial();

export const CharacterProfileSchema = z
  .object({
    name: nonEmptyString(),
    jokeCount: finiteNumber(),
    jokePercentage: boundedPercentage(),
    primaryStyle: z.string(),
    strongestMoment: z.string(),
    voiceConsistency: boundedPercentage(),
    screenTimeEstimate: boundedPercentage(),
  })
  .strict()
  .partial();

export const CharacterBalanceSchema = z
  .object({
    score: boundedPercentage(),
    status: z.enum(['balanced', 'slightly-unbalanced', 'unbalanced']),
    dominantCharacter: z.string().nullable(),
    underutilized: z.array(z.string()),
  })
  .strict()
  .partial();

export const CharacterInteractionSchema = z
  .object({
    character1: z.string(),
    character2: z.string(),
    jokeCount: finiteNumber(),
    chemistry: boundedPercentage(),
    bestMoment: z.string().optional(),
  })
  .strict()
  .partial();

export const CharacterAnalysisSchema = z
  .object({
    characters: z.array(CharacterProfileSchema).optional(),
    balance: CharacterBalanceSchema.optional(),
    interactions: z.array(CharacterInteractionSchema).optional(),
    recommendations: z.array(z.string()).optional(),
  })
  .strict()
  .partial();

export const CallbackSchema = z
  .object({
    setupLine: finiteNumber(),
    setupQuote: z.string(),
    payoffLine: finiteNumber(),
    payoffQuote: z.string(),
    effectiveness: z.enum(['strong', 'medium', 'weak']),
  })
  .strict()
  .partial();

export const CallbackOpportunitySchema = z
  .object({
    setupLine: finiteNumber(),
    setupQuote: z.string(),
    suggestedPayoffLocation: z.string(),
    suggestedPayoff: z.string(),
    potentialImpact: z.enum(['high', 'medium']),
  })
  .strict()
  .partial();

export const CallbackAnalysisSchema = z
  .object({
    existingCallbacks: z.array(CallbackSchema).optional(),
    missedOpportunities: z.array(CallbackOpportunitySchema).optional(),
    callbackScore: boundedPercentage(),
    recommendations: z.array(z.string()).optional(),
  })
  .strict()
  .partial();

export const AnalysisSchema = z
  .object({
    scriptStats: ScriptStatsSchema,
    metrics: MetricsSchema,
    timeline: TimelineSchema,
    feedback: FeedbackSchema,
    gaps: GapAnalysisSchema,
    punchUps: PunchUpSectionSchema,
    characters: CharacterAnalysisSchema,
    callbacks: CallbackAnalysisSchema,
    summary: z.string().optional(),
    coachNote: z.string().optional(),
  })
  .strict();
