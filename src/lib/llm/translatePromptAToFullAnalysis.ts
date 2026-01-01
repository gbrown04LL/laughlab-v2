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
  JokeComplexity,
  TimelineMoment,
} from '@/types';
import { estimateRuntime } from '@/lib/utils';

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

function getGapSeverity(durationMinutes: number, length: number): Gap['severity'] {
  if (durationMinutes >= 5 || length >= 80) return 'critical';
  if (durationMinutes >= 3 || length >= 40) return 'moderate';
  return 'minor';
}

function gapSuggestion(severity: Gap['severity']): string {
  if (severity === 'critical') {
    return 'Add a set piece, runner, or multi-beat gag to re-engage the audience.';
  }
  if (severity === 'moderate') {
    return 'Drop in a callback or faster tag to keep momentum through this section.';
  }
  return 'Sprinkle a quick button or visual gag to avoid the lull.';
}

function mapGaps(
  raw: PromptARaw['gapAnalysis'],
  linesPerMinute: number
): { gaps: Gap[]; retentionCliff: Gap | null; recommendations: GapRecommendation[] } {
  const priorityLookup = new Map<string, number>();
  (raw?.gapPriorityScores ?? []).forEach((score) => {
    priorityLookup.set(`${score.startLine}-${score.endLine}`, score.priority);
  });

  const toMinutes = (length: number, durationMin?: number) => {
    if (typeof durationMin === 'number' && durationMin > 0) return durationMin;
    if (linesPerMinute > 0 && length > 0) {
      return Number((length / linesPerMinute).toFixed(1));
    }
    return 0;
  };

  const gaps: Gap[] = (raw?.gaps ?? []).map((gap, index) => {
    const durationMinutes = toMinutes(gap.length ?? 0, gap.durationMin);
    const severity = getGapSeverity(durationMinutes, gap.length ?? 0);
    const startMinute = linesPerMinute > 0 ? Number(((gap.startLine ?? 0) / linesPerMinute).toFixed(1)) : 0;
    const endMinute = linesPerMinute > 0 ? Number(((gap.endLine ?? 0) / linesPerMinute).toFixed(1)) : durationMinutes;
    const key = `${gap.startLine}-${gap.endLine}`;
    const priority = priorityLookup.get(key) ?? raw?.gapPriorityScores?.[index]?.priority ?? index + 1;

    return {
      id: `gap_${index}`,
      startLine: gap.startLine ?? 0,
      endLine: gap.endLine ?? 0,
      startMinute,
      endMinute,
      durationMinutes,
      durationLines: gap.length ?? 0,
      severity,
      isRetentionCliff: false,
      context: `Lower laugh density between lines ${gap.startLine ?? 0}-${gap.endLine ?? 0}.`,
      suggestion: gapSuggestion(severity),
      priority,
    };
  });

  const retention = raw?.retentionCliff
    ? ({
        id: 'retention_cliff',
        startLine: raw.retentionCliff.startLine ?? 0,
        endLine: raw.retentionCliff.endLine ?? 0,
        startMinute:
          linesPerMinute > 0 ? Number(((raw.retentionCliff.startLine ?? 0) / linesPerMinute).toFixed(1)) : 0,
        endMinute: linesPerMinute > 0 ? Number(((raw.retentionCliff.endLine ?? 0) / linesPerMinute).toFixed(1)) : 0,
        durationMinutes: toMinutes(raw.retentionCliff.length ?? 0, raw.retentionCliff.durationMin),
        durationLines: raw.retentionCliff.length ?? 0,
        severity: getGapSeverity(toMinutes(raw.retentionCliff.length ?? 0, raw.retentionCliff.durationMin), raw.retentionCliff.length ?? 0),
        isRetentionCliff: true,
        context: 'Audience engagement drops significantly here. Rebuild momentum before this point.',
        suggestion: 'Add a strong runner or payoff before this section to avoid drop-off.',
        priority: 1,
      } as Gap)
    : null;

  const recommendations: GapRecommendation[] = (raw?.gapPriorityScores ?? []).map((score, index) => {
    const gapId = gaps[index]?.id ?? `gap_${index}`;
    const severity = gaps[index]?.severity ?? 'minor';
    const recText =
      severity === 'critical'
        ? `Rebuild lines ${score.startLine}-${score.endLine} with a set piece or layered bit.`
        : severity === 'moderate'
        ? `Inject callbacks or tags between lines ${score.startLine}-${score.endLine} to keep pace.`
        : `Add a quick button in lines ${score.startLine}-${score.endLine} to smooth the lull.`;

    return {
      gapId,
      recommendation: recText,
      exampleLine: '',
      type: severity === 'critical' ? 'restructure' : severity === 'moderate' ? 'add-callback' : 'add-joke',
    };
  });

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

function mapTimelineData(
  raw: PromptARaw,
  runtimeMinutes: number,
  totalLines: number,
  linesPerMinute: number,
  gaps: Gap[],
  retentionCliff: Gap | null
) {
  const jokes = raw?.jokeAnalysis?.jokesByLine ?? [];
  const highestLine = jokes.reduce((max, joke) => Math.max(max, joke.line ?? 0), totalLines);
  const baseMinutes = runtimeMinutes > 0 ? Math.max(1, Math.round(runtimeMinutes)) : 0;
  const minutesFromLines = linesPerMinute > 0 ? Math.ceil((highestLine || totalLines) / linesPerMinute) : 0;
  const minutesFromGaps = Math.ceil(
    Math.max(
      0,
      ...gaps.map((gap) => gap.endMinute),
      retentionCliff?.endMinute ?? 0
    )
  );
  const totalMinutes = Math.max(1, baseMinutes, minutesFromLines, minutesFromGaps);

  const complexityWeights: Record<
    PromptARaw['jokeAnalysis']['jokesByLine'][number]['type'],
    { weight: number; mapped: JokeComplexity }
  > = {
    Basic: { weight: 1, mapped: 'basic' },
    Standard: { weight: 1.25, mapped: 'standard' },
    Intermediate: { weight: 1.5, mapped: 'intermediate' },
    Advanced: { weight: 1.8, mapped: 'advanced' },
    HighComplexity: { weight: 2.1, mapped: 'high' },
  };

  const buckets = Array.from({ length: totalMinutes }, (_, minute) => ({
    minute,
    startLine: Math.round(minute * linesPerMinute),
    endLine: Math.round((minute + 1) * linesPerMinute),
    count: 0,
    weighted: 0,
    typeCounts: {} as Partial<Record<JokeComplexity, number>>,
  }));

  let strongestJoke: { weight: number; line: number; type: JokeComplexity } | null = null;

  jokes.forEach((joke) => {
    const weight = complexityWeights[joke.type] ?? complexityWeights.Standard;
    const minuteIndex = Math.min(
      buckets.length - 1,
      Math.max(0, Math.floor(((joke.line ?? 1) - 1) / linesPerMinute))
    );
    const bucket = buckets[minuteIndex];

    bucket.count += 1;
    bucket.weighted += weight.weight;
    bucket.typeCounts[weight.mapped] = (bucket.typeCounts[weight.mapped] ?? 0) + 1;

    if (!strongestJoke || weight.weight > strongestJoke.weight) {
      strongestJoke = { weight: weight.weight, line: joke.line ?? 0, type: weight.mapped };
    }
  });

  const segments = buckets.map((bucket, index) => {
    const dominantType =
      (Object.entries(bucket.typeCounts).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))[0]?.[0] as JokeComplexity) ||
      'standard';
    const laughScore = clamp(Number((bucket.weighted * 2).toFixed(1)), 0, 10);

    return {
      segmentNumber: index + 1,
      startLine: bucket.startLine,
      endLine: bucket.endLine,
      startMinute: bucket.minute,
      endMinute: bucket.minute + 1,
      jokeCount: bucket.count,
      laughScore,
      dominantType,
    };
  });

  const hotSpots = segments
    .filter((segment) => segment.laughScore >= 6 && segment.jokeCount > 0)
    .slice(0, 3)
    .map((segment) => ({
      startMinute: segment.startMinute,
      endMinute: segment.endMinute,
      description: `Sustained laughs around minute ${segment.startMinute}-${segment.endMinute}`,
      jokeCount: segment.jokeCount,
    }));

  const coldSpots = gaps.map((gap) => ({
    startMinute: gap.startMinute,
    endMinute: gap.endMinute,
    durationMinutes: gap.durationMinutes,
    severity: gap.severity,
    suggestion: gap.suggestion,
  }));

  const defaultMoment: TimelineMoment = { minute: 0, line: 0, description: 'N/A', quote: '' };
  const strongest = strongestJoke as { weight: number; line: number; type: JokeComplexity } | null;
  const biggestLaugh = strongest
    ? {
        minute: Math.max(0, Math.round((strongest.line ?? 0) / Math.max(linesPerMinute, 1))),
        line: strongest.line ?? 0,
        description: `${strongest.type === 'high' ? 'High complexity' : strongest.type} joke lands hardest.`,
        quote: '',
      }
    : defaultMoment;

  const longestDrySpot = coldSpots.reduce(
    (longest, spot) => (spot.durationMinutes > longest.durationMinutes ? spot : longest),
    { startMinute: 0, endMinute: 0, durationMinutes: 0, severity: 'minor', suggestion: '' }
  );

  const longestDrySpell: TimelineMoment =
    longestDrySpot.durationMinutes > 0
      ? {
          minute: Math.round(longestDrySpot.startMinute),
          line: 0,
          description: `Few laughs for ~${longestDrySpot.durationMinutes} minutes`,
          quote: '',
        }
      : defaultMoment;

  return {
    segments,
    hotSpots,
    coldSpots,
    biggestLaugh,
    longestDrySpell,
  };
}

