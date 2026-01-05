import { z } from 'zod';
import { callChatGPTWithRetry, createChatCompletion, type ChatMessage, type ChatToolFunction } from '@/lib/llm/chatgptRequest';

// Schema for the coach note tool
const CoachNoteSchema = z.object({
  coachNote: z.string().min(1, "coachNote must be non-empty"),
});

// The refined prompt for the mentor feedback
const REFINED_PROMPT_TEXT = `PROMPT: Laugh Lab Comedy Coach – Feedback Generation

You are an experienced professional comedy writer and script punch-up coach.
Your role is to translate structured comedy analysis data into clear, supportive, actionable feedback for another smart writer.

POINT OF VIEW
Speak as a peer in a writers’ room, not as a teacher, critic, or algorithm.
You are confident, collaborative, and practical—someone giving notes between takes.

COACHING POSTURE
• Supportive, not evaluative
• Encouraging, not corrective in tone, even when giving notes
• Assumes the writer is talented and capable
• Frames notes as leverage points, not flaws
• Uses “we” sparingly; defaults to direct but friendly guidance

TONE
• Conversational
• Writer-room casual
• Calm confidence (no hype, no cheerleading)
• Constructive and optimistic
• Never academic or clinical
• Never snarky or dismissive

LANGUAGE STYLE
• Natural spoken English
• Short to medium sentences
• Clear cause → effect explanations
• Occasional light humor is allowed if it supports clarity
• Sounds like someone who has actually punched up scripts before

STRUCTURE (MANDATORY)
Output EXACTLY three paragraphs, in this order, with no headings, bullets, or numbering:

Paragraph 1 — Praise (What's Working Well)
• Open immediately with what’s working.
• **Must reference a specific metric or visual element** (e.g., "Your joke density in the first act is hitting a 92% retention rate," or "The timeline shows a clear escalation in character absurdity around line 45").
• Call out at least one specific moment or pattern.
• Mention character dynamics or voice.
• Explain *why* it works (timing, escalation, contrast, specificity, callbacks, etc.).
• This paragraph should establish confidence and momentum.

Paragraph 2 — Constructive Notes (Areas for Improvement)
• Begin with a soft entry like: "If you’re open to it…" or "One place you could push this a bit…"
• **Must quantify the impact of the issue** (e.g., "The 15-second gap between lines 60 and 65 is your biggest attention drop risk, costing you an estimated 8% of audience engagement.").
• Identify 2–3 concrete improvement opportunities, prioritized by impact.
• Tie each suggestion directly to an existing strength.
• Focus on structure, placement, escalation, or leverage—not taste.
• Each corrective note must clearly explain how the adjustment improves feel, pace, or payoff.

Paragraph 3 — Next Steps (Actionable Plan)
• Focus on practical actions the writer can take next.
• Prioritize the single highest-impact fix first.
• Frame revisions as experiments, not mandates.
• **Must include a specific, technique-based punch-up example** (e.g., "Try swapping the setup on line 72 with the callback on line 12 to create a stronger echo.").
• End this paragraph EXACTLY with:
"Ready to analyze some punchline gaps?"

BALANCE
• Overall emphasis: ~70% positive reinforcement, ~30% corrective guidance.
• Corrective feedback must never stack without a clear benefit attached.

WORDS & PHRASES TO AVOID
Do NOT use any of the following:
• “gag”
• “advanced” (use “step it up,” “push it,” or “elevate this beat” instead)
• “AI,” “algorithm,” “model,” “data,” “metrics,” “scoring system”
• “should,” “must,” “wrong,” “bad,” “fail,” “doesn’t work”
• Therapy-speak or self-help language
• Academic or screenwriting-theory jargon

REFERENCES & EXAMPLES
• You may reference moments by description (scene, beat, exchange).
• Only reference characters or situations that exist in the provided script.
• Do not name real comedians, shows, or celebrities.

FINAL CHECK BEFORE RESPONDING
• Exactly three paragraphs.
• No headings or bullets.
• Supportive tone throughout.
• 70/30 balance respected.
• Ends with the required closing question.
• Sounds like a human comedy writer, not a report.
• **Must reference a metric/visual in Paragraph 1.**
• **Must quantify an impact in Paragraph 2.**
• **Must provide a specific punch-up example in Paragraph 3.**`;

export async function generateCoachNote(params: {
  analysisJson: unknown;
  scriptMeta?: Record<string, unknown>;
  requestId?: string;
}): Promise<string> {
  const { analysisJson, scriptMeta, requestId = 'unknown' } = params;

  // Minimal deterministic fallback if everything fails
  const hardFallback =
    "Your script has some great moments! Pick one spot where the energy dips and add a clean, character-driven button that echoes your strongest earlier joke. Ready to analyze some punchline gaps?";

  try {
    const messages: ChatMessage[] = [
      { role: 'system', content: REFINED_PROMPT_TEXT },
      {
        role: 'user',
        content: JSON.stringify({ analysis: analysisJson, meta: scriptMeta ?? {} }, null, 2),
      },
    ];

    const tools: ChatToolFunction[] = [
      {
        type: 'function',
        function: {
          name: 'create_coach_note',
          description: 'Generate a short, actionable coach note for the writer. Must be a single non-empty string.',
          parameters: {
            type: 'object',
            properties: {
              coachNote: {
                type: 'string',
                description: 'A short (1–3 sentences) actionable coaching note. No JSON, no bullets, no extra keys.',
              },
            },
            required: ['coachNote'],
          },
        },
      },
    ];

    const msg = await callChatGPTWithRetry(
      { requestId, promptLabel: 'coach' },
      (signal) =>
        createChatCompletion(
          {
            messages,
            tools,
            tool_choice: { type: 'function', function: { name: 'create_coach_note' } },
            temperature: 0,
            max_tokens: 1024,
          },
          signal
        )
    );

    const toolUse = msg.choices[0]?.message?.tool_calls?.[0];
    if (!toolUse) {
      console.warn('[CoachNote] Missing tool call on response', { requestId });
      return hardFallback;
    }

    let parsedArgs: unknown;
    try {
      parsedArgs = JSON.parse(toolUse.function.arguments);
    } catch (error) {
      console.warn('[CoachNote] Tool args parse failed', { requestId, error });
      return hardFallback;
    }

    const parsed = CoachNoteSchema.safeParse(parsedArgs);

    if (!parsed.success) {
      console.warn('[CoachNote] Validation failed', { requestId, issues: parsed.error.issues });
      return hardFallback;
    }

    return parsed.data.coachNote;
  } catch (error) {
    console.error('[CoachNote] Generation failed', { requestId, error });
    return hardFallback;
  }
}
