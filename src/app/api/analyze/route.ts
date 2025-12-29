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
import type { FullAnalysis, ScriptFormat, AnalyzeResponse, UserTier } from '@/types';

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
