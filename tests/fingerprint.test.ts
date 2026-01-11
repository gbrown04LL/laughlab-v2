/**
 * Tests for script fingerprint utilities
 */
import { describe, expect, it } from 'vitest';
import {
  normalizeScript,
  hashScript,
  countWords,
  estimatePages,
  inferFormat,
  computeScriptFingerprint,
  getSafeLogMetadata,
} from '@/lib/fingerprint';

describe('normalizeScript', () => {
  it('normalizes line endings', () => {
    const input = 'line1\r\nline2\rline3\nline4';
    const result = normalizeScript(input);

    expect(result).not.toContain('\r');
    expect(result.split('\n')).toHaveLength(4);
  });

  it('collapses multiple blank lines', () => {
    const input = 'line1\n\n\n\n\nline2';
    const result = normalizeScript(input);

    expect(result).toBe('line1\n\nline2');
  });

  it('trims each line', () => {
    const input = '  line1  \n  line2  ';
    const result = normalizeScript(input);

    expect(result).toBe('line1\nline2');
  });

  it('trims overall result', () => {
    const input = '\n\n  text  \n\n';
    const result = normalizeScript(input);

    expect(result).toBe('text');
  });
});

describe('hashScript', () => {
  it('produces consistent hash for same input', () => {
    const text = 'Hello, world!';
    const hash1 = hashScript(text);
    const hash2 = hashScript(text);

    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64); // SHA-256 hex is 64 chars
  });

  it('produces different hash for different input', () => {
    const hash1 = hashScript('text1');
    const hash2 = hashScript('text2');

    expect(hash1).not.toBe(hash2);
  });
});

describe('countWords', () => {
  it('counts words correctly', () => {
    expect(countWords('one two three')).toBe(3);
    expect(countWords('hello world')).toBe(2);
    expect(countWords('single')).toBe(1);
  });

  it('handles multiple spaces', () => {
    expect(countWords('one   two    three')).toBe(3);
  });

  it('handles newlines and tabs', () => {
    expect(countWords('one\ntwo\tthree')).toBe(3);
  });

  it('returns 0 for empty/whitespace', () => {
    expect(countWords('')).toBe(0);
    expect(countWords('   ')).toBe(0);
  });
});

describe('estimatePages', () => {
  it('estimates pages at 250 words/page', () => {
    expect(estimatePages(250)).toBe(1);
    expect(estimatePages(500)).toBe(2);
    expect(estimatePages(125)).toBe(0.5);
  });

  it('rounds to one decimal place', () => {
    expect(estimatePages(333)).toBe(1.3); // 333/250 = 1.332
    expect(estimatePages(275)).toBe(1.1); // 275/250 = 1.1
  });
});

describe('inferFormat', () => {
  it('infers scene for < 5 pages', () => {
    expect(inferFormat(1)).toBe('scene');
    expect(inferFormat(4.9)).toBe('scene');
  });

  it('infers half_hour for 5-35 pages', () => {
    expect(inferFormat(5)).toBe('half_hour');
    expect(inferFormat(20)).toBe('half_hour');
    expect(inferFormat(34)).toBe('half_hour');
  });

  it('infers hour for 35-70 pages', () => {
    expect(inferFormat(35)).toBe('hour');
    expect(inferFormat(50)).toBe('hour');
    expect(inferFormat(69)).toBe('hour');
  });

  it('infers feature for > 70 pages', () => {
    expect(inferFormat(70)).toBe('feature');
    expect(inferFormat(100)).toBe('feature');
    expect(inferFormat(120)).toBe('feature');
  });
});

describe('computeScriptFingerprint', () => {
  it('computes all fingerprint fields', () => {
    const script = 'FADE IN:\n\nINT. LIVING ROOM - DAY\n\nJERRY enters.';
    const fp = computeScriptFingerprint(script);

    expect(fp.inputHash).toHaveLength(64);
    expect(fp.wordCount).toBeGreaterThan(0);
    expect(typeof fp.estimatedPages).toBe('number');
    expect(['scene', 'half_hour', 'hour', 'feature']).toContain(fp.inferredFormat);
    expect(fp.charCount).toBe(script.length);
  });

  it('produces same hash for equivalent scripts', () => {
    // Scripts with different line endings and leading/trailing whitespace
    const script1 = 'Hello world\nLine two';
    const script2 = '  Hello world  \r\n  Line two  ';

    const fp1 = computeScriptFingerprint(script1);
    const fp2 = computeScriptFingerprint(script2);

    // Both should normalize to same text (trimmed lines, unified line endings)
    expect(fp1.inputHash).toBe(fp2.inputHash);
    expect(fp1.wordCount).toBe(fp2.wordCount);
  });

  it('produces different hash for different scripts', () => {
    const fp1 = computeScriptFingerprint('Script A');
    const fp2 = computeScriptFingerprint('Script B');

    expect(fp1.inputHash).not.toBe(fp2.inputHash);
  });
});

describe('getSafeLogMetadata', () => {
  it('returns safe metadata without full hash', () => {
    const fp = computeScriptFingerprint('Test script content here');
    const meta = getSafeLogMetadata(fp);

    expect(meta.input_hash_prefix).toHaveLength(12);
    expect(meta.word_count).toBe(fp.wordCount);
    expect(meta.estimated_pages).toBe(fp.estimatedPages);
    expect(meta.inferred_format).toBe(fp.inferredFormat);

    // Should NOT contain full hash
    expect(meta.input_hash_prefix).not.toBe(fp.inputHash);
  });
});
