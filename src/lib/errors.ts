// ===========================================
// LAUGH LAB PRO - ERROR TAXONOMY
// ===========================================
// This file defines the canonical error types and handling for the application.
// All API responses must use this error contract.

/**
 * Error categories for classification and handling
 */
export enum ErrorCategory {
  // Validation errors (4xx - client can fix)
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  SCHEMA_VALIDATION_ERROR = 'SCHEMA_VALIDATION_ERROR',
  INPUT_TOO_LARGE = 'INPUT_TOO_LARGE',
  INVALID_FORMAT = 'INVALID_FORMAT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',

  // Authentication/Authorization errors (4xx)
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  OWNERSHIP_VIOLATION = 'OWNERSHIP_VIOLATION',
  TIER_LIMIT_EXCEEDED = 'TIER_LIMIT_EXCEEDED',

  // Rate limiting errors (429)
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',

  // LLM/Model errors (5xx - may be retryable)
  LLM_ERROR = 'LLM_ERROR',
  LLM_TIMEOUT = 'LLM_TIMEOUT',
  LLM_RATE_LIMIT = 'LLM_RATE_LIMIT',
  LLM_INVALID_RESPONSE = 'LLM_INVALID_RESPONSE',
  LLM_CONTENT_FILTER = 'LLM_CONTENT_FILTER',

  // Database errors (5xx)
  DATABASE_ERROR = 'DATABASE_ERROR',
  DATABASE_TIMEOUT = 'DATABASE_TIMEOUT',
  SCHEMA_DRIFT_ERROR = 'SCHEMA_DRIFT_ERROR',

  // Job/Pipeline errors (5xx)
  JOB_NOT_FOUND = 'JOB_NOT_FOUND',
  JOB_ALREADY_COMPLETED = 'JOB_ALREADY_COMPLETED',
  STAGE_FAILED = 'STAGE_FAILED',
  STUCK_JOB_TIMEOUT = 'STUCK_JOB_TIMEOUT',

  // UI/Rendering errors (client-side)
  RENDER_ERROR = 'RENDER_ERROR',
  HYDRATION_ERROR = 'HYDRATION_ERROR',

