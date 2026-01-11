/**
 * Script fingerprint utilities for Truth Contract compliance.
 *
 * Provides deterministic hashing and metadata extraction for scripts.
 * IMPORTANT: No raw script text should be logged or included in error details.
 */
import { createHash } from 'node:crypto';

/**
 * Inferred script format based on length/structure analysis.
 * Per Truth Contract schema_version 1.0.0
 */
export type InferredFormat = 'scene' | 'half_hour' | 'hour' | 'feature';

/**
 * Script fingerprint data structure per Truth Contract
 */
export interface ScriptFingerprint {
  inputHash: string;       // SHA-256 of normalized script
  wordCount: number;       // Total word count
  estimatedPages: number;  // Estimated screenplay pages
  inferredFormat: InferredFormat;
  charCount: number;       // Character count (for DB)
}

// Screenplay industry standard: ~250 words per page
const WORDS_PER_PAGE = 250;

// Format thresholds (in estimated pages)
const FORMAT_THRESHOLDS = {
  scene: 5,        // < 5 pages = scene/sketch
  halfHour: 35,    // 5-35 pages = half hour sitcom
  hour: 70,        // 35-70 pages = hour drama/comedy
  // > 70 pages = feature
};

/**
 * Normalize script text for consistent hashing.
 *
 * This ensures the same logical script produces the same hash
 * regardless of minor whitespace differences.
 */
export function normalizeScript(text: string): string {
  return text
    // Normalize line endings to \n
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // Collapse multiple blank lines to single
    .replace(/\n{3,}/g, '\n\n')
    // Trim each line
    .split('\n')
    .map(line => line.trim())
    .join('\n')
    // Trim overall
    .trim();
}

/**
 * Generate a stable SHA-256 hash of the normalized script.
 */
export function hashScript(normalizedText: string): string {
  return createHash('sha256')
    .update(normalizedText, 'utf8')
    .digest('hex');
}

/**
 * Count words in text (simple whitespace split).
 */
export function countWords(text: string): number {
  const words = text.split(/\s+/).filter(word => word.length > 0);
  return words.length;
}

/**
 * Estimate screenplay pages from word count.
 */
export function estimatePages(wordCount: number): number {
  const pages = wordCount / WORDS_PER_PAGE;
  // Round to 1 decimal place
  return Math.round(pages * 10) / 10;
}

/**
 * Infer script format from estimated page count.
 */
export function inferFormat(estimatedPages: number): InferredFormat {
  if (estimatedPages < FORMAT_THRESHOLDS.scene) {
    return 'scene';
  }
  if (estimatedPages < FORMAT_THRESHOLDS.halfHour) {
    return 'half_hour';
  }
  if (estimatedPages < FORMAT_THRESHOLDS.hour) {
    return 'hour';
  }
  return 'feature';
}

/**
 * Compute full script fingerprint.
 *
 * This is the main entry point for fingerprinting a script.
 * The fingerprint is deterministic - the same script text always
 * produces the same fingerprint.
 *
 * @param scriptText - Raw script text
 * @returns ScriptFingerprint object
 */
export function computeScriptFingerprint(scriptText: string): ScriptFingerprint {
  const normalized = normalizeScript(scriptText);
  const inputHash = hashScript(normalized);
  const wordCount = countWords(normalized);
  const estimatedPages = estimatePages(wordCount);
  const inferredFormat = inferFormat(estimatedPages);

  return {
    inputHash,
    wordCount,
    estimatedPages,
    inferredFormat,
    charCount: scriptText.length,
  };
}

/**
 * Get safe metadata for logging (no raw script content).
 * Use this when you need to log script-related info.
 */
export function getSafeLogMetadata(fingerprint: ScriptFingerprint): Record<string, unknown> {
  return {
    input_hash_prefix: fingerprint.inputHash.slice(0, 12),
    word_count: fingerprint.wordCount,
    estimated_pages: fingerprint.estimatedPages,
    inferred_format: fingerprint.inferredFormat,
  };
}
