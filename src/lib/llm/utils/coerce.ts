import {
  AnalysisSchema,
  CallbackAnalysisSchema,
  CallbackOpportunitySchema,
  CallbackSchema,
  CharacterAnalysisSchema,
  CharacterBalanceSchema,
  GapSchema,
  GapRecommendationSchema,
  GapAnalysisSchema,
  MetricsSchema,
  PunchUpSectionSchema,
  ScriptStatsSchema,
  TimelineSchema,
} from '@/lib/llm/utils/schemas';
import {
  DEFAULT_ANALYSIS,
  DEFAULT_CALLBACK,
  DEFAULT_CALLBACK_ANALYSIS,
  DEFAULT_CALLBACK_OPPORTUNITY,
  DEFAULT_CHARACTER_ANALYSIS,
  DEFAULT_CHARACTER_BALANCE,
  DEFAULT_CHARACTER_PROFILE,
  DEFAULT_COLD_SPOT,
  DEFAULT_FEEDBACK,
  DEFAULT_GAP,
  DEFAULT_GAP_ANALYSIS,
  DEFAULT_GAP_RECOMMENDATION,
  DEFAULT_METRICS,
  DEFAULT_PUNCH_UP,
  DEFAULT_PUNCH_UP_ALTERNATIVE,
  DEFAULT_PUNCH_UP_SECTION,
  DEFAULT_SCRIPT_STATS,
  DEFAULT_TIMELINE,
  DEFAULT_TIMELINE_MOMENT,
  DEFAULT_TIMELINE_SEGMENT,
  DEFAULT_HOT_SPOT,
} from '@/lib/llm/utils/defaults';
import type {
  AnalysisShape,
  Callback,
  CallbackAnalysis,
  CallbackOpportunity,
  CharacterAnalysis,
  CharacterBalance,
  CharacterProfile,
  CoreMetrics,
  FeedbackSection,
  Gap,
  GapAnalysis,
  GapRecommendation,
  PunchUp,
  PunchUpAlternative,
  PunchUpSection,
  ScriptStats,
  TimelineData,
  TimelineMoment,
  TimelineSegment,
} from '@/lib/llm/utils/defaults';

type ParsedAnalysis = Partial<AnalysisShape>;

const maybeObject = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' ? (value as Record<string, unknown>) : null;

export function coerceScriptStats(input?: unknown): ScriptStats {
  const parsed = ScriptStatsSchema.parse(input ?? {});
  return { ...DEFAULT_SCRIPT_STATS, ...parsed };
}

export function coerceMetrics(input?: unknown): CoreMetrics {
  const parsed = MetricsSchema.parse(input ?? {});
  return {
    ...DEFAULT_METRICS,
    ...parsed,
    jokeDistribution: { ...DEFAULT_METRICS.jokeDistribution, ...(parsed.jokeDistribution ?? {}) },
    formatComparison: { ...DEFAULT_METRICS.formatComparison, ...(parsed.formatComparison ?? {}) },
  };
}

function coerceTimelineMoment(input?: unknown): TimelineMoment {
  const parsed = DEFAULT_TIMELINE_MOMENT;
  const candidate = maybeObject(input) ?? {};
  return {
    ...DEFAULT_TIMELINE_MOMENT,
    minute: typeof candidate.minute === 'number' ? candidate.minute : DEFAULT_TIMELINE_MOMENT.minute,
    line: typeof candidate.line === 'number' ? candidate.line : DEFAULT_TIMELINE_MOMENT.line,
    description: typeof candidate.description === 'string' ? candidate.description : DEFAULT_TIMELINE_MOMENT.description,
    quote: typeof candidate.quote === 'string' ? candidate.quote : DEFAULT_TIMELINE_MOMENT.quote,
  };
}

function coerceTimelineSegment(input?: unknown): TimelineSegment {
  const parsed = maybeObject(input) ?? {};
  return {
    ...DEFAULT_TIMELINE_SEGMENT,
    segmentNumber: typeof parsed.segmentNumber === 'number' ? parsed.segmentNumber : DEFAULT_TIMELINE_SEGMENT.segmentNumber,
    startLine: typeof parsed.startLine === 'number' ? parsed.startLine : DEFAULT_TIMELINE_SEGMENT.startLine,
    endLine: typeof parsed.endLine === 'number' ? parsed.endLine : DEFAULT_TIMELINE_SEGMENT.endLine,
    startMinute: typeof parsed.startMinute === 'number' ? parsed.startMinute : DEFAULT_TIMELINE_SEGMENT.startMinute,
    endMinute: typeof parsed.endMinute === 'number' ? parsed.endMinute : DEFAULT_TIMELINE_SEGMENT.endMinute,
    jokeCount: typeof parsed.jokeCount === 'number' ? parsed.jokeCount : DEFAULT_TIMELINE_SEGMENT.jokeCount,
    laughScore: typeof parsed.laughScore === 'number' ? parsed.laughScore : DEFAULT_TIMELINE_SEGMENT.laughScore,
    dominantType:
      parsed.dominantType === 'basic' ||
      parsed.dominantType === 'standard' ||
      parsed.dominantType === 'intermediate' ||
      parsed.dominantType === 'advanced' ||
      parsed.dominantType === 'high'
        ? parsed.dominantType
        : DEFAULT_TIMELINE_SEGMENT.dominantType,
  };
}