  // Generic errors
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * Standard API error response contract
 */
export interface ApiError {
  /** Error category for programmatic handling */
  code: ErrorCategory;
  /** Human-readable error message */
  message: string;
  /** Unique request ID for debugging */
  request_id?: string;
  /** Associated job ID if applicable */
  job_id?: string;
  /** Associated stage ID if applicable */
  stage_id?: string;
  /** Whether the client should retry */
  retryable: boolean;
  /** Suggested retry delay in milliseconds */
  retry_after_ms?: number;
  /** Additional error details (validation errors, etc.) */
  details?: Record<string, unknown>;
  /** Timestamp of the error */
  timestamp: string;
}

/**
 * Error configuration for each category
 */
const ERROR_CONFIG: Record<ErrorCategory, {
  httpStatus: number;
  retryable: boolean;
  defaultMessage: string;
  surfaceToUser: boolean;
}> = {
  // Validation errors
  [ErrorCategory.VALIDATION_ERROR]: {
    httpStatus: 400,
    retryable: false,
    defaultMessage: 'The request contains invalid data.',
    surfaceToUser: true,
  },
  [ErrorCategory.SCHEMA_VALIDATION_ERROR]: {
    httpStatus: 400,
    retryable: false,
    defaultMessage: 'The response data failed schema validation.',
    surfaceToUser: false,
  },
  [ErrorCategory.INPUT_TOO_LARGE]: {
    httpStatus: 413,
    retryable: false,
    defaultMessage: 'The script exceeds the maximum allowed length.',
    surfaceToUser: true,
  },
  [ErrorCategory.INVALID_FORMAT]: {
    httpStatus: 400,
    retryable: false,
    defaultMessage: 'The script format is not supported.',
    surfaceToUser: true,
  },
  [ErrorCategory.MISSING_REQUIRED_FIELD]: {
    httpStatus: 400,
    retryable: false,
    defaultMessage: 'A required field is missing.',
    surfaceToUser: true,
  },

  // Auth errors
  [ErrorCategory.UNAUTHORIZED]: {
    httpStatus: 401,
    retryable: false,
    defaultMessage: 'Authentication required.',
    surfaceToUser: true,
  },
  [ErrorCategory.FORBIDDEN]: {
    httpStatus: 403,
    retryable: false,
    defaultMessage: 'You do not have permission to access this resource.',
    surfaceToUser: true,
  },
  [ErrorCategory.OWNERSHIP_VIOLATION]: {
    httpStatus: 403,
    retryable: false,
    defaultMessage: 'You do not own this resource.',
    surfaceToUser: true,
  },
  [ErrorCategory.TIER_LIMIT_EXCEEDED]: {
    httpStatus: 403,
    retryable: false,
    defaultMessage: 'This feature requires a higher subscription tier.',
    surfaceToUser: true,
  },

  // Rate limiting
  [ErrorCategory.RATE_LIMIT_EXCEEDED]: {
    httpStatus: 429,
    retryable: true,
    defaultMessage: 'Too many requests. Please try again later.',
    surfaceToUser: true,
  },
  [ErrorCategory.QUOTA_EXCEEDED]: {
    httpStatus: 429,
    retryable: false,
    defaultMessage: 'You have exceeded your monthly analysis quota.',
    surfaceToUser: true,
  },

  // LLM errors
  [ErrorCategory.LLM_ERROR]: {
    httpStatus: 502,
    retryable: true,
    defaultMessage: 'The AI service encountered an error.',
    surfaceToUser: true,
  },
  [ErrorCategory.LLM_TIMEOUT]: {
    httpStatus: 504,
    retryable: true,
    defaultMessage: 'The AI service timed out. Please try again.',
    surfaceToUser: true,
  },
  [ErrorCategory.LLM_RATE_LIMIT]: {
    httpStatus: 429,
    retryable: true,
    defaultMessage: 'AI service rate limit reached. Please wait a moment.',
    surfaceToUser: true,
  },
  [ErrorCategory.LLM_INVALID_RESPONSE]: {
    httpStatus: 502,
    retryable: true,
    defaultMessage: 'The AI returned an invalid response.',
    surfaceToUser: false,
  },
  [ErrorCategory.LLM_CONTENT_FILTER]: {
    httpStatus: 400,
    retryable: false,
    defaultMessage: 'The script content was flagged by content filters.',
    surfaceToUser: true,
  },

  // Database errors
  [ErrorCategory.DATABASE_ERROR]: {
    httpStatus: 500,
    retryable: true,
    defaultMessage: 'A database error occurred.',
    surfaceToUser: false,
  },
  [ErrorCategory.DATABASE_TIMEOUT]: {
    httpStatus: 504,
    retryable: true,
    defaultMessage: 'Database operation timed out.',
    surfaceToUser: false,
  },
  [ErrorCategory.SCHEMA_DRIFT_ERROR]: {
    httpStatus: 500,
    retryable: false,
    defaultMessage: 'Database schema mismatch detected.',
    surfaceToUser: false,
  },

  // Job errors
  [ErrorCategory.JOB_NOT_FOUND]: {
    httpStatus: 404,
    retryable: false,
    defaultMessage: 'The requested job was not found.',
    surfaceToUser: true,
  },
  [ErrorCategory.JOB_ALREADY_COMPLETED]: {
    httpStatus: 409,
    retryable: false,
    defaultMessage: 'This job has already been completed.',
    surfaceToUser: true,
  },
  [ErrorCategory.STAGE_FAILED]: {
    httpStatus: 500,
    retryable: true,
    defaultMessage: 'A stage in the analysis pipeline failed.',
    surfaceToUser: true,
  },
  [ErrorCategory.STUCK_JOB_TIMEOUT]: {
    httpStatus: 500,
    retryable: true,
    defaultMessage: 'The job timed out. Please try again.',
    surfaceToUser: true,
  },

  // UI errors
  [ErrorCategory.RENDER_ERROR]: {
    httpStatus: 500,
    retryable: false,
    defaultMessage: 'A rendering error occurred.',
    surfaceToUser: false,
  },
  [ErrorCategory.HYDRATION_ERROR]: {
    httpStatus: 500,
    retryable: false,
    defaultMessage: 'A page hydration error occurred.',
    surfaceToUser: false,
  },

  // Generic errors
  [ErrorCategory.INTERNAL_ERROR]: {
    httpStatus: 500,
    retryable: false,
    defaultMessage: 'An internal error occurred.',
    surfaceToUser: false,
  },
  [ErrorCategory.UNKNOWN_ERROR]: {
    httpStatus: 500,
    retryable: false,
    defaultMessage: 'An unexpected error occurred.',
    surfaceToUser: false,
  },
};

/**
 * Custom error class for Laugh Lab errors
 */
export class LaughLabError extends Error {
  public readonly code: ErrorCategory;
  public readonly httpStatus: number;
  public readonly retryable: boolean;
  public readonly details?: Record<string, unknown>;
  public readonly jobId?: string;
  public readonly stageId?: string;
  public readonly retryAfterMs?: number;

