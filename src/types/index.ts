// ===========================================
// LAUGH LAB PRO - TYPE DEFINITIONS
// ===========================================

// User tiers
export type UserTier = 'free' | 'starter' | 'professional' | 'enterprise';

// Script formats
export type ScriptFormat = 'sitcom' | 'feature' | 'sketch' | 'standup' | 'auto';

// Joke complexity levels
export type JokeComplexity = 'basic' | 'standard' | 'intermediate' | 'advanced' | 'high';

// ===========================================
// ANALYSIS REQUEST/RESPONSE
// ===========================================

export interface AnalysisRequest {
  script: string;
  format?: ScriptFormat;
  title?: string;
}

export interface AnalyzeResponse {
  success: boolean;
  data?: FullAnalysis;
  error?: string;
}

// ===========================================
// FULL ANALYSIS RESULT
// ===========================================

export interface FullAnalysis {
  // Metadata
  id: string;
  timestamp: string;
  title: string;
  format: ScriptFormat;
  
  // Script stats
  scriptStats: ScriptStats;
  
  // Core metrics (Page 1: Dashboard)
  metrics: CoreMetrics;
  
  // Laugh timeline data (Page 2: Timeline)
  timeline: TimelineData;
  
  // Feedback (Page 3: Strengths & Opportunities)
  feedback: FeedbackSection;
  
  // Gap analysis (Page 4: Gap Analysis)
  gaps: GapAnalysis;
  
  // Punch-ups (Page 5: Punch-Up Workshop)
  punchUps: PunchUpSection;
  
  // Character analysis (Page 6: Characters - Pro tier)
  characters: CharacterAnalysis;
  
  // Callback analysis (Pro tier)
  callbacks: CallbackAnalysis;
  
  // Overall summary
  summary: string;
  coachNote: string;
}

// ===========================================
// SCRIPT STATISTICS
// ===========================================

export interface ScriptStats {
  totalLines: number;
  dialogueLines: number;
  estimatedRuntime: number; // in minutes
  wordCount: number;
  sceneCount: number;
  characterCount: number;
}

// ===========================================
// CORE METRICS (Page 1)
// ===========================================

export interface CoreMetrics {
  overallScore: number; // 0-100
  laughsPerMinute: number;
  linesPerJoke: number;
  totalJokes: number;
  peakLaughMoments: number;
  sustainedLaughSequences: number;
  callbackFrequency: number; // percentage
  jokeDistribution: JokeDistribution;
  formatComparison: FormatComparison;
}

export interface JokeDistribution {
  basic: number;
  standard: number;
  intermediate: number;
  advanced: number;
  high: number;
}

export interface FormatComparison {
  targetLPM: number;
  targetLPJ: number;
  lpmStatus: 'above' | 'on-target' | 'below';
  lpjStatus: 'above' | 'on-target' | 'below';
  industryPercentile: number;
}

// ===========================================
// TIMELINE DATA (Page 2)
// ===========================================

export interface TimelineData {
  // Data points for the laugh density chart
  segments: TimelineSegment[];
  
  // Highlighted sections
  hotSpots: HotSpot[]; // High laugh density areas
  coldSpots: ColdSpot[]; // Gaps / low density areas
  
  // Key moments
  biggestLaugh: TimelineMoment;
  longestDrySpell: TimelineMoment;
}

export interface TimelineSegment {
  segmentNumber: number;
  startLine: number;
  endLine: number;
  startMinute: number;
  endMinute: number;
  jokeCount: number;
  laughScore: number; // 0-10 intensity
  dominantType: JokeComplexity;
}

export interface HotSpot {
  startMinute: number;
  endMinute: number;
  description: string;
  jokeCount: number;
}

export interface ColdSpot {
  startMinute: number;
  endMinute: number;
  durationMinutes: number;
  severity: 'minor' | 'moderate' | 'critical';
  suggestion: string;
}

export interface TimelineMoment {
  minute: number;
  line: number;
  description: string;
  quote?: string;
}

// ===========================================
// FEEDBACK SECTION (Page 3)
// ===========================================

export interface FeedbackSection {
  strengths: FeedbackItem[];
  opportunities: FeedbackItem[];
  quickWins: QuickWin[];
}

export interface FeedbackItem {
  title: string;
  description: string;
  lineReference?: string;
  quote?: string;
  impact: 'high' | 'medium' | 'low';
}

