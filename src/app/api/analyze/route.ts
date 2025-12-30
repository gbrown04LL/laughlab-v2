import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { SYSTEM_PROMPT, ANALYSIS_PROMPT, detectFormat } from '@/lib/prompts';
import { generateId, parseClaudeResponse } from '@/lib/utils';
import { validateAndSanitizeAnalysis } from '@/lib/validation';
import { 
  checkRateLimit, 
  checkUsageLimit, 
  incrementUsage, 
  getClientIP, 
  generateFingerprint,
  cleanupRateLimitStore 
} from '@/lib/ratelimit';
import type { 
  FullAnalysis, 
  ScriptFormat, 
  AnalyzeResponse, 
  UserTier,
  TimelineData,
  TimelineSegment,
  HotSpot,
  ColdSpot,
  GapAnalysis,
  CoreMetrics,
  ScriptStats,
} from '@/types';

function clamp(num: number, min: number, max: number): number {
  return Math.min(Math.max(num, min), max);
}

function getRuntimeMinutes(stats: ScriptStats, metrics: CoreMetrics): number {
  const fromStats = stats?.estimatedRuntime ?? 0;
  if (fromStats > 0) return fromStats;
  const fromLines = stats?.totalLines ? stats.totalLines / 15 : 0; // ~15 lines/min
  const fromLpm = metrics?.totalJokes && metrics?.laughsPerMinute
    ? metrics.totalJokes / Math.max(metrics.laughsPerMinute, 0.1)
    : 0;
  const candidates = [fromStats, fromLines, fromLpm].filter(Boolean);
  return candidates.length ? clamp(Math.max(...candidates), 2, 300) : 10;
}

function deriveSegments(stats: ScriptStats, metrics: CoreMetrics, gaps: GapAnalysis): TimelineSegment[] {
  const totalLines = stats?.totalLines && stats.totalLines > 0 ? stats.totalLines : 120;
  const runtimeMin = getRuntimeMinutes(stats, metrics);
  const targetLpm = metrics?.formatComparison?.targetLPM ?? 6;
  const numSegments = clamp(Math.round(runtimeMin / 2), 6, 15); // ~2-minute segments
  const linesPerSegment = Math.max(1, Math.ceil(totalLines / numSegments));
  const minutesPerSegment = runtimeMin / numSegments;

  const totalGapLines = gaps.gaps.reduce((sum, gap) => {
    const gapLines = clamp(gap.durationLines, 0, totalLines);
    return sum + gapLines;
  }, 0);
  const activeLines = Math.max(1, totalLines - totalGapLines);

  const complexityWeights: Record<string, number> = {
    basic: 1,
    standard: 2,
    intermediate: 3,
    advanced: 4,
    high: 5,
  };
  const jokeDist = metrics?.jokeDistribution ?? {};
  const totalDistJokes = Object.values(jokeDist).reduce((sum, val) => sum + (val ?? 0), 0);
  const avgComplexityWeight = totalDistJokes
    ? Object.entries(jokeDist).reduce((sum, [level, count]) => {
        const weight = complexityWeights[level] ?? 2;
        return sum + weight * (count ?? 0);
      }, 0) / totalDistJokes
    : 2;
  const complexityBonus = clamp((avgComplexityWeight - 2) * 0.4, 0, 2); // up to +2

  const segments: TimelineSegment[] = [];

  for (let i = 0; i < numSegments; i++) {
    const startLine = i * linesPerSegment + 1;
    const endLine = Math.min((i + 1) * linesPerSegment, totalLines);
    const startMinute = i * minutesPerSegment;
    const endMinute = (i + 1) * minutesPerSegment;

    const segmentGapLines = gaps.gaps.reduce((sum, gap) => {
      const overlapStart = Math.max(startLine, gap.startLine);
      const overlapEnd = Math.min(endLine, gap.endLine);
      if (overlapEnd < overlapStart) return sum;
      return sum + (overlapEnd - overlapStart + 1);
    }, 0);

    const availableLines = Math.max(0, endLine - startLine + 1 - segmentGapLines);
    const segmentJokes = metrics.totalJokes > 0
      ? Math.max(0, (metrics.totalJokes * availableLines) / activeLines)
      : 0;

    const lpmSegment = minutesPerSegment > 0 ? segmentJokes / minutesPerSegment : 0;
    const laughScore = clamp((targetLpm ? (lpmSegment / targetLpm) * 8 : 0) + complexityBonus, 0, 10);

    const dominantType = (Object.entries(jokeDist).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))[0]?.[0] as TimelineSegment['dominantType']) || 'standard';

    segments.push({
      segmentNumber: i + 1,
      startLine,
      endLine,
      startMinute,
      endMinute,
      jokeCount: Math.round(segmentJokes),
      laughScore,
      dominantType,
    });
  }

  return segments;
}

