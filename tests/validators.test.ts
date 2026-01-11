/**
 * Tests for Truth Contract validators
 */
import { describe, expect, it } from 'vitest';
import {
  validatePromptBIssueIds,
  extractAllowedIssueIds,
  extractPromptBIssueIds,
  createErrorObject,
  validateFinalReportStructure,
  type PromptAResult,
  type PromptBResult,
} from '@/lib/validators';

describe('validatePromptBIssueIds', () => {
  it('returns null when all issue_ids match', () => {
    const promptA: PromptAResult = {
      issue_candidates: [
        { issue_id: 'issue-1', description: 'First issue' },
        { issue_id: 'issue-2', description: 'Second issue' },
        { issue_id: 'issue-3', description: 'Third issue' },
      ],
    };

    const promptB: PromptBResult = {
      sections: {
        whats_getting_in_the_way: [
          { issue_id: 'issue-1', explanation: 'Problem 1' },
          { issue_id: 'issue-2', explanation: 'Problem 2' },
        ],
        recommended_fixes: [
          { issue_id: 'issue-1', fix: 'Fix 1' },
          { issue_id: 'issue-3', fix: 'Fix 3' },
        ],
      },
    };

    const error = validatePromptBIssueIds(promptA, promptB, 'req-123');
    expect(error).toBeNull();
  });

  it('returns error when Prompt B has unknown issue_id in whats_getting_in_the_way', () => {
    const promptA: PromptAResult = {
      issue_candidates: [
        { issue_id: 'issue-1', description: 'First issue' },
      ],
    };

    const promptB: PromptBResult = {
      sections: {
        whats_getting_in_the_way: [
          { issue_id: 'issue-1', explanation: 'Valid' },
          { issue_id: 'unknown-issue', explanation: 'Invalid' },
        ],
        recommended_fixes: [],
      },
    };

    const error = validatePromptBIssueIds(promptA, promptB, 'req-123');

    expect(error).not.toBeNull();
    expect(error?.code).toBe('PROMPT_B_UNKNOWN_ISSUE_ID');
    expect(error?.stage).toBe('prompt_b');
    expect(error?.retryable).toBe(false);
    expect(error?.request_id).toBe('req-123');
    expect(error?.details?.missing_issue_ids).toContain('unknown-issue');
    expect(error?.details?.allowed_issue_ids_count).toBe(1);
  });

  it('returns error when Prompt B has unknown issue_id in recommended_fixes', () => {
    const promptA: PromptAResult = {
      issue_candidates: [
        { issue_id: 'issue-1', description: 'First issue' },
        { issue_id: 'issue-2', description: 'Second issue' },
      ],
    };

    const promptB: PromptBResult = {
      sections: {
        whats_getting_in_the_way: [],
        recommended_fixes: [
          { issue_id: 'issue-1', fix: 'Valid fix' },
          { issue_id: 'fabricated-issue', fix: 'Invalid fix' },
        ],
      },
    };

    const error = validatePromptBIssueIds(promptA, promptB, 'req-456');

    expect(error).not.toBeNull();
    expect(error?.code).toBe('PROMPT_B_UNKNOWN_ISSUE_ID');
    expect(error?.details?.missing_issue_ids).toContain('fabricated-issue');
  });

  it('returns error listing multiple unknown issue_ids', () => {
    const promptA: PromptAResult = {
      issue_candidates: [
        { issue_id: 'valid-1', description: 'Valid' },
      ],
    };

    const promptB: PromptBResult = {
      sections: {
        whats_getting_in_the_way: [
          { issue_id: 'invalid-1', explanation: 'Bad 1' },
          { issue_id: 'invalid-2', explanation: 'Bad 2' },
        ],
        recommended_fixes: [
          { issue_id: 'valid-1', fix: 'Good fix' },
          { issue_id: 'invalid-3', fix: 'Bad fix' },
        ],
      },
    };

    const error = validatePromptBIssueIds(promptA, promptB);

    expect(error).not.toBeNull();
    const missingIds = error?.details?.missing_issue_ids as string[];
    expect(missingIds).toHaveLength(3);
    expect(missingIds).toContain('invalid-1');
    expect(missingIds).toContain('invalid-2');
    expect(missingIds).toContain('invalid-3');
  });

  it('handles empty issue_candidates gracefully', () => {
    const promptA: PromptAResult = {
      issue_candidates: [],
    };

    const promptB: PromptBResult = {
      sections: {
        whats_getting_in_the_way: [
          { issue_id: 'any-issue', explanation: 'Problem' },
        ],
        recommended_fixes: [],
      },
    };

    const error = validatePromptBIssueIds(promptA, promptB);

    expect(error).not.toBeNull();
    expect(error?.details?.allowed_issue_ids_count).toBe(0);
  });

  it('returns null when Prompt B has no issue_ids', () => {
    const promptA: PromptAResult = {
      issue_candidates: [
        { issue_id: 'issue-1', description: 'Issue' },
      ],
    };

    const promptB: PromptBResult = {
      sections: {
        whats_getting_in_the_way: [],
        recommended_fixes: [],
      },
    };

    const error = validatePromptBIssueIds(promptA, promptB);
    expect(error).toBeNull();
  });

  it('handles missing sections in Prompt B', () => {
    const promptA: PromptAResult = {
      issue_candidates: [{ issue_id: 'issue-1', description: 'Issue' }],
    };

    const promptB: PromptBResult = {};

    const error = validatePromptBIssueIds(promptA, promptB);
    expect(error).toBeNull();
  });
});