export interface QuickWin {
  action: string;
  expectedImpact: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

// ===========================================
// GAP ANALYSIS (Page 4)
// ===========================================

export interface GapAnalysis {
  gaps: Gap[];
  retentionCliff: Gap | null;
  averageGapDuration: number;
  longestGap: number;
  gapScore: number; // 0-100, higher is better (fewer gaps)
  recommendations: GapRecommendation[];
}

export interface Gap {
  id: string;
  startLine: number;
  endLine: number;
  startMinute: number;
  endMinute: number;
  durationMinutes: number;
  durationLines: number;
  severity: 'minor' | 'moderate' | 'critical';
  isRetentionCliff: boolean;
  context: string; // What's happening in this section
  suggestion: string;
  priority: number; // 1 = fix first
}

export interface GapRecommendation {
  gapId: string;
  recommendation: string;
  exampleLine?: string;
  type: 'add-joke' | 'add-callback' | 'add-character-moment' | 'restructure';
}

// ===========================================
// PUNCH-UP SECTION (Page 5)
// ===========================================

export interface PunchUpSection {
  punchUps: PunchUp[];
  overallTone: string;
  styleNotes: string[];
}

export interface PunchUp {
  id: string;
  originalLine: string;
  lineNumber: number;
  character?: string;
  issue: string; // Why this line needs work
  alternatives: PunchUpAlternative[];
  explanation: string;
  priority: 'high' | 'medium' | 'low';
}

export interface PunchUpAlternative {
  text: string;
  style: 'sharper' | 'broader' | 'subtler' | 'callback' | 'tag';
  whyItWorks: string;
}

// ===========================================
// CHARACTER ANALYSIS (Page 6 - Pro)
// ===========================================

export interface CharacterAnalysis {
  characters: CharacterProfile[];
  balance: CharacterBalance;
  interactions: CharacterInteraction[];
  recommendations: string[];
}

export interface CharacterProfile {
  name: string;
  jokeCount: number;
  jokePercentage: number;
  primaryStyle: string; // e.g., "deadpan", "physical", "observational"
  strongestMoment: string;
  voiceConsistency: number; // 0-100
  screenTimeEstimate: number; // percentage
}

export interface CharacterBalance {
  score: number; // 0-100
  status: 'balanced' | 'slightly-unbalanced' | 'unbalanced';
  dominantCharacter: string | null;
  underutilized: string[];
}

export interface CharacterInteraction {
  character1: string;
  character2: string;
  jokeCount: number;
  chemistry: number; // 0-100
  bestMoment?: string;
}

// ===========================================
// CALLBACK ANALYSIS (Pro)
// ===========================================

export interface CallbackAnalysis {
  existingCallbacks: Callback[];
  missedOpportunities: CallbackOpportunity[];
  callbackScore: number; // 0-100
  recommendations: string[];
}

export interface Callback {
  setupLine: number;
  setupQuote: string;
  payoffLine: number;
  payoffQuote: string;
  effectiveness: 'strong' | 'medium' | 'weak';
}

export interface CallbackOpportunity {
  setupLine: number;
  setupQuote: string;
  suggestedPayoffLocation: string;
  suggestedPayoff: string;
  potentialImpact: 'high' | 'medium';
}

// ===========================================
// FORMAT TARGETS
// ===========================================

export const FORMAT_TARGETS: Record<ScriptFormat, {
  label: string;
  lpm: number;
  lpj: number;
  description: string;
}> = {
  sitcom: {
    label: 'Sitcom',
    lpm: 2.0,
    lpj: 5.5,
    description: 'Half-hour comedy (22 min)',
  },
  feature: {
    label: 'Feature Film',
    lpm: 1.0,
    lpj: 12.0,
    description: 'Comedy feature (90-120 min)',
  },
  sketch: {
    label: 'Sketch',
    lpm: 2.5,
    lpj: 4.0,
    description: 'Short-form comedy (3-10 min)',
  },
  standup: {
    label: 'Stand-Up',
    lpm: 3.5,
    lpj: 3.0,
    description: 'Stand-up routine',
  },
  auto: {
    label: 'Auto-Detect',
    lpm: 2.0,
    lpj: 6.0,
    description: 'We\'ll figure it out',
  },
};

// ===========================================
// TIER FEATURES
// ===========================================

export const TIER_FEATURES: Record<UserTier, {
  label: string;
  price: number | null;
  analysesPerMonth: number | 'unlimited';
  features: string[];
  reportPages: number[];
}> = {
  free: {
    label: 'Free',
    price: 0,
    analysesPerMonth: 2,
    features: [
      'Core metrics dashboard',
      'Laugh timeline graph',
      'Top 3 strengths & opportunities',
    ],
    reportPages: [1, 2, 3], // Dashboard, Timeline, Feedback (limited)
  },
  starter: {
    label: 'Starter',
    price: 29,
    analysesPerMonth: 'unlimited',
    features: [
      'Everything in Free',
      'Full feedback breakdown',
      'Gap analysis with recommendations',
      'Punch-up suggestions',
      'Analysis history',
    ],
    reportPages: [1, 2, 3, 4, 5], // All except character/callback
  },
  professional: {
    label: 'Professional',
    price: 79,
    analysesPerMonth: 'unlimited',
    features: [
      'Everything in Starter',
      'Character comedy analysis',
      'Callback mapping & opportunities',
      'Export PDF reports',
      'Priority support',
    ],
    reportPages: [1, 2, 3, 4, 5, 6], // All pages
  },
  enterprise: {
    label: 'Enterprise',
    price: null, // Custom
    analysesPerMonth: 'unlimited',
    features: [
      'Everything in Professional',
      'API access',
      'Team seats',
      'White-label reports',
      'Custom integrations',
      'Dedicated support',
    ],
    reportPages: [1, 2, 3, 4, 5, 6],
  },
};

// ===========================================
// STORE STATE
// ===========================================

export interface AnalysisState {
  // Current analysis
  currentAnalysis: FullAnalysis | null;
  hasHydrated: boolean;
  
  // UI state
  isAnalyzing: boolean;
  error: string | null;
  currentPage: number;
  
  // User state (simplified - will expand with Supabase)
  userTier: UserTier;
  analysesThisMonth: number;
  usageMonthKey: string; // "2025-01" format for calendar month reset
  
  // History
  history: AnalysisHistoryItem[];
  
  // Actions
  setAnalysis: (analysis: FullAnalysis) => void;
  setAnalyzing: (isAnalyzing: boolean) => void;
  setError: (error: string | null) => void;
  setCurrentPage: (page: number) => void;
  clearAnalysis: () => void;
  markHydrated: () => void;
  canAccessPage: (pageNumber: number) => boolean;
  getRemainingAnalyses: () => number;
}

export interface AnalysisHistoryItem {
  id: string;
  title: string;
  timestamp: string;
  overallScore: number;
  format: ScriptFormat;
}
