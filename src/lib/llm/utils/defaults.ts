import type {
  Callback,
  CallbackAnalysis,
  CallbackOpportunity,
  ColdSpot,
  CharacterAnalysis,
  CharacterBalance,
  CharacterProfile,
  CoreMetrics,
  FeedbackItem,
  FeedbackSection,
  Gap,
  GapAnalysis,
  GapRecommendation,
  HotSpot,
  PunchUp,
  PunchUpAlternative,
  PunchUpSection,
  QuickWin,
  ScriptStats,
  TimelineData,
  TimelineMoment,
  TimelineSegment,
  HotSpot,
} from '@/types';

export type AnalysisShape = {
  scriptStats: ScriptStats;
  metrics: CoreMetrics;
  timeline: TimelineData;
  feedback: FeedbackSection;
  gaps: GapAnalysis;
  punchUps: PunchUpSection;
  characters: CharacterAnalysis;
  callbacks: CallbackAnalysis;
  summary: string;
  coachNote: string;
};

export const DEFAULT_SCRIPT_STATS: ScriptStats = {
  totalLines: 0,
  dialogueLines: 0,
  estimatedRuntime: 0,
  wordCount: 0,
  sceneCount: 0,
  characterCount: 0,
} as const satisfies ScriptStats;

export const DEFAULT_METRICS: CoreMetrics = {
  overallScore: 0,
  laughsPerMinute: 0,
  linesPerJoke: 0,
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
    targetLPM: 0,
    targetLPJ: 0,
    lpmStatus: 'on-target',
    lpjStatus: 'on-target',
    industryPercentile: 0,
  },
} as const satisfies CoreMetrics;

export const DEFAULT_TIMELINE_SEGMENT: TimelineSegment = {
  segmentNumber: 0,
  startLine: 0,
  endLine: 0,
  startMinute: 0,
  endMinute: 0,
  jokeCount: 0,
  laughScore: 0,
  dominantType: 'standard',
} as const satisfies TimelineSegment;

export const DEFAULT_HOT_SPOT: HotSpot = {
  startMinute: 0,
  endMinute: 0,
  description: '',
  jokeCount: 0,
} as const satisfies HotSpot;

export const DEFAULT_COLD_SPOT: ColdSpot = {
  startMinute: 0,
  endMinute: 0,
  durationMinutes: 0,
  severity: 'minor',
  suggestion: '',
} as const satisfies ColdSpot;

export const DEFAULT_TIMELINE_MOMENT: TimelineMoment = {
  minute: 0,
  line: 0,
  description: 'N/A',
  quote: '',
} as const satisfies TimelineMoment;

export const DEFAULT_TIMELINE: TimelineData = {
  segments: [],
  hotSpots: [],
  coldSpots: [],
  biggestLaugh: DEFAULT_TIMELINE_MOMENT,
  longestDrySpell: DEFAULT_TIMELINE_MOMENT,
} as const satisfies TimelineData;

export const DEFAULT_FEEDBACK_ITEM: FeedbackItem = {
  title: '',
  description: '',
  lineReference: '',
  quote: '',
  impact: 'medium',
} as const satisfies FeedbackItem;

export const DEFAULT_QUICK_WIN: QuickWin = {
  action: '',
  expectedImpact: '',
  difficulty: 'easy',
} as const satisfies QuickWin;

export const DEFAULT_FEEDBACK: FeedbackSection = {
  strengths: [],
  opportunities: [],
  quickWins: [],
} as const satisfies FeedbackSection;

export const DEFAULT_GAP: Gap = {
  id: 'gap_0',
  startLine: 0,
  endLine: 0,
  startMinute: 0,
  endMinute: 0,
  durationMinutes: 0,
  durationLines: 0,
  severity: 'minor',
  isRetentionCliff: false,
  context: '',
  suggestion: '',
  priority: 1,
} as const satisfies Gap;

export const DEFAULT_GAP_RECOMMENDATION: GapRecommendation = {
  gapId: 'gap_0',
  recommendation: '',
  exampleLine: '',
  type: 'add-joke',
} as const satisfies GapRecommendation;

export const DEFAULT_GAP_ANALYSIS: GapAnalysis = {
  gaps: [],
  retentionCliff: null,
  averageGapDuration: 0,
  longestGap: 0,
  gapScore: 0,
  recommendations: [],
} as const satisfies GapAnalysis;

export const DEFAULT_PUNCH_UP_ALTERNATIVE: PunchUpAlternative = {
  text: '',
  style: 'sharper',
  whyItWorks: '',
} as const satisfies PunchUpAlternative;

export const DEFAULT_PUNCH_UP: PunchUp = {
  id: 'punchup_0',
  originalLine: '',
  lineNumber: 0,
  character: '',
  issue: '',
  alternatives: [],
  explanation: '',
  priority: 'medium',
} as const satisfies PunchUp;

export const DEFAULT_PUNCH_UP_SECTION: PunchUpSection = {
  punchUps: [],
  overallTone: '',
  styleNotes: [],
} as const satisfies PunchUpSection;

export const DEFAULT_CHARACTER_PROFILE: CharacterProfile = {
  name: 'Unknown',
  jokeCount: 0,
  jokePercentage: 0,
  primaryStyle: '',
  strongestMoment: '',
  voiceConsistency: 0,
  screenTimeEstimate: 0,
} as const satisfies CharacterProfile;

export const DEFAULT_CHARACTER_BALANCE: CharacterBalance = {
  score: 0,
  status: 'balanced',
  dominantCharacter: null,
  underutilized: [],
} as const satisfies CharacterBalance;

export const DEFAULT_CHARACTER_ANALYSIS: CharacterAnalysis = {
  characters: [],
  balance: DEFAULT_CHARACTER_BALANCE,
  interactions: [],
  recommendations: [],
} as const satisfies CharacterAnalysis;

export const DEFAULT_CALLBACK: Callback = {
  setupLine: 0,
  setupQuote: '',
  payoffLine: 0,
  payoffQuote: '',
  effectiveness: 'medium',
} as const satisfies Callback;

export const DEFAULT_CALLBACK_OPPORTUNITY: CallbackOpportunity = {
  setupLine: 0,
  setupQuote: '',
  suggestedPayoffLocation: '',
  suggestedPayoff: '',
  potentialImpact: 'medium',
} as const satisfies CallbackOpportunity;

export const DEFAULT_CALLBACK_ANALYSIS: CallbackAnalysis = {
  existingCallbacks: [],
  missedOpportunities: [],
  callbackScore: 0,
  recommendations: [],
} as const satisfies CallbackAnalysis;

export const DEFAULT_ANALYSIS: AnalysisShape = {
  scriptStats: DEFAULT_SCRIPT_STATS,
  metrics: DEFAULT_METRICS,
  timeline: DEFAULT_TIMELINE,
  feedback: DEFAULT_FEEDBACK,
  gaps: DEFAULT_GAP_ANALYSIS,
  punchUps: DEFAULT_PUNCH_UP_SECTION,
  characters: DEFAULT_CHARACTER_ANALYSIS,
  callbacks: DEFAULT_CALLBACK_ANALYSIS,
  summary: '',
  coachNote: '',
} as const satisfies AnalysisShape;