describe('extractAllowedIssueIds', () => {
  it('extracts issue_ids from issue_candidates', () => {
    const promptA: PromptAResult = {
      issue_candidates: [
        { issue_id: 'a', description: 'A' },
        { issue_id: 'b', description: 'B' },
        { issue_id: 'c', description: 'C' },
      ],
    };

    const ids = extractAllowedIssueIds(promptA);

    expect(ids.size).toBe(3);
    expect(ids.has('a')).toBe(true);
    expect(ids.has('b')).toBe(true);
    expect(ids.has('c')).toBe(true);
  });

  it('returns empty set for missing issue_candidates', () => {
    const promptA: PromptAResult = {};
    const ids = extractAllowedIssueIds(promptA);
    expect(ids.size).toBe(0);
  });
});

describe('extractPromptBIssueIds', () => {
  it('extracts all issue_ids from both sections', () => {
    const promptB: PromptBResult = {
      sections: {
        whats_getting_in_the_way: [
          { issue_id: 'w1', explanation: 'W1' },
          { issue_id: 'w2', explanation: 'W2' },
        ],
        recommended_fixes: [
          { issue_id: 'r1', fix: 'R1' },
          { issue_id: 'r2', fix: 'R2' },
        ],
      },
    };

    const ids = extractPromptBIssueIds(promptB);

    expect(ids).toHaveLength(4);
    expect(ids).toContain('w1');
    expect(ids).toContain('w2');
    expect(ids).toContain('r1');
    expect(ids).toContain('r2');
  });
});

describe('createErrorObject', () => {
  it('creates error with required fields', () => {
    const error = createErrorObject('TEST_ERROR', 'Test message', 'input');

    expect(error.code).toBe('TEST_ERROR');
    expect(error.message).toBe('Test message');
    expect(error.stage).toBe('input');
    expect(error.retryable).toBe(false);
  });

  it('creates error with optional fields', () => {
    const error = createErrorObject('TEST_ERROR', 'Test message', 'prompt_a', {
      retryable: true,
      request_id: 'req-123',
      details: { key: 'value' },
    });

    expect(error.retryable).toBe(true);
    expect(error.request_id).toBe('req-123');
    expect(error.details).toEqual({ key: 'value' });
  });
});

describe('validateFinalReportStructure', () => {
  it('validates complete report', () => {
    const report = {
      schema_version: '1.0.0',
      run: { job_id: 'job-1' },
      prompt_a: { data: 'a' },
      prompt_b: { data: 'b' },
    };

    const result = validateFinalReportStructure(report);

    expect(result.isValid).toBe(true);
    expect(result.missingFields).toHaveLength(0);
  });

  it('identifies missing fields', () => {
    const report = {
      schema_version: '1.0.0',
      run: { job_id: 'job-1' },
    };

    const result = validateFinalReportStructure(report);

    expect(result.isValid).toBe(false);
    expect(result.missingFields).toContain('prompt_a');
    expect(result.missingFields).toContain('prompt_b');
  });

  it('handles null/undefined input', () => {
    expect(validateFinalReportStructure(null).isValid).toBe(false);
    expect(validateFinalReportStructure(undefined).isValid).toBe(false);
  });
});