export function coerceTimeline(input?: unknown): TimelineData {
  const parsed = TimelineSchema.parse(input ?? {});
  return {
    ...DEFAULT_TIMELINE,
    ...parsed,
    segments: (parsed.segments ?? []).map(coerceTimelineSegment),
    hotSpots: (parsed.hotSpots ?? []).map((spot) => ({
      ...DEFAULT_HOT_SPOT,
      ...spot,
    })),
    coldSpots: (parsed.coldSpots ?? []).map((spot) => ({
      ...DEFAULT_COLD_SPOT,
      ...spot,
    })),
    biggestLaugh: coerceTimelineMoment(parsed.biggestLaugh),
    longestDrySpell: coerceTimelineMoment(parsed.longestDrySpell),
  };
}

export function coerceFeedback(input?: unknown): FeedbackSection {
  const parsed = maybeObject(input) ?? {};
  return {
    ...DEFAULT_FEEDBACK,
    strengths: Array.isArray(parsed.strengths) ? parsed.strengths.filter(Boolean) : DEFAULT_FEEDBACK.strengths,
    opportunities: Array.isArray(parsed.opportunities)
      ? parsed.opportunities.filter(Boolean)
      : DEFAULT_FEEDBACK.opportunities,
    quickWins: Array.isArray(parsed.quickWins) ? parsed.quickWins.filter(Boolean) : DEFAULT_FEEDBACK.quickWins,
  };
}

function coerceGap(input?: unknown, fallbackId: string): Gap {
  const parsed = GapSchema.parse(input ?? {});
  return {
    ...DEFAULT_GAP,
    ...parsed,
    id: parsed.id ?? fallbackId,
    severity: parsed.severity ?? DEFAULT_GAP.severity,
    isRetentionCliff: parsed.isRetentionCliff ?? DEFAULT_GAP.isRetentionCliff,
  };
}

function coerceGapRecommendation(input?: unknown, fallbackId: string): GapRecommendation {
  const parsed = GapRecommendationSchema.parse(input ?? {});
  return {
    ...DEFAULT_GAP_RECOMMENDATION,
    ...parsed,
    gapId: parsed.gapId ?? fallbackId,
    type: parsed.type ?? DEFAULT_GAP_RECOMMENDATION.type,
  };
}

export function coerceGapAnalysis(input?: unknown): GapAnalysis {
  const parsed = GapAnalysisSchema.parse(input ?? {});
  const gaps = (parsed.gaps ?? []).map((gap, index) => coerceGap(gap, `gap_${index}`));
  const retention =
    parsed.retentionCliff === null
      ? null
      : parsed.retentionCliff
      ? coerceGap(parsed.retentionCliff, 'retention_cliff')
      : null;

  return {
    ...DEFAULT_GAP_ANALYSIS,
    ...parsed,
    gaps,
    retentionCliff: retention,
    recommendations: (parsed.recommendations ?? []).map((rec, index) =>
      coerceGapRecommendation(rec, gaps[index]?.id ?? `gap_${index}`)
    ),
  };
}

function coercePunchUpAlternative(input?: unknown): PunchUpAlternative {
  const parsed = PunchUpAlternativeSchema.parse(input ?? {});
  return { ...DEFAULT_PUNCH_UP_ALTERNATIVE, ...parsed, style: parsed.style ?? DEFAULT_PUNCH_UP_ALTERNATIVE.style };
}

function coercePunchUp(input?: unknown, fallbackId: string): PunchUp {
  const parsed = PunchUpSchema.parse(input ?? {});
  return {
    ...DEFAULT_PUNCH_UP,
    ...parsed,
    id: parsed.id ?? fallbackId,
    alternatives: (parsed.alternatives ?? []).map(coercePunchUpAlternative),
    priority: parsed.priority ?? DEFAULT_PUNCH_UP.priority,
  };
}

export function coercePunchUps(input?: unknown): PunchUpSection {
  const parsed = PunchUpSectionSchema.parse(input ?? {});
  return {
    ...DEFAULT_PUNCH_UP_SECTION,
    ...parsed,
    punchUps: (parsed.punchUps ?? []).map((punch, index) => coercePunchUp(punch, `punchup_${index}`)),
  };
}

