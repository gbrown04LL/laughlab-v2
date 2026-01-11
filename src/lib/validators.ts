/**
 * Validators for Laugh Lab V1 Truth Contract compliance.
 *
 * Schema version: 1.0.0
 *
 * IMPORTANT: Error details must NOT include raw script text.
 */

/**
 * Canonical ErrorObject per Truth Contract.
 */
export interface ErrorObject {
  code: string;
  message: string;
  stage: 'input' | 'prompt_a' | 'prompt_b' | 'persistence';
  retryable: boolean;
  request_id?: string;
  details?: Record<string, unknown>;
}

/**
 * Issue candidate from Prompt A (simplified structure)
 */
export interface IssueCandidate {
  issue_id: string;
  [key: string]: unknown;
}

/**
 * Prompt A result structure (relevant fields)
 */
export interface PromptAResult {
  issue_candidates?: IssueCandidate[];
  [key: string]: unknown;
}

/**
 * Section item with issue_id reference
 */
export interface SectionItem {
  issue_id: string;
  [key: string]: unknown;
}

/**
 * Prompt B sections structure
 */
export interface PromptBSections {
  whats_getting_in_the_way?: SectionItem[];
  recommended_fixes?: SectionItem[];
  [key: string]: unknown;
}

/**
 * Prompt B result structure (relevant fields)
 */
export interface PromptBResult {
  sections?: PromptBSections;
  [key: string]: unknown;
}

/**
 * Extract all issue_ids from Prompt A issue_candidates.
 */
export function extractAllowedIssueIds(promptA: PromptAResult): Set<string> {
  const issueIds = new Set<string>();

  if (promptA.issue_candidates && Array.isArray(promptA.issue_candidates)) {
    for (const candidate of promptA.issue_candidates) {
      if (candidate && typeof candidate.issue_id === 'string') {
        issueIds.add(candidate.issue_id);
      }
    }
  }

  return issueIds;
}

/**
 * Extract all issue_ids referenced in Prompt B sections.
 */
export function extractPromptBIssueIds(promptB: PromptBResult): string[] {
  const issueIds: string[] = [];

  if (promptB.sections) {
    const { whats_getting_in_the_way, recommended_fixes } = promptB.sections;

    if (Array.isArray(whats_getting_in_the_way)) {
      for (const item of whats_getting_in_the_way) {
        if (item && typeof item.issue_id === 'string') {
          issueIds.push(item.issue_id);
        }
      }
    }

    if (Array.isArray(recommended_fixes)) {
      for (const item of recommended_fixes) {
        if (item && typeof item.issue_id === 'string') {
          issueIds.push(item.issue_id);
        }
      }
    }
  }

  return issueIds;
}

/**
 * Validate that all Prompt B issue_ids exist in Prompt A issue_candidates.
 *
 * Truth Contract rule: Prompt B must not introduce new issues;
 * its issue_id values must match Prompt A issue_candidates.issue_id.
 *
 * @returns null if valid, ErrorObject if invalid
 */
export function validatePromptBIssueIds(
  promptA: PromptAResult,
  promptB: PromptBResult,
  requestId?: string
): ErrorObject | null {
  const allowedIssueIds = extractAllowedIssueIds(promptA);
  const promptBIssueIds = extractPromptBIssueIds(promptB);

  // Find any issue_ids in Prompt B that aren't in Prompt A
  const missingIssueIds: string[] = [];
  for (const issueId of promptBIssueIds) {
    if (!allowedIssueIds.has(issueId)) {
      missingIssueIds.push(issueId);
    }
  }

  if (missingIssueIds.length === 0) {
    return null; // Valid
  }

  // Return canonical error object
  // IMPORTANT: No raw script text in details
  return {
    code: 'PROMPT_B_UNKNOWN_ISSUE_ID',
    message: `Prompt B references ${missingIssueIds.length} issue_id(s) not found in Prompt A issue_candidates`,
    stage: 'prompt_b',
    retryable: false,
    request_id: requestId,
    details: {
      missing_issue_ids: missingIssueIds,
      allowed_issue_ids_count: allowedIssueIds.size,
    },
  };
}

/**
 * Create a canonical error object.
 *
 * Helper to ensure all errors follow Truth Contract format.
 */
export function createErrorObject(
  code: string,
  message: string,
  stage: ErrorObject['stage'],
  options?: {
    retryable?: boolean;
    request_id?: string;
    details?: Record<string, unknown>;
  }
): ErrorObject {
  return {
    code,
    message,
    stage,
    retryable: options?.retryable ?? false,
    ...(options?.request_id && { request_id: options.request_id }),
    ...(options?.details && { details: options.details }),
  };
}

/**
 * Validate final report has required Truth Contract fields.
 */
export interface FinalReportValidation {
  isValid: boolean;
  missingFields: string[];
}

export function validateFinalReportStructure(report: unknown): FinalReportValidation {
  const requiredFields = ['schema_version', 'run', 'prompt_a', 'prompt_b'];
  const missingFields: string[] = [];

  if (!report || typeof report !== 'object') {
    return { isValid: false, missingFields: requiredFields };
  }

  const reportObj = report as Record<string, unknown>;
  for (const field of requiredFields) {
    if (!(field in reportObj)) {
      missingFields.push(field);
    }
  }

  return {
    isValid: missingFields.length === 0,
    missingFields,
  };
}
