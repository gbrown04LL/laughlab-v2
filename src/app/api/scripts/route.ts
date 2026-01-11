/**
 * POST /api/scripts - Create a new script submission
 *
 * Persists script fingerprint data per Truth Contract schema_version 1.0.0.
 *
 * IMPORTANT: Raw script text is NOT stored or logged.
 * Only fingerprint metadata (hash, word_count, pages, format) is persisted.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { computeScriptFingerprint, getSafeLogMetadata } from '@/lib/fingerprint';
import { generateId } from '@/lib/utils';
import { createErrorObject, type ErrorObject } from '@/lib/validators';

interface ScriptSubmissionRequest {
  script: string;
  title?: string;
  user_id?: string;
  tier_compatibility?: string;
}

interface ScriptSubmissionResponse {
  success: boolean;
  data?: {
    id: string;
    input_hash: string;
    word_count: number;
    estimated_pages: number;
    inferred_format: string;
    title: string;
    created_at: string;
  };
  errors?: ErrorObject[];
}

export async function POST(request: NextRequest): Promise<NextResponse<ScriptSubmissionResponse>> {
  const requestId = generateId('req');

  try {
    // Parse request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          errors: [
            createErrorObject(
              'INVALID_JSON',
              'Invalid JSON in request body',
              'input',
              { request_id: requestId }
            ),
          ],
        },
        { status: 400 }
      );
    }

    // Validate request
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        {
          success: false,
          errors: [
            createErrorObject(
              'INVALID_REQUEST',
              'Request body must be an object',
              'input',
              { request_id: requestId }
            ),
          ],
        },
        { status: 400 }
      );
    }

    const { script, title, user_id, tier_compatibility } = body as ScriptSubmissionRequest;

    // Validate script
    if (!script || typeof script !== 'string') {
      return NextResponse.json(
        {
          success: false,
          errors: [
            createErrorObject(
              'MISSING_SCRIPT',
              'Script text is required',
              'input',
              { request_id: requestId }
            ),
          ],
        },
        { status: 400 }
      );
    }

    if (script.length < 100) {
      return NextResponse.json(
        {
          success: false,
          errors: [
            createErrorObject(
              'SCRIPT_TOO_SHORT',
              'Script must be at least 100 characters',
              'input',
              { request_id: requestId, details: { min_length: 100 } }
            ),
          ],
        },
        { status: 400 }
      );
    }

    if (script.length > 150000) {
      return NextResponse.json(
        {
          success: false,
          errors: [
            createErrorObject(
              'SCRIPT_TOO_LONG',
              'Script exceeds maximum length of 150,000 characters',
              'input',
              { request_id: requestId, details: { max_length: 150000 } }
            ),
          ],
        },
        { status: 400 }
      );
    }

    // Compute fingerprint (deterministic)
    const fingerprint = computeScriptFingerprint(script);

    // Safe logging - NO raw script text
    console.log(
      `[Scripts][${requestId}] Submission received:`,
      getSafeLogMetadata(fingerprint)
    );

    // Validate title
    const safeTitle =
      typeof title === 'string' ? title.slice(0, 200) : 'Untitled Script';

    // Get Prisma client (lazy init)
    const prisma = getPrismaClient();

    // Create script submission record
    const submission = await prisma.scriptSubmission.create({
      data: {
        inputHash: fingerprint.inputHash,
        wordCount: fingerprint.wordCount,
        estimatedPages: fingerprint.estimatedPages,
        inferredFormat: fingerprint.inferredFormat,
        charCount: fingerprint.charCount,
        title: safeTitle,
        userId: user_id || null,
        tierCompatibility: tier_compatibility || null,
      },
    });

    console.log(
      `[Scripts][${requestId}] Created submission ${submission.id}, hash: ${fingerprint.inputHash.slice(0, 12)}...`
    );

    return NextResponse.json(
      {
        success: true,
        data: {
          id: submission.id,
          input_hash: submission.inputHash,
          word_count: submission.wordCount,
          estimated_pages: submission.estimatedPages,
          inferred_format: submission.inferredFormat,
          title: submission.title,
          created_at: submission.createdAt.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    // Log error without script content
    console.error(`[Scripts][${requestId}] Error:`, error instanceof Error ? error.message : 'Unknown error');

    return NextResponse.json(
      {
        success: false,
        errors: [
          createErrorObject(
            'INTERNAL_ERROR',
            'Failed to create script submission',
            'persistence',
            { request_id: requestId, retryable: true }
          ),
        ],
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/scripts - Health check
 */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    status: 'ok',
    service: 'laugh-lab-scripts',
    timestamp: new Date().toISOString(),
  });
}
