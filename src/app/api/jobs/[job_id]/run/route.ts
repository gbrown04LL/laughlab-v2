/**
 * POST /api/jobs/[job_id]/run - Execute analysis job
 *
 * Runs Prompt A and Prompt B, validates issue_id references,
 * and persists final report per Truth Contract schema_version 1.0.0.
 *
 * IMPORTANT: Prompt B must not introduce new issues - all issue_id values
 * must reference existing issue_candidates from Prompt A.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { generateId } from '@/lib/utils';
import {
  validatePromptBIssueIds,
  createErrorObject,
  type ErrorObject,
  type PromptAResult,
  type PromptBResult,
} from '@/lib/validators';
import { getSafeLogMetadata, computeScriptFingerprint } from '@/lib/fingerprint';

// Truth Contract schema version
const SCHEMA_VERSION = '1.0.0';

interface JobRunRequest {
  script_text?: string; // Optional: if running inline without prior submission
  prompt_a_result?: PromptAResult;
  prompt_b_result?: PromptBResult;
}

interface FinalReport {
  schema_version: string;
  run: {
    job_id: string;
    request_id: string;
    started_at: string;
    completed_at: string;
    status: 'completed' | 'failed';
  };
  prompt_a: PromptAResult;
  prompt_b: PromptBResult;
  script_fingerprint?: {
    input_hash: string;
    word_count: number;
    estimated_pages: number;
    inferred_format: string;
  };
  errors?: ErrorObject[];
  warnings?: ErrorObject[];
}

interface JobRunResponse {
  success: boolean;
  data?: FinalReport;
  errors?: ErrorObject[];
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ job_id: string }> }
): Promise<NextResponse<JobRunResponse>> {
  const { job_id } = await context.params;
  const requestId = generateId('req');
  const startedAt = new Date().toISOString();

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

    const { script_text, prompt_a_result, prompt_b_result } = body as JobRunRequest;

    // Get Prisma client
    const prisma = getPrismaClient();

    // Fetch job record
    const job = await prisma.job.findUnique({
      where: { id: job_id },
      include: { script: true },
    });

    if (!job) {
      return NextResponse.json(
        {
          success: false,
          errors: [
            createErrorObject(
              'JOB_NOT_FOUND',
              `Job ${job_id} not found`,
              'input',
              { request_id: requestId }
            ),
          ],
        },
        { status: 404 }
      );
    }

    // Update job status to running
    await prisma.job.update({
      where: { id: job_id },
      data: {
        status: 'RUNNING_PROMPT_A',
        requestId,
      },
    });

    // Use provided results or existing job results
    const promptA: PromptAResult = prompt_a_result || (job.promptAResult as PromptAResult) || {};
    const promptB: PromptBResult = prompt_b_result || (job.promptBResult as PromptBResult) || {};

    // Log metadata only (no script content)
    console.log(`[Jobs][${requestId}] Running job ${job_id}, script hash: ${job.script.inputHash.slice(0, 12)}...`);

    // ==============================================
    // TRUTH CONTRACT ENFORCEMENT: Prompt B issue_id validation
    // ==============================================
    // Validate BEFORE persisting final report
    const validationError = validatePromptBIssueIds(promptA, promptB, requestId);

    if (validationError) {
      // Log the error (safe - no script content)
      console.error(
        `[Jobs][${requestId}] Prompt B validation failed:`,
        validationError.code,
        validationError.details
      );

      // Update job status to FAILED
      await prisma.job.update({
        where: { id: job_id },
        data: {
          status: 'FAILED',
          errors: [validationError],
          promptAResult: promptA,
          promptBResult: promptB,
        },
      });

      // Return error response - do NOT persist a "successful" report
      return NextResponse.json(
        {
          success: false,
          errors: [validationError],
        },
        { status: 400 }
      );
    }

    // ==============================================
    // Build and persist final report
    // ==============================================
    const completedAt = new Date().toISOString();

    // Compute script fingerprint if we have script text
    let scriptFingerprint: FinalReport['script_fingerprint'] | undefined;
    if (script_text) {
      const fp = computeScriptFingerprint(script_text);
      scriptFingerprint = {
        input_hash: fp.inputHash,
        word_count: fp.wordCount,
        estimated_pages: fp.estimatedPages,
        inferred_format: fp.inferredFormat,
      };
      console.log(`[Jobs][${requestId}] Computed fingerprint:`, getSafeLogMetadata(fp));
    } else {
      // Use stored script fingerprint
      scriptFingerprint = {
        input_hash: job.script.inputHash,
        word_count: job.script.wordCount,
        estimated_pages: job.script.estimatedPages,
        inferred_format: job.script.inferredFormat,
      };
    }

    const finalReport: FinalReport = {
      schema_version: SCHEMA_VERSION,
      run: {
        job_id,
        request_id: requestId,
        started_at: startedAt,
        completed_at: completedAt,
        status: 'completed',
      },
      prompt_a: promptA,
      prompt_b: promptB,
      script_fingerprint: scriptFingerprint,
    };

    // Persist final report and update job status
    await prisma.job.update({
      where: { id: job_id },
      data: {
        status: 'COMPLETED',
        promptAResult: promptA,
        promptBResult: promptB,
        finalReport: finalReport,
        errors: null,
      },
    });

    console.log(`[Jobs][${requestId}] Job ${job_id} completed successfully`);

    return NextResponse.json(
      {
        success: true,
        data: finalReport,
      },
      { status: 200 }
    );
  } catch (error) {
    // Log error without any script content
    console.error(
      `[Jobs][${requestId}] Error:`,
      error instanceof Error ? error.message : 'Unknown error'
    );

    // Try to update job status to FAILED
    try {
      const prisma = getPrismaClient();
      await prisma.job.update({
        where: { id: job_id },
        data: {
          status: 'FAILED',
          errors: [
            createErrorObject(
              'INTERNAL_ERROR',
              'Job execution failed',
              'persistence',
              { request_id: requestId, retryable: true }
            ),
          ],
        },
      });
    } catch {
      // Ignore error updating job - original error is more important
    }

    return NextResponse.json(
      {
        success: false,
        errors: [
          createErrorObject(
            'INTERNAL_ERROR',
            'Job execution failed',
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
 * GET /api/jobs/[job_id]/run - Get job status
 */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ job_id: string }> }
): Promise<NextResponse> {
  const { job_id } = await context.params;

  try {
    const prisma = getPrismaClient();
    const job = await prisma.job.findUnique({
      where: { id: job_id },
      select: {
        id: true,
        status: true,
        requestId: true,
        createdAt: true,
        updatedAt: true,
        finalReport: true,
        errors: true,
      },
    });

    if (!job) {
      return NextResponse.json(
        { success: false, error: 'Job not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: job.id,
        status: job.status,
        request_id: job.requestId,
        created_at: job.createdAt.toISOString(),
        updated_at: job.updatedAt.toISOString(),
        has_report: !!job.finalReport,
        has_errors: !!job.errors,
      },
    });
  } catch (error) {
    console.error(`[Jobs] Error fetching job ${job_id}:`, error instanceof Error ? error.message : 'Unknown');
    return NextResponse.json(
      { success: false, error: 'Failed to fetch job' },
      { status: 500 }
    );
  }
}