function coerceCharacterProfile(input?: unknown): CharacterProfile {
  const candidate = maybeObject(input) ?? {};
  const parsed = {
    name: typeof candidate.name === 'string' && candidate.name.trim() ? candidate.name : DEFAULT_CHARACTER_PROFILE.name,
    jokeCount: typeof candidate.jokeCount === 'number' ? candidate.jokeCount : DEFAULT_CHARACTER_PROFILE.jokeCount,
    jokePercentage:
      typeof candidate.jokePercentage === 'number' ? candidate.jokePercentage : DEFAULT_CHARACTER_PROFILE.jokePercentage,
    primaryStyle: typeof candidate.primaryStyle === 'string' ? candidate.primaryStyle : DEFAULT_CHARACTER_PROFILE.primaryStyle,
    strongestMoment:
      typeof candidate.strongestMoment === 'string' ? candidate.strongestMoment : DEFAULT_CHARACTER_PROFILE.strongestMoment,
    voiceConsistency:
      typeof candidate.voiceConsistency === 'number'
        ? candidate.voiceConsistency
        : DEFAULT_CHARACTER_PROFILE.voiceConsistency,
    screenTimeEstimate:
      typeof candidate.screenTimeEstimate === 'number'
        ? candidate.screenTimeEstimate
        : DEFAULT_CHARACTER_PROFILE.screenTimeEstimate,
  };

  return { ...DEFAULT_CHARACTER_PROFILE, ...parsed };
}

function coerceCharacterBalance(input?: unknown): CharacterBalance {
  const parsed = CharacterBalanceSchema.parse(input ?? {});
  return {
    ...DEFAULT_CHARACTER_BALANCE,
    ...parsed,
    status: parsed.status ?? DEFAULT_CHARACTER_BALANCE.status,
    dominantCharacter: parsed.dominantCharacter ?? DEFAULT_CHARACTER_BALANCE.dominantCharacter,
    underutilized: parsed.underutilized ?? DEFAULT_CHARACTER_BALANCE.underutilized,
  };
}

export function coerceCharacters(input?: unknown): CharacterAnalysis {
  const parsed = CharacterAnalysisSchema.parse(input ?? {});
  return {
    ...DEFAULT_CHARACTER_ANALYSIS,
    ...parsed,
    characters: (parsed.characters ?? []).map(coerceCharacterProfile),
    balance: coerceCharacterBalance(parsed.balance),
    interactions: parsed.interactions ?? DEFAULT_CHARACTER_ANALYSIS.interactions,
    recommendations: parsed.recommendations ?? DEFAULT_CHARACTER_ANALYSIS.recommendations,
  };
}

function coerceCallback(input?: unknown, fallbackLine: number): Callback {
  const parsed = CallbackSchema.parse(input ?? {});
  return {
    ...DEFAULT_CALLBACK,
    ...parsed,
    payoffLine: parsed.payoffLine ?? fallbackLine,
    effectiveness: parsed.effectiveness ?? DEFAULT_CALLBACK.effectiveness,
  };
}

function coerceCallbackOpportunity(input?: unknown): CallbackOpportunity {
  const parsed = CallbackOpportunitySchema.parse(input ?? {});
  return {
    ...DEFAULT_CALLBACK_OPPORTUNITY,
    ...parsed,
    potentialImpact: parsed.potentialImpact ?? DEFAULT_CALLBACK_OPPORTUNITY.potentialImpact,
  };
}

export function coerceCallbacks(input?: unknown): CallbackAnalysis {
  const parsed = CallbackAnalysisSchema.parse(input ?? {});
  return {
    ...DEFAULT_CALLBACK_ANALYSIS,
    ...parsed,
    existingCallbacks: (parsed.existingCallbacks ?? []).map((cb, index) => coerceCallback(cb, index)),
    missedOpportunities: (parsed.missedOpportunities ?? []).map(coerceCallbackOpportunity),
    callbackScore: parsed.callbackScore ?? DEFAULT_CALLBACK_ANALYSIS.callbackScore,
    recommendations: parsed.recommendations ?? DEFAULT_CALLBACK_ANALYSIS.recommendations,
  };
}

export function coerceAnalysis(raw: unknown): AnalysisShape {
  const candidate = maybeObject(raw) ?? {};
  const parsed: ParsedAnalysis = AnalysisSchema.parse({
    scriptStats: candidate.scriptStats,
    metrics: candidate.metrics,
    timeline: candidate.timeline,
    feedback: candidate.feedback,
    gaps: candidate.gaps,
    punchUps: candidate.punchUps,
    characters: candidate.characters,
    callbacks: candidate.callbacks,
    summary: candidate.summary,
    coachNote: candidate.coachNote,
  });

  return {
    scriptStats: coerceScriptStats(parsed.scriptStats),
    metrics: coerceMetrics(parsed.metrics),
    timeline: coerceTimeline(parsed.timeline),
    feedback: coerceFeedback(parsed.feedback),
    gaps: coerceGapAnalysis(parsed.gaps),
    punchUps: coercePunchUps(parsed.punchUps),
    characters: coerceCharacters(parsed.characters),
    callbacks: coerceCallbacks(parsed.callbacks),
    summary: typeof parsed.summary === 'string' ? parsed.summary : DEFAULT_ANALYSIS.summary,
    coachNote: typeof parsed.coachNote === 'string' ? parsed.coachNote : DEFAULT_ANALYSIS.coachNote,
  } satisfies AnalysisShape;
}
