import { describe, expect, it } from 'vitest';
import { calculateGapPriorityScores } from '@/lib/llm/translatePromptAToFullAnalysis';

describe('calculateGapPriorityScores', () => {
  const gaps = [
    { startLine: 5, endLine: 12, length: 7, durationMin: 0.8 },
    { startLine: 70, endLine: 90, length: 20, durationMin: 2 },
    { startLine: 140, endLine: 180, length: 40, durationMin: 5 },
  ];

  const jokesByLine = [
    { line: 10, type: 'Basic', character: 'A' },
    { line: 20, type: 'Standard', character: 'A' },
    { line: 50, type: 'Basic', character: 'A' },
    { line: 150, type: 'Advanced', character: 'A' },
  ];

  const priorities = calculateGapPriorityScores({
    gaps,
    totalLines: 200,
    runtimeMinutes: 20,
    jokesByLine,
    laughsPerMinute: 3,
  });

  it('ranks the long late gap as the highest priority', () => {
    expect(priorities[0]).toMatchObject({ startLine: 140, endLine: 180, priority: 1 });
  });

  it('elevates low-density gaps above short early gaps', () => {
    const lowDensity = priorities.find((gap) => gap.startLine === 70);
    const shortGap = priorities.find((gap) => gap.startLine === 5);

    expect(lowDensity?.priority).toBe(2);
    expect(shortGap?.priority).toBe(priorities.length);
    expect((lowDensity?.score ?? 0) > (shortGap?.score ?? 0)).toBe(true);
  });

  it('keeps the short early gap deterministically last', () => {
    expect(priorities[priorities.length - 1]).toMatchObject({ startLine: 5, endLine: 12 });
  });
});
