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

function generateTimeline(raw: PromptARaw) {
  const jokesByLine = raw?.jokeAnalysis?.jokesByLine ?? [];
  const totalLines = raw?.metadata?.totalLines ?? 1;
  const runtimeMinutes = raw?.metadata?.estimatedRuntimeMin ?? raw?.metrics?.runtimeMinutes ?? 1;
  const gaps = raw?.gapAnalysis?.gaps ?? [];

  // Generate segments (divide script into ~10-20 segments)
  const segmentCount = Math.min(Math.max(Math.floor(runtimeMinutes / 0.5), 5), 20);
  const linesPerSegment = Math.ceil(totalLines / segmentCount);
  
  const segments = [];
  for (let i = 0; i < segmentCount; i++) {
    const startLine = i * linesPerSegment + 1;
    const endLine = Math.min((i + 1) * linesPerSegment, totalLines);
    const startMinute = (startLine / totalLines) * runtimeMinutes;
    const endMinute = (endLine / totalLines) * runtimeMinutes;
    
    // Count jokes in this segment
    const jokesInSegment = jokesByLine.filter(
      (joke) => joke.line >= startLine && joke.line <= endLine
    );
    
    const jokeCount = jokesInSegment.length;
    const segmentDuration = endMinute - startMinute;
    const laughScore = Math.min((jokeCount / Math.max(segmentDuration, 0.1)) * 1.5, 10);
    
    // Determine dominant type
    const typeCounts: Record<string, number> = {};
    jokesInSegment.forEach((joke) => {
      typeCounts[joke.type] = (typeCounts[joke.type] || 0) + 1;
    });
    const dominantType = Object.keys(typeCounts).reduce((a, b) => 
      typeCounts[a] > typeCounts[b] ? a : b, 'Standard'
    );
    
    segments.push({
      segmentNumber: i + 1,
      startLine,
      endLine,
      startMinute,
      endMinute,
      jokeCount,
      laughScore,
      dominantType: dominantType.toLowerCase() as any,
    });
  }

  // Find hot spots (segments with high laugh scores)
  const hotSpots = segments
    .filter((seg) => seg.laughScore >= 6)
    .map((seg) => ({
      startMinute: seg.startMinute,
      endMinute: seg.endMinute,
      description: `High comedy density with ${seg.jokeCount} jokes`,
      jokeCount: seg.jokeCount,
    }));

  // Convert gaps to cold spots
  const coldSpots = gaps.map((gap) => {
    const startMinute = (gap.startLine / totalLines) * runtimeMinutes;
    const endMinute = (gap.endLine / totalLines) * runtimeMinutes;
    const durationMinutes = gap.durationMin ?? (endMinute - startMinute);
    
    return {
      startMinute,
      endMinute,
      durationMinutes,
      severity: durationMinutes > 2 ? 'critical' : durationMinutes > 1 ? 'moderate' : 'minor',
      suggestion: `Add jokes between lines ${gap.startLine}-${gap.endLine}`,
    };
  }) as any[];

  // Find biggest laugh (segment with highest score)
  const biggestSegment = segments.reduce((max, seg) => 
    seg.laughScore > max.laughScore ? seg : max, segments[0] || { laughScore: 0, startMinute: 0, startLine: 0 }
  );
  
  const biggestLaugh = {
    minute: Math.floor(biggestSegment.startMinute),
    line: biggestSegment.startLine,
    description: `Peak comedy moment with ${biggestSegment.jokeCount} jokes`,
    quote: '',
  };

  // Find longest dry spell (largest gap)
  const longestGap = gaps.reduce((max, gap) => 
    (gap.durationMin ?? 0) > (max.durationMin ?? 0) ? gap : max, 
    gaps[0] || { startLine: 0, durationMin: 0 }
  );
  
  const longestDrySpell = longestGap ? {
    minute: Math.floor((longestGap.startLine / totalLines) * runtimeMinutes),
    line: longestGap.startLine,
    description: `${longestGap.durationMin?.toFixed(1) ?? 0} minute gap without jokes`,
    quote: '',
  } : { minute: 0, line: 0, description: 'N/A', quote: '' };

  return {
    segments,
    hotSpots,
    coldSpots,
    biggestLaugh,
    longestDrySpell,
  };
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
    timeline: generateTimeline(raw),
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
