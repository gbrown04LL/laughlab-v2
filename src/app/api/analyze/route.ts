import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { SYSTEM_PROMPT, ANALYSIS_PROMPT, detectFormat } from '@/lib/prompts';
import { generateId, parseClaudeResponse, clamp } from '@/lib/utils';
import type { FullAnalysis, ScriptFormat, AnalyzeResponse } from '@/types';

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Parse request
    const body = await request.json();
    const { script, format = 'auto', title = 'Untitled Script' } = body as {
      script: string;
      format?: ScriptFormat;
      title?: string;
    };

    // Validate input
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

    // Check API key
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json<AnalyzeResponse>(
        { success: false, error: 'API key not configured. Please add ANTHROPIC_API_KEY to your environment.' },
        { status: 500 }
      );
    }

    // Detect format if auto
    const detectedFormat = format === 'auto' ? detectFormat(script) : format;

    console.log(`[Analysis] Starting analysis for "${title}" (${detectedFormat}), ${script.length} chars`);

    // Call Claude API
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8192,
      messages: [
        {
          role: 'user',
          content: ANALYSIS_PROMPT(script, detectedFormat, title),
        },
      ],
      system: SYSTEM_PROMPT,
    });

    // Extract text content
    const textContent = message.content.find((block) => block.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from Claude');
    }

    // Parse JSON response
    let analysisData: any;
    try {
      analysisData = parseClaudeResponse(textContent.text);
    } catch (parseError) {
      console.error('[Analysis] Failed to parse Claude response:', textContent.text.slice(0, 500));
      throw new Error('Failed to parse analysis results. Please try again.');
    }

    // Build full analysis result
    const analysis: FullAnalysis = {
      id: generateId('analysis'),
      timestamp: new Date().toISOString(),
      title,
      format: detectedFormat as ScriptFormat,
      
      scriptStats: analysisData.scriptStats || {
        totalLines: 0,
        dialogueLines: 0,
        estimatedRuntime: 0,
        wordCount: 0,
        sceneCount: 0,
        characterCount: 0,
      },
      
      metrics: {
        overallScore: clamp(analysisData.metrics?.overallScore || 65, 0, 100),
        laughsPerMinute: analysisData.metrics?.laughsPerMinute || 1.5,
        linesPerJoke: analysisData.metrics?.linesPerJoke || 6,
        totalJokes: analysisData.metrics?.totalJokes || 0,
        peakLaughMoments: analysisData.metrics?.peakLaughMoments || 0,
        sustainedLaughSequences: analysisData.metrics?.sustainedLaughSequences || 0,
        callbackFrequency: analysisData.metrics?.callbackFrequency || 0,
        jokeDistribution: analysisData.metrics?.jokeDistribution || {
          basic: 0,
          standard: 0,
          intermediate: 0,
          advanced: 0,
          high: 0,
        },
        formatComparison: analysisData.metrics?.formatComparison || {
          targetLPM: 2.0,
          targetLPJ: 5.5,
          lpmStatus: 'on-target',
          lpjStatus: 'on-target',
          industryPercentile: 50,
        },
      },
      
      timeline: analysisData.timeline || {
        segments: [],
        hotSpots: [],
        coldSpots: [],
        biggestLaugh: { minute: 0, line: 0, description: 'N/A' },
        longestDrySpell: { minute: 0, line: 0, description: 'N/A' },
      },
      
      feedback: analysisData.feedback || {
        strengths: [],
        opportunities: [],
        quickWins: [],
      },
      
      gaps: analysisData.gaps || {
        gaps: [],
        retentionCliff: null,
        averageGapDuration: 0,
        longestGap: 0,
        gapScore: 100,
        recommendations: [],
      },
      
      punchUps: analysisData.punchUps || {
        punchUps: [],
        overallTone: '',
        styleNotes: [],
      },
      
      characters: analysisData.characters || {
        characters: [],
        balance: { score: 100, status: 'balanced', dominantCharacter: null, underutilized: [] },
        interactions: [],
        recommendations: [],
      },
      
      callbacks: analysisData.callbacks || {
        existingCallbacks: [],
        missedOpportunities: [],
        callbackScore: 0,
        recommendations: [],
      },
      
      summary: analysisData.summary || 'Analysis complete.',
      coachNote: analysisData.coachNote || 'Keep writing!',
    };

    const duration = Date.now() - startTime;
    console.log(`[Analysis] Completed in ${duration}ms, score: ${analysis.metrics.overallScore}`);

    return NextResponse.json<AnalyzeResponse>({ success: true, data: analysis });

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
