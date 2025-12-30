import { clamp } from '@/lib/utils';
import type {
  FullAnalysis,
  ScriptFormat,
  CoreMetrics,
  JokeDistribution,
  Gap,
  GapRecommendation,
  CharacterProfile,
  CharacterBalance,
  Callback,
  CallbackAnalysis,
  TimelineSegment,
  HotSpot,
  ColdSpot,
  JokeComplexity,
} from '@/types';

export interface PromptARaw {
  metadata: {
    formatType: 'auto' | 'sitcom' | 'singlecam' | 'sketch' | 'standup' | 'feature';
    totalLines: number;
    estimatedRuntimeMin: number;
  };
  scores: {
    overallScore: number;
    CHS: number;
  };
  metrics: {
    totalJokes: number;
    laughsPerMinute: number;
    linesPerJoke: number;
    peakLaughMoments: number;
    sustainedLaughCount: number;
    callbackFrequency: number;
    characterBalanceScore: number;
    runtimeMinutes: number;
  };
  jokeAnalysis: {
    categoryCounts: {
      Basic: number;
      Standard: number;
      Intermediate: number;
      Advanced: number;
      HighComplexity: number;
    };
    weightedScores: {
      BasicScore: number;
      StandardScore: number;
      IntermediateScore: number;
      AdvancedScore: number;
      HighScore: number;
      TotalWeightedJokeScore: number;
      MaxPossibleScore: number;
      JokeRatio: number;
    };
    runtimeFactor: number;
    bonusPoints: number;
    penaltyPoints: number;
    jokesByLine: Array<{
      line: number;
      type: 'Basic' | 'Standard' | 'Intermediate' | 'Advanced' | 'HighComplexity';
      character: string;
    }>;
  };
  characterAnalysis: {
    jokesPerCharacter: Record<string, number>;
    characterBalanceScore: number;
  };
  callbackAnalysis: {
    totalCallbacks: number;
    callbackFrequency: number;
    callbacksDetail: Array<{
      setupLine: number;
      callbackLine: number;
      description: string;
    }>;
    missedCallbacks: number;
  };
  gapAnalysis: {
    gaps: Array<{
      startLine: number;
      endLine: number;
      length: number;
      durationMin: number;
    }>;
    retentionCliff: {
      startLine: number;
      endLine: number;
      length: number;
      durationMin: number;
    } | null;
    gapPriorityScores: Array<{
      startLine: number;
      endLine: number;
      priority: number;
    }>;
  };
  hackyJokeAnalysis: {
    hackyCount: number;
    issues: string[];
  };
  recommendations: string[];
}

function toScriptFormat(format: PromptARaw['metadata']['formatType']): ScriptFormat {
  if (format === 'singlecam') return 'sitcom';
  if (format === 'auto') return 'auto';
  return format;
}

function mapJokeDistribution(raw: PromptARaw['jokeAnalysis']['categoryCounts']): JokeDistribution {
  return {
    basic: raw?.Basic ?? 0,
    standard: raw?.Standard ?? 0,
    intermediate: raw?.Intermediate ?? 0,
    advanced: raw?.Advanced ?? 0,
    high: raw?.HighComplexity ?? 0,
  };
}

function mapGaps(raw: PromptARaw['gapAnalysis']): { gaps: Gap[]; retentionCliff: Gap | null; recommendations: GapRecommendation[] } {
  const gaps: Gap[] = (raw?.gaps ?? []).map((gap, index) => ({
    id: `gap_${index}`,
    startLine: gap.startLine ?? 0,
    endLine: gap.endLine ?? 0,
    startMinute: 0,
    endMinute: 0,
    durationMinutes: gap.durationMin ?? 0,
    durationLines: gap.length ?? 0,
    severity: 'minor',
    isRetentionCliff: false,
    context: '',
    suggestion: '',
    priority: 1,
  }));

  const retention = raw?.retentionCliff
    ? ({
        id: 'retention_cliff',
        startLine: raw.retentionCliff.startLine ?? 0,
        endLine: raw.retentionCliff.endLine ?? 0,
        startMinute: 0,
        endMinute: 0,
        durationMinutes: raw.retentionCliff.durationMin ?? 0,
        durationLines: raw.retentionCliff.length ?? 0,
        severity: 'moderate',
        isRetentionCliff: true,
        context: '',
        suggestion: '',
        priority: 1,
      } as Gap)
    : null;

  const recommendations: GapRecommendation[] = (raw?.gapPriorityScores ?? []).map((score, index) => ({
    gapId: `gap_${index}`,
    recommendation: '',
    exampleLine: '',
    type: 'add-joke',
  }));

  return { gaps, retentionCliff: retention, recommendations };
}

