const FORBIDDEN = [
  'multiplier',
  'formula',
  'json',
  'basic',
  'standard',
  'intermediate',
  'advanced',
  'high complexity',
];

function normalizeText(text: string): string {
  return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

export function validatePromptB(
  text: string
): { ok: true; value: string } | { ok: false; error: string } {
  const normalized = normalizeText(text).trimEnd();

  const paragraphs = normalized.split(/\n\s*\n/).filter(Boolean);
  if (paragraphs.length !== 3) {
    return { ok: false, error: 'Feedback must have exactly 3 paragraphs' };
  }

  const lastLine = paragraphs[paragraphs.length - 1];
  if (lastLine !== 'Ready to analyze some punchline gaps?') {
    return { ok: false, error: 'Feedback must end with the required line' };
  }

  const lowered = normalized.toLowerCase();
  if (FORBIDDEN.some((term) => lowered.includes(term))) {
    return { ok: false, error: 'Feedback includes forbidden terminology' };
  }

  return { ok: true, value: normalized };
}