  constructor(
    code: ErrorCategory,
    message?: string,
    options?: {
      details?: Record<string, unknown>;
      jobId?: string;
      stageId?: string;
      retryAfterMs?: number;
    }
  ) {
    const config = ERROR_CONFIG[code];
    super(message || config.defaultMessage);
    this.name = 'LaughLabError';
    this.code = code;
    this.httpStatus = config.httpStatus;
    this.retryable = config.retryable;
    this.details = options?.details;
    this.jobId = options?.jobId;
    this.stageId = options?.stageId;
    this.retryAfterMs = options?.retryAfterMs;
  }

  /**
   * Convert to API error response
   */
  toApiError(requestId?: string): ApiError {
    return {
      code: this.code,
      message: this.message,
      request_id: requestId,
      job_id: this.jobId,
      stage_id: this.stageId,
      retryable: this.retryable,
      retry_after_ms: this.retryAfterMs,
      details: this.details,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get user-facing message (sanitized)
   */
  getUserMessage(): string {
    const config = ERROR_CONFIG[this.code];
    return config.surfaceToUser ? this.message : 'An error occurred. Please try again.';
  }
}

/**
 * Create a standardized API error response
 */
export function createApiError(
  code: ErrorCategory,
  message?: string,
  options?: {
    requestId?: string;
    jobId?: string;
    stageId?: string;
    details?: Record<string, unknown>;
    retryAfterMs?: number;
  }
): ApiError {
  const config = ERROR_CONFIG[code];
  return {
    code,
    message: message || config.defaultMessage,
    request_id: options?.requestId,
    job_id: options?.jobId,
    stage_id: options?.stageId,
    retryable: config.retryable,
    retry_after_ms: options?.retryAfterMs,
    details: options?.details,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Get HTTP status code for an error category
 */
export function getHttpStatus(code: ErrorCategory): number {
  return ERROR_CONFIG[code].httpStatus;
}

/**
 * Check if an error is retryable
 */
export function isRetryable(code: ErrorCategory): boolean {
  return ERROR_CONFIG[code].retryable;
}

/**
 * Classify an unknown error into an ErrorCategory
 */
export function classifyError(error: unknown): ErrorCategory {
  if (error instanceof LaughLabError) {
    return error.code;
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    // LLM errors
    if (message.includes('timeout') || message.includes('timed out')) {
      return ErrorCategory.LLM_TIMEOUT;
    }
    if (message.includes('rate limit') || message.includes('429')) {
      return ErrorCategory.LLM_RATE_LIMIT;
    }
    if (message.includes('content filter') || message.includes('flagged')) {
      return ErrorCategory.LLM_CONTENT_FILTER;
    }

    // Database errors
    if (message.includes('database') || message.includes('postgres') || message.includes('supabase')) {
      return ErrorCategory.DATABASE_ERROR;
    }

    // Validation errors
    if (message.includes('validation') || message.includes('invalid')) {
      return ErrorCategory.VALIDATION_ERROR;
    }

    // Auth errors
    if (message.includes('unauthorized') || message.includes('unauthenticated')) {
      return ErrorCategory.UNAUTHORIZED;
    }
    if (message.includes('forbidden') || message.includes('permission')) {
      return ErrorCategory.FORBIDDEN;
    }
  }

  return ErrorCategory.UNKNOWN_ERROR;
}

/**
 * Wrap an async function with error classification
 */
export async function withErrorHandling<T>(
  fn: () => Promise<T>,
  options?: {
    requestId?: string;
    jobId?: string;
    stageId?: string;
  }
): Promise<{ success: true; data: T } | { success: false; error: ApiError }> {
  try {
    const data = await fn();
    return { success: true, data };
  } catch (error) {
    const code = classifyError(error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: createApiError(code, message, options),
    };
  }
}