function mapCharacters(raw: PromptARaw['characterAnalysis'], metricBalance: number) {
  const entries = Object.entries(raw?.jokesPerCharacter ?? {});
  const totalJokes = entries.reduce((acc, [, count]) => acc + (count ?? 0), 0);

  const characters: CharacterProfile[] = entries.map(([name, count]) => ({
    name,
    jokeCount: count ?? 0,
    jokePercentage: totalJokes ? (count / totalJokes) * 100 : 0,
    primaryStyle: '',
    strongestMoment: '',
    voiceConsistency: 0,
    screenTimeEstimate: 0,
  }));

  const dominant = entries.reduce(
    (acc, [name, count]) => (count > acc.count ? { name, count } : acc),
    { name: null as string | null, count: 0 }
  );

  const balance: CharacterBalance = {
    score: clamp((metricBalance ?? 0) * 100, 0, 100),
    status: 'balanced',
    dominantCharacter: dominant.name,
    underutilized: [],
  };

  return { characters, balance };
}

function mapCallbacks(raw: PromptARaw['callbackAnalysis']): CallbackAnalysis {
  const existingCallbacks: Callback[] = (raw?.callbacksDetail ?? []).map((item) => ({
    setupLine: item.setupLine ?? 0,
    setupQuote: '',
    payoffLine: item.callbackLine ?? 0,
    payoffQuote: '',
    effectiveness: 'medium',
  }));

  return {
    existingCallbacks,
    missedOpportunities: [],
    callbackScore: raw?.callbackFrequency ?? 0,
    recommendations: [],
  };
}

function mapJokeTypeToComplexity(type: string): JokeComplexity {
  const mapping: Record<string, JokeComplexity> = {
    Basic: 'basic',
    Standard: 'standard',
    Intermediate: 'intermediate',
    Advanced: 'advanced',
    HighComplexity: 'high',
  };
  return mapping[type] || 'standard';
}

function generateTimelineData(raw: PromptARaw) {
  const jokesByLine = raw?.jokeAnalysis?.jokesByLine ?? [];
  const totalLines = raw?.metadata?.totalLines ?? 100;
  const runtimeMin = raw?.metadata?.estimatedRuntimeMin ?? raw?.metrics?.runtimeMinutes ?? 10;
  const gaps = raw?.gapAnalysis?.gaps ?? [];

  // Create ~10-12 segments for the timeline
  const numSegments = Math.min(Math.max(6, Math.ceil(runtimeMin / 2)), 15);
  const linesPerSegment = Math.ceil(totalLines / numSegments);
  const minutesPerSegment = runtimeMin / numSegments;

  const segments: TimelineSegment[] = [];

  for (let i = 0; i < numSegments; i++) {
    const startLine = i * linesPerSegment + 1;
    const endLine = Math.min((i + 1) * linesPerSegment, totalLines);
    const startMinute = i * minutesPerSegment;
    const endMinute = (i + 1) * minutesPerSegment;

    // Count jokes in this segment
    const segmentJokes = jokesByLine.filter(
      (j) => j.line >= startLine && j.line <= endLine
    );
    const jokeCount = segmentJokes.length;

    // Calculate laugh score (0-10) based on joke density
    // Target: ~2-3 jokes per segment for a good score
    const densityScore = Math.min(10, (jokeCount / Math.max(1, linesPerSegment / 20)) * 5);

    // Boost score based on joke complexity
    const complexityBonus = segmentJokes.reduce((acc, j) => {
      if (j.type === 'HighComplexity') return acc + 0.5;
      if (j.type === 'Advanced') return acc + 0.3;
      if (j.type === 'Intermediate') return acc + 0.1;
      return acc;
    }, 0);

    const laughScore = clamp(Math.round((densityScore + complexityBonus) * 10) / 10, 0, 10);

    // Determine dominant joke type
    const typeCounts: Record<string, number> = {};
    segmentJokes.forEach((j) => {
      typeCounts[j.type] = (typeCounts[j.type] || 0) + 1;
    });
    const dominantType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Standard';

    segments.push({
      segmentNumber: i + 1,
      startLine,
      endLine,
      startMinute: Math.round(startMinute * 10) / 10,
      endMinute: Math.round(endMinute * 10) / 10,
      jokeCount,
      laughScore,
      dominantType: mapJokeTypeToComplexity(dominantType),
    });
  }

  // Generate hot spots (segments with high laugh scores)
  const hotSpots: HotSpot[] = segments
    .filter((s) => s.laughScore >= 7)
    .map((s) => ({
      startMinute: s.startMinute,
      endMinute: s.endMinute,
      description: `Strong comedy section with ${s.jokeCount} jokes`,
      jokeCount: s.jokeCount,
    }));

  // Generate cold spots from gaps data
  const coldSpots: ColdSpot[] = gaps.map((gap) => {
    const severity: ColdSpot['severity'] =
      gap.durationMin >= 3 ? 'critical' : gap.durationMin >= 1.5 ? 'moderate' : 'minor';
    return {
      startMinute: (gap.startLine / totalLines) * runtimeMin,
      endMinute: (gap.endLine / totalLines) * runtimeMin,
      durationMinutes: gap.durationMin ?? 0,
      severity,
      suggestion: `Consider adding comedy beats between lines ${gap.startLine}-${gap.endLine}`,
    };
  });

  // Find biggest laugh (segment with highest score)
  const biggestLaughSegment = segments.reduce(
    (best, s) => (s.laughScore > best.laughScore ? s : best),
    segments[0] || { laughScore: 0, startMinute: 0, startLine: 0 }
  );

  // Find longest dry spell
  const dryColdSpot = coldSpots.reduce(
    (longest, spot) => (spot.durationMinutes > longest.durationMinutes ? spot : longest),
    coldSpots[0] || { startMinute: 0, durationMinutes: 0 }
  );

  return {
    segments,
    hotSpots,
    coldSpots,
    biggestLaugh: {
      minute: Math.round(biggestLaughSegment?.startMinute ?? 0),
      line: biggestLaughSegment?.startLine ?? 0,
      description: biggestLaughSegment
        ? `Peak comedy around minute ${Math.round(biggestLaughSegment.startMinute)} with ${biggestLaughSegment.jokeCount} jokes`
        : 'N/A',
      quote: '',
    },
    longestDrySpell: {
      minute: Math.round(dryColdSpot?.startMinute ?? 0),
      line: 0,
      description: dryColdSpot?.durationMinutes
        ? `${dryColdSpot.durationMinutes.toFixed(1)} minute gap without significant laughs`
        : 'No significant gaps detected',
      quote: '',
    },
  };
}

