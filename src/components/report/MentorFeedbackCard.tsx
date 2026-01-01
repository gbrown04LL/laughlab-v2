'use client';

import { cn } from '@/lib/utils';

interface MentorFeedbackCardProps {
  feedback: string;
}

export function MentorFeedbackCard({ feedback }: MentorFeedbackCardProps) {
  // Parse the feedback into three sections based on paragraphs
  // We expect 3 paragraphs separated by double newlines
  const paragraphs = feedback.split('\n\n').filter(p => p.trim().length > 0);
  
  // Fallback if parsing fails or format is unexpected
  if (paragraphs.length < 3) {
    return (
      <div className="report-section bg-ink-900/50 border-ink-800">
        <h3 className="section-subtitle flex items-center gap-2 mb-4">
          <span className="text-2xl">🧢</span> Coach&apos;s Notes
        </h3>
        <div className="prose prose-invert max-w-none text-ink-300">
          {feedback.split('\n').map((line, i) => (
            <p key={i}>{line}</p>
          ))}
        </div>
      </div>
    );
  }

  const [praise, improvements, nextSteps] = paragraphs;

  return (
    <div className="report-section bg-ink-900/50 border-ink-800 overflow-hidden relative">
      {/* Decorative background element */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-stage-500/5 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />

      <div className="relative z-10">
        <h3 className="section-subtitle flex items-center gap-3 mb-6">
          <span className="text-3xl">🧢</span> 
          <div>
            <span className="block text-ink-100">Coach&apos;s Notes</span>
            <span className="block text-xs text-ink-400 font-normal mt-0.5">Professional Feedback & Next Steps</span>
          </div>
        </h3>

        <div className="space-y-6">
          {/* Section 1: Praise (Green) */}
          <div className="pl-4 border-l-2 border-emerald-500/50">
            <h4 className="text-sm font-bold text-emerald-400 mb-2 uppercase tracking-wider flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              What&apos;s Working
            </h4>
            <p className="text-ink-200 leading-relaxed text-base">
              {praise}
            </p>
          </div>

          {/* Section 2: Improvements (Yellow) */}
          <div className="pl-4 border-l-2 border-amber-500/50">
            <h4 className="text-sm font-bold text-amber-400 mb-2 uppercase tracking-wider flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              Areas for Focus
            </h4>
            <p className="text-ink-200 leading-relaxed text-base">
              {improvements}
            </p>
          </div>

          {/* Section 3: Next Steps (Blue) */}
          <div className="pl-4 border-l-2 border-stage-500/50 bg-stage-500/5 py-3 pr-3 rounded-r-lg -ml-4">
            <div className="pl-4">
              <h4 className="text-sm font-bold text-stage-400 mb-2 uppercase tracking-wider flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-stage-400" />
                Action Plan
              </h4>
              <p className="text-ink-200 leading-relaxed text-base">
                {nextSteps}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