export function translatePromptAToFullAnalysis(raw: PromptARaw): FullAnalysis {
  const format = toScriptFormat(raw?.metadata?.formatType ?? 'auto');
  const totalLines =
    raw?.metadata?.totalLines ??
    raw?.jokeAnalysis?.jokesByLine?.reduce((max, joke) => Math.max(max, joke.line ?? 0), 0) ??
    0;
  const runtimeMinutes =
    raw?.metrics?.runtimeMinutes ??
    raw?.metadata?.estimatedRuntimeMin ??
    (totalLines ? estimateRuntime(totalLines) : 0);
  const linesPerMinute =
    runtimeMinutes > 0 && totalLines > 0 ? Math.max(totalLines / runtimeMinutes, 1) : 15;

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

  const { gaps, retentionCliff, recommendations } = mapGaps(raw?.gapAnalysis ?? ({} as any), linesPerMinute);
  const characterBalanceScore = raw?.metrics?.characterBalanceScore ?? raw?.characterAnalysis?.characterBalanceScore ?? 0;
  const { characters, balance } = mapCharacters(raw?.characterAnalysis ?? ({} as any), characterBalanceScore);
  const callbacks = mapCallbacks(raw?.callbackAnalysis ?? ({} as any));
  const timeline = mapTimelineData(raw, runtimeMinutes, totalLines, linesPerMinute, gaps, retentionCliff);

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
      estimatedRuntime: raw?.metadata?.estimatedRuntimeMin ?? raw?.metrics?.runtimeMinutes ?? estimateRuntime(totalLines ?? 0),
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
      averageGapDuration: gaps.length
        ? gaps.reduce((sum, gap) => sum + gap.durationMinutes, 0) / gaps.length
        : 0,
      longestGap: gaps.reduce((max, gap) => Math.max(max, gap.durationMinutes), 0),
      gapScore: clamp(
        100 -
          gaps.reduce(
            (penalty, gap) =>
              penalty +
              gap.durationMinutes *
                (gap.severity === 'critical' ? 3 : gap.severity === 'moderate' ? 2 : 1),
            0
          ),
        0,
        100
      ),
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