export function translatePromptAToFullAnalysis(raw: PromptARaw): FullAnalysis {
  const format = toScriptFormat(raw?.metadata?.formatType ?? 'auto');

  const metrics: CoreMetrics = {
    overallScore: raw?.scores?.overallScore ?? 0,
    laughsPerMinute: raw?.metrics?.laughsPerMinute ?? 0,
    linesPerJoke: raw?.metrics?.linesPerJoke ?? 0,
    totalJokes: raw?.metrics?.totalJokes ?? 0,
    peakLaughMoments: raw?.metrics?.peakLaughMoments ?? 0,
    sustainedLaughSequences: raw?.metrics?.sustainedLaughCount ?? 0,
    callbackFrequency: raw?.metrics?.callbackFrequency ?? 0,
    jokeDistribution: mapJokeDistribution(raw?.jokeAnalysis?.categoryCounts ?? ({} as any)),
    formatComparison: {
      targetLPM: 2.0,
      targetLPJ: 6.0,
      lpmStatus: 'on-target',
      lpjStatus: 'on-target',
      industryPercentile: 50,
    },
  };

  const { gaps, retentionCliff, recommendations } = mapGaps(raw?.gapAnalysis ?? ({} as any));
  const characterBalanceScore = raw?.metrics?.characterBalanceScore ?? raw?.characterAnalysis?.characterBalanceScore ?? 0;
  const { characters, balance } = mapCharacters(raw?.characterAnalysis ?? ({} as any), characterBalanceScore);
  const callbacks = mapCallbacks(raw?.callbackAnalysis ?? ({} as any));
  const timeline = generateTimelineData(raw);

  const summary = (raw?.recommendations ?? []).join(' ').trim() || '';
  const coachNote = summary;

  return {
    id: '',
    timestamp: '',
    title: '',
    format: format as ScriptFormat,
    scriptStats: {
      totalLines: raw?.metadata?.totalLines ?? 0,
      dialogueLines: raw?.metadata?.totalLines ?? 0,
      estimatedRuntime: raw?.metadata?.estimatedRuntimeMin ?? raw?.metrics?.runtimeMinutes ?? 0,
      wordCount: 0,
      sceneCount: 0,
      characterCount: characters.length,
    },
    metrics,
    timeline,
    feedback: {
      strengths: [],
      opportunities: [],
      quickWins: [],
    },
    gaps: {
      gaps,
      retentionCliff,
      averageGapDuration: 0,
      longestGap: gaps.reduce((max, gap) => Math.max(max, gap.durationMinutes), 0),
      gapScore: 100,
      recommendations,
    },
    punchUps: {
      punchUps: [],
      overallTone: '',
      styleNotes: [],
    },
    characters: {
      characters,
      balance,
      interactions: [],
      recommendations: [],
    },
    callbacks,
    summary,
    coachNote,
  };
}
