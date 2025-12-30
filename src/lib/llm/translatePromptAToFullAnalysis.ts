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

// Complexity weights aligned with spec scoring
const COMPLEXITY_WEIGHTS: Record<string, number> = {
  Basic: 1,
  Standard: 2,
  Intermediate: 3,
  Advanced: 4,
  HighComplexity: 5,
};

function generateTimelineData(raw: PromptARaw) {
  const jokesByLine = raw?.jokeAnalysis?.jokesByLine ?? [];
  const totalLines = raw?.metadata?.totalLines ?? 100;
  const runtimeMin = raw?.metadata?.estimatedRuntimeMin ?? raw?.metrics?.runtimeMinutes ?? 10;
  const gaps = raw?.gapAnalysis?.gaps ?? [];
  const retentionCliff = raw?.gapAnalysis?.retentionCliff;
  const targetLPM = raw?.metrics?.laughsPerMinute ?? 2;

  // Use 2-minute segments (or fewer for short scripts)
  const segmentDuration = Math.min(2, runtimeMin / 4);
  const numSegments = Math.max(4, Math.ceil(runtimeMin / segmentDuration));
  const linesPerSegment = Math.ceil(totalLines / numSegments);

  const segments: TimelineSegment[] = [];

  for (let i = 0; i < numSegments; i++) {
    const startLine = i * linesPerSegment + 1;
    const endLine = Math.min((i + 1) * linesPerSegment, totalLines);
    const startMinute = (i * runtimeMin) / numSegments;
    const endMinute = ((i + 1) * runtimeMin) / numSegments;
    const segmentDurationMins = endMinute - startMinute;

    // Get jokes in this segment
    const segmentJokes = jokesByLine.filter(
      (j) => j.line >= startLine && j.line <= endLine
    );
    const jokeCount = segmentJokes.length;

    // Calculate weighted score based on complexity
    const weightedScore = segmentJokes.reduce(
      (acc, j) => acc + (COMPLEXITY_WEIGHTS[j.type] || 2),
      0
    );

    // Laugh score (0-10): based on jokes-per-minute relative to target
    // Target ~2 LPM = score 6, scale up/down from there
    const jokesPerMin = jokeCount / Math.max(0.5, segmentDurationMins);
    const densityRatio = jokesPerMin / Math.max(0.5, targetLPM);
    const baseScore = densityRatio * 6; // 6 is "on target"

    // Bonus for complexity variety (up to +2)
    const avgWeight = jokeCount > 0 ? weightedScore / jokeCount : 0;
    const complexityBonus = Math.min(2, (avgWeight - 2) * 0.5);

    const laughScore = clamp(Math.round((baseScore + complexityBonus) * 10) / 10, 0, 10);

    // Dominant joke type
    const typeCounts: Record<string, number> = {};
    segmentJokes.forEach((j) => {
      typeCounts[j.type] = (typeCounts[j.type] || 0) + 1;
    });
    const dominantType =
      Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Standard';

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

  // Hot spots: consecutive high-scoring segments or standout peaks
  const hotSpots: HotSpot[] = segments
    .filter((s) => s.laughScore >= 7 && s.jokeCount >= 2)
    .map((s) => ({
      startMinute: s.startMinute,
      endMinute: s.endMinute,
      description: `${s.jokeCount} jokes landed here`,
      jokeCount: s.jokeCount,
    }));

  // Cold spots from gap analysis - include retention cliff with highest severity
  const coldSpots: ColdSpot[] = gaps.map((gap) => {
    const isRetention =
      retentionCliff &&
      gap.startLine === retentionCliff.startLine &&
      gap.endLine === retentionCliff.endLine;
    const severity: ColdSpot['severity'] = isRetention
      ? 'critical'
      : gap.durationMin >= 2
        ? 'moderate'
        : 'minor';
    return {
      startMinute: (gap.startLine / totalLines) * runtimeMin,
      endMinute: (gap.endLine / totalLines) * runtimeMin,
      durationMinutes: gap.durationMin ?? 0,
      severity,
      suggestion: isRetention
        ? `Retention cliff: ${gap.length} lines without laughs—audiences may tune out`
        : `${gap.length}-line gap—consider adding a beat here`,
    };
  });

  // Biggest laugh = segment with highest weighted density
  const peakSegment = segments.reduce(
    (best, s) => (s.laughScore > best.laughScore ? s : best),
    segments[0] || { laughScore: 0, startMinute: 0, startLine: 0, jokeCount: 0 }
  );

  // Longest dry spell = retention cliff if present, else longest gap
  const drySpot = retentionCliff
    ? {
        startMinute: (retentionCliff.startLine / totalLines) * runtimeMin,
        durationMinutes: retentionCliff.durationMin ?? 0,
        line: retentionCliff.startLine,
      }
    : coldSpots.reduce(
        (longest, spot) =>
          spot.durationMinutes > longest.durationMinutes ? spot : longest,
        { startMinute: 0, durationMinutes: 0, line: 0 } as any
      );

  return {
    segments,
    hotSpots,
    coldSpots,
    biggestLaugh: {
      minute: Math.round(peakSegment.startMinute),
      line: peakSegment.startLine,
      description:
        peakSegment.jokeCount > 0
          ? `Peak at minute ${Math.round(peakSegment.startMinute)}—${peakSegment.jokeCount} jokes hit`
          : 'N/A',
      quote: '',
    },
    longestDrySpell: {
      minute: Math.round(drySpot.startMinute ?? 0),
      line: drySpot.line ?? 0,
      description: drySpot.durationMinutes
        ? `${drySpot.durationMinutes.toFixed(1)}-min gap${retentionCliff ? ' (retention cliff)' : ''}`
        : 'No major gaps',
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