function buildColdSpots(gaps: GapAnalysis): ColdSpot[] {
  return gaps.gaps.map((gap) => ({
    startMinute: gap.startMinute,
    endMinute: gap.endMinute,
    durationMinutes: gap.durationMinutes,
    severity: gap.isRetentionCliff ? 'critical' : gap.severity,
    suggestion: gap.isRetentionCliff
      ? 'Retention cliff: add a strong laugh to re-engage before the drop.'
      : gap.suggestion || `Fill the ${gap.durationLines}-line gap with a callback or character beat.`,
  }));
}

function pickLongestDrySpell(gaps: GapAnalysis, fallbackMinute: number): { minute: number; line: number; description: string } {
  const longestGap = gaps.gaps.reduce((longest, gap) => {
    return gap.durationMinutes > (longest?.durationMinutes ?? -1) ? gap : longest;
  }, gaps.retentionCliff);

  if (!longestGap) {
    return { minute: fallbackMinute, line: 0, description: 'No major dry spell detected.' };
  }

  return {
    minute: longestGap.startMinute,
    line: longestGap.startLine,
    description: longestGap.isRetentionCliff
      ? 'Retention cliff—audience may tune out here.'
      : 'Extended gap—add a laugh or a callback.',
  };
}

function buildHotSpots(segments: TimelineSegment[]): HotSpot[] {
  return segments
    .filter((seg) => seg.laughScore >= 7 && seg.jokeCount >= 2)
    .map((seg) => ({
      startMinute: seg.startMinute,
      endMinute: seg.endMinute,
      description: `Strong laugh run around minute ${Math.round(seg.startMinute)}-${Math.round(seg.endMinute)}.`,
      jokeCount: seg.jokeCount,
    }));
}

function generateTimeline(validatedData: FullAnalysis): TimelineData {
  const stats = validatedData.scriptStats;
  const metrics = validatedData.metrics;
  const gaps = validatedData.gaps;

  const derivedSegments = deriveSegments(stats, metrics, gaps);
  const coldSpots = buildColdSpots(gaps);
  const hotSpots = buildHotSpots(derivedSegments);

  const hottestSegment = derivedSegments.reduce((best, seg) => {
    if (!best || seg.laughScore > best.laughScore) return seg;
    return best;
  }, null as TimelineSegment | null);

  const biggestLaugh = hottestSegment
    ? {
        minute: hottestSegment.startMinute,
        line: Math.round((hottestSegment.startLine + hottestSegment.endLine) / 2),
        description: 'Peak laugh density in this section.',
        quote: '',
      }
    : { minute: 0, line: 0, description: 'N/A', quote: '' };

  const longestDrySpell = pickLongestDrySpell(gaps, derivedSegments[0]?.startMinute ?? 0);

  return {
    segments: derivedSegments,
    hotSpots,
    coldSpots,
    biggestLaugh,
    longestDrySpell,
  };
}

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

