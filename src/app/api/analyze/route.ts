import { NextRequest, NextResponse } from 'next/server';
import { detectFormat } from '@/lib/prompts';
import { generateId } from '@/lib/utils';
import { runPromptA } from '@/lib/llm/runPromptA';
import { generateCoachNote } from '@/lib/llm/generateCoachNote';
import { UpstreamError } from '@/lib/llm/chatgptRequest';
import { 
  checkRateLimit, 
  checkUsageLimit, 
  incrementUsage, 
  getClientIP, 
  generateFingerprint,
  cleanupRateLimitStore 
} from '@/lib/ratelimit';
import type { FullAnalysis, ScriptFormat, AnalyzeResponse, UserTier } from '@/types';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = generateId('req');
  
  // Cleanup old rate limit entries
  cleanupRateLimitStore();
  
  try {
    // ===========================================
    // 1. RATE LIMITING (IP-based)
    // ===========================================
    const clientIP = getClientIP(request);
    const fingerprint = generateFingerprint(request);
    const rateLimitKey = fingerprint || clientIP;
    const rateLimitResult = await checkRateLimit(rateLimitKey);
    
    if (!rateLimitResult.allowed) {
      console.log(`[Analysis][${requestId}] Rate limited identifier: ${rateLimitKey}`);
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
    const usageResult = await checkUsageLimit(rateLimitKey, safeTier);
    
    if (!usageResult.allowed) {
      console.log(`[Analysis][${requestId}] Usage limit reached for: ${rateLimitKey}`);
      return NextResponse.json<AnalyzeResponse>(
        { 
          success: false, 
          error: usageResult.reason || 'Monthly analysis limit reached',
        },
        { status: 403 }
      );
    }

    // ===========================================
    // 4. DETECT FORMAT & RUN PROMPTS
    // ===========================================
    // Note: API key and model are validated at startup by src/lib/env.ts
    const detectedFormat = safeFormat === 'auto' ? detectFormat(script) : safeFormat;

    console.log(
      `[Analysis][${requestId}] Starting for "${safeTitle}" (${detectedFormat}), ${script.length} chars, key: ${rateLimitKey.slice(0, 12)}...`
    );

    let validatedData;
    try {
      validatedData = await runPromptA({
        script,
        format: detectedFormat as ScriptFormat,
        title: safeTitle,
        requestId,
      });
    } catch (error) {
      console.error(`[PromptA][${requestId}] Failed`, error);
      throw error;
    }

    // Generate Coach Note (Required)
    let coachFeedback = validatedData.coachNote;
    
    // If Prompt A didn't provide it (or we want to override with the refined prompt), generate it now
    try {
      coachFeedback = await generateCoachNote({
        analysisJson: validatedData,
        scriptMeta: { title: safeTitle, format: detectedFormat, tier: safeTier },
        requestId,
      });
    } catch (error) {
      console.error(`[CoachNote][${requestId}] Failed to generate, using fallback`, error);
      coachFeedback = "Your script shows promise! Focus on tightening the setups in the second act to improve pacing. Ready to analyze some punchline gaps?";
    }

    // ===========================================
    // 5. BUILD FULL ANALYSIS RESULT
    // ===========================================
    const analysis: FullAnalysis = {
      id: generateId('analysis'),
      timestamp: new Date().toISOString(),
      title: safeTitle,
      format: detectedFormat as ScriptFormat,
      
      scriptStats: validatedData.scriptStats,
      metrics: validatedData.metrics,
      timeline: validatedData.timeline,
      feedback: validatedData.feedback,
      gaps: validatedData.gaps,
      punchUps: validatedData.punchUps,
      characters: validatedData.characters,
      callbacks: validatedData.callbacks,
      
      summary: validatedData.summary,
      coachNote: coachFeedback,
    };

    // ===========================================
    // 6. INCREMENT USAGE (only on success)
    // ===========================================
    await incrementUsage(rateLimitKey);

    const duration = Date.now() - startTime;
    console.log(`[Analysis][${requestId}] Completed in ${duration}ms, score: ${analysis.metrics.overallScore}, remaining: ${usageResult.remaining - 1}`);

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
    console.error(`[Analysis][${requestId}] Error:`, error);

    if (error instanceof UpstreamError) {
      const status = error.statusCode || 502;
      return NextResponse.json<AnalyzeResponse>(
        { success: false, error: `Analysis request failed (${error.promptLabel}). Please try again shortly.` },
        { status }
      );
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
