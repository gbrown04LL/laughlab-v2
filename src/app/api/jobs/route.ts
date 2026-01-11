/**
 * POST /api/jobs - Create a new analysis job
 *
 * Creates a job linked to an existing script submission.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { generateId } from '@/lib/utils';
import { createErrorObject, type ErrorObject } from '@/lib/validators';

interface CreateJobRequest {
  script_id: string;
}

interface CreateJobResponse {
  success: boolean;
  data?: {
    id: string;
    script_id: string;
    status: string;
    created_at: string;
  };
  errors?: ErrorObject[];
}

export async function POST(request: NextRequest): Promise<NextResponse<CreateJobResponse>> {
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

    const { script_id } = body as CreateJobRequest;

    if (!script_id || typeof script_id !== 'string') {
      return NextResponse.json(
        {
          success: false,
          errors: [
            createErrorObject(
              'MISSING_SCRIPT_ID',
              'script_id is required',
              'input',
              { request_id: requestId }
            ),
          ],
        },
        { status: 400 }
      );
    }

    const prisma = getPrismaClient();

    // Verify script exists
    const script = await prisma.scriptSubmission.findUnique({
      where: { id: script_id },
    });

    if (!script) {
      return NextResponse.json(
        {
          success: false,
          errors: [
            createErrorObject(
              'SCRIPT_NOT_FOUND',
              `Script ${script_id} not found`,
              'input',
              { request_id: requestId }
            ),
          ],
        },
        { status: 404 }
      );
    }

    // Create job
    const job = await prisma.job.create({
      data: {
        scriptId: script_id,
        status: 'PENDING',
        requestId,
      },
    });

    console.log(
      `[Jobs][${requestId}] Created job ${job.id} for script ${script_id} (hash: ${script.inputHash.slice(0, 12)}...)`
    );

    return NextResponse.json(
      {
        success: true,
        data: {
          id: job.id,
          script_id: job.scriptId,
          status: job.status,
          created_at: job.createdAt.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(`[Jobs][${requestId}] Error:`, error instanceof Error ? error.message : 'Unknown error');

    return NextResponse.json(
      {
        success: false,
        errors: [
          createErrorObject(
            'INTERNAL_ERROR',
            'Failed to create job',
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
 * GET /api/jobs - List jobs (limited)
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get('limit') || '10', 10), 100);

  try {
    const prisma = getPrismaClient();
    const jobs = await prisma.job.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        status: true,
        scriptId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: jobs.map((job: { id: string; status: string; scriptId: string; createdAt: Date; updatedAt: Date }) => ({
        id: job.id,
        status: job.status,
        script_id: job.scriptId,
        created_at: job.createdAt.toISOString(),
        updated_at: job.updatedAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('[Jobs] Error listing jobs:', error instanceof Error ? error.message : 'Unknown');
    return NextResponse.json(
      { success: false, error: 'Failed to list jobs' },
      { status: 500 }
    );
  }
}