// Vercel serverless function timeout is 60s on Hobby, 300s on Pro
// We'll set our timeout slightly below to handle gracefully
const API_TIMEOUT_MS = 55000; // 55 seconds

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  // Cleanup old rate limit entries
  cleanupRateLimitStore();
  
  try {
    // ===========================================
    // 1. RATE LIMITING (IP-based)
    // ===========================================
    const clientIP = getClientIP(request);
    const rateLimitResult = checkRateLimit(clientIP);
    
    if (!rateLimitResult.allowed) {
      console.log(`[Analysis] Rate limited IP: ${clientIP}`);
      return NextResponse.json<AnalyzeResponse>(
        { success: false, error: rateLimitResult.reason || 'Too many requests' },
        { 
          status: 429,
          headers: rateLimitResult.retryAfter 
            ? { 'Retry-After': String(rateLimitResult.retryAfter) }
            : undefined
        }
      );
    }
    
    // ===========================================
    // 2. PARSE AND VALIDATE REQUEST
    // ===========================================
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json<AnalyzeResponse>(
        { success: false, error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }
    
    // Type guard and extract fields
    if (!body || typeof body !== 'object') {
      return NextResponse.json<AnalyzeResponse>(
        { success: false, error: 'Request body must be an object' },
        { status: 400 }
      );
    }
    
    const { script, format = 'auto', title = 'Untitled Script', tier = 'free' } = body as {
      script?: unknown;
      format?: unknown;
      title?: unknown;
      tier?: unknown;
    };

    // Validate script
    if (!script || typeof script !== 'string') {
      return NextResponse.json<AnalyzeResponse>(
        { success: false, error: 'Script text is required' },
        { status: 400 }
      );
    }

    if (script.length < 100) {
      return NextResponse.json<AnalyzeResponse>(
        { success: false, error: 'Script is too short. Please provide at least a few scenes of dialogue.' },
        { status: 400 }
      );
    }

    if (script.length > 150000) {
      return NextResponse.json<AnalyzeResponse>(
        { success: false, error: 'Script is too long. Please limit to about 120 pages.' },
        { status: 400 }
      );
    }
    
    // Validate format
    const validFormats = ['sitcom', 'feature', 'sketch', 'standup', 'auto'];
    const safeFormat = (typeof format === 'string' && validFormats.includes(format)) 
      ? format as ScriptFormat 
      : 'auto';
    
    // Validate title
    const safeTitle = typeof title === 'string' 
      ? title.slice(0, 200) 
      : 'Untitled Script';
    
    // Validate tier (server-side validation - don't trust client)
    const validTiers = ['free', 'starter', 'professional', 'enterprise'];
    const safeTier: UserTier = (typeof tier === 'string' && validTiers.includes(tier))
      ? tier as UserTier
      : 'free';

    // ===========================================
    // 3. USAGE LIMIT CHECK (with calendar month reset)
    // ===========================================
    const fingerprint = generateFingerprint(request);
    const usageResult = checkUsageLimit(fingerprint, safeTier);
    
    if (!usageResult.allowed) {
      console.log(`[Analysis] Usage limit reached for: ${fingerprint}`);
      return NextResponse.json<AnalyzeResponse>(
        { 
          success: false, 
          error: usageResult.reason || 'Monthly analysis limit reached',
        },
        { status: 403 }
      );
    }

    // ===========================================
    // 4. CHECK API KEY
    // ===========================================
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json<AnalyzeResponse>(
        { success: false, error: 'API key not configured. Please add ANTHROPIC_API_KEY to your environment.' },
        { status: 500 }
      );
    }

    // ===========================================
    // 5. DETECT FORMAT & CALL CLAUDE API
    // ===========================================
    const detectedFormat = safeFormat === 'auto' ? detectFormat(script) : safeFormat;

    console.log(`[Analysis] Starting for "${safeTitle}" (${detectedFormat}), ${script.length} chars, IP: ${clientIP.slice(0, 10)}...`);

    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

    let message: Anthropic.Message;
    try {
      message = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 8192,
        messages: [
          {
            role: 'user',
            content: ANALYSIS_PROMPT(script, detectedFormat, safeTitle),
          },
        ],
        system: SYSTEM_PROMPT,
      });
    } catch (apiError) {
      clearTimeout(timeoutId);
      
      if (apiError instanceof Error && apiError.name === 'AbortError') {
        console.error('[Analysis] Request timed out after', API_TIMEOUT_MS, 'ms');
        return NextResponse.json<AnalyzeResponse>(
          { success: false, error: 'Analysis timed out. Please try with a shorter script.' },
          { status: 504 }
        );
      }
      
      throw apiError;
    }
    
    clearTimeout(timeoutId);

    // ===========================================
    // 6. EXTRACT AND PARSE RESPONSE
    // ===========================================
    const textContent = message.content.find((block) => block.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from Claude');
    }

    let rawAnalysisData: unknown;
    try {
      rawAnalysisData = parseClaudeResponse(textContent.text);
    } catch (parseError) {
      console.error('[Analysis] Failed to parse Claude response:', textContent.text.slice(0, 500));
      throw new Error('Failed to parse analysis results. Please try again.');
    }

    // ===========================================
    // 7. VALIDATE AND SANITIZE LLM OUTPUT
    // ===========================================
    const validatedData = validateAndSanitizeAnalysis(rawAnalysisData);

    // ===========================================
    // 8. BUILD FULL ANALYSIS RESULT
    // ===========================================
    const timeline = generateTimeline({
      ...validatedData,
      timeline: validatedData.timeline ?? { segments: [], hotSpots: [], coldSpots: [], biggestLaugh: { minute: 0, line: 0, description: 'N/A', quote: '' }, longestDrySpell: { minute: 0, line: 0, description: 'N/A', quote: '' } },
    } as FullAnalysis);

    const analysis: FullAnalysis = {
      id: generateId('analysis'),
      timestamp: new Date().toISOString(),
      title: safeTitle,
      format: detectedFormat as ScriptFormat,
      
      scriptStats: validatedData.scriptStats,
      metrics: validatedData.metrics,
      timeline,
      feedback: validatedData.feedback,
      gaps: validatedData.gaps,
      punchUps: validatedData.punchUps,
      characters: validatedData.characters,
      callbacks: validatedData.callbacks,
      
      summary: validatedData.summary,
      coachNote: validatedData.coachNote,
    };

    // ===========================================
    // 9. INCREMENT USAGE (only on success)
    // ===========================================
    incrementUsage(fingerprint);

    const duration = Date.now() - startTime;
    console.log(`[Analysis] Completed in ${duration}ms, score: ${analysis.metrics.overallScore}, remaining: ${usageResult.remaining - 1}`);

    // Return with usage info in headers
    return NextResponse.json<AnalyzeResponse>(
      { success: true, data: analysis },
      {
        headers: {
          'X-Usage-Remaining': String(Math.max(0, usageResult.remaining - 1)),
          'X-Usage-Limit': String(usageResult.limit),
        },
      }
    );

  } catch (error) {
    console.error('[Analysis] Error:', error);

    // Handle specific error types
    if (error instanceof Anthropic.APIError) {
      if (error.status === 401) {
        return NextResponse.json<AnalyzeResponse>(
          { success: false, error: 'Invalid API key. Please check your ANTHROPIC_API_KEY.' },
          { status: 401 }
        );
      }
      if (error.status === 429) {
        return NextResponse.json<AnalyzeResponse>(
          { success: false, error: 'Rate limit exceeded. Please try again in a moment.' },
          { status: 429 }
        );
      }
      if (error.status === 529) {
        return NextResponse.json<AnalyzeResponse>(
          { success: false, error: 'Claude is currently overloaded. Please try again in a few minutes.' },
          { status: 529 }
        );
      }
    }

    return NextResponse.json<AnalyzeResponse>(
      { success: false, error: error instanceof Error ? error.message : 'Analysis failed. Please try again.' },
      { status: 500 }
    );
  }
}

// ===========================================
// HEALTH CHECK / GET
// ===========================================
export async function GET() {
  return NextResponse.json({ 
    status: 'ok', 
    service: 'laugh-lab-analyze',
    timestamp: new Date().toISOString(),
  });
}
