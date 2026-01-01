'use client';

import type { FullAnalysis, FeedbackItem, QuickWin } from '@/types';
import { cn } from '@/lib/utils';
import { MentorFeedbackCard } from './MentorFeedbackCard';

interface Page3Props {
  analysis: FullAnalysis;
}

export function Page3Feedback({ analysis }: Page3Props) {
  const { feedback, coachNote } = analysis;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h2 className="section-title">
          <span>💬</span> Strengths & Opportunities
        </h2>
        <p className="text-ink-400 -mt-4 mb-6">
          What&apos;s working well and where you can level up.
        </p>
      </div>

      {/* Mentor Feedback Card */}
      {coachNote && (
        <MentorFeedbackCard feedback={coachNote} />
      )}

      {/* Strengths */}
      <div className="report-section">
        <h3 className="section-subtitle flex items-center gap-2">
          <span className="text-emerald-400">✓</span> What&apos;s Working
        </h3>
        <div className="space-y-4">
          {feedback.strengths.map((item, i) => (
            <StrengthCard key={i} item={item} index={i} />
          ))}
        </div>
      </div>

      {/* Opportunities */}
      <div className="report-section">
        <h3 className="section-subtitle flex items-center gap-2">
          <span className="text-amber-400">◉</span> Opportunities to Strengthen
        </h3>
        <div className="space-y-4">
          {feedback.opportunities.map((item, i) => (
            <OpportunityCard key={i} item={item} index={i} />
          ))}
        </div>
      </div>

      {/* Quick Wins */}
      {feedback.quickWins.length > 0 && (
        <div className="report-section bg-stage-500/5 border-stage-500/20">
          <h3 className="section-subtitle flex items-center gap-2">
            <span className="text-stage-400">⚡</span> Quick Wins
          </h3>
          <p className="text-ink-400 text-sm mb-4">
            Fast improvements you can make right now.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {feedback.quickWins.map((win, i) => (
              <QuickWinCard key={i} win={win} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StrengthCard({ item, index }: { item: FeedbackItem; index: number }) {
  return (
    <div 
      className="feedback-strength animate-slide-up"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <div className="flex items-start justify-between gap-4 mb-2">
        <h4 className="font-semibold text-ink-100">{item.title}</h4>
        <span className={cn(
          'badge text-xs',
          item.impact === 'high' ? 'badge-emerald' :
          item.impact === 'medium' ? 'badge-laugh' : 'badge-stage'
        )}>
          {item.impact} impact
        </span>
      </div>
      <p className="text-ink-300 text-sm">{item.description}</p>
      {item.quote && (
        <blockquote className="mt-3 p-3 bg-emerald-500/5 border-l-2 border-emerald-500/50 rounded-r">
          <p className="text-ink-200 text-sm italic">&ldquo;{item.quote}&rdquo;</p>
          {item.lineReference && (
            <cite className="text-xs text-ink-500 mt-1 block">— Line {item.lineReference}</cite>
          )}
        </blockquote>
      )}
    </div>
  );
}

function OpportunityCard({ item, index }: { item: FeedbackItem; index: number }) {
  return (
    <div 
      className="feedback-opportunity animate-slide-up"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <div className="flex items-start justify-between gap-4 mb-2">
        <h4 className="font-semibold text-ink-100">{item.title}</h4>
        <span className={cn(
          'badge text-xs',
          item.impact === 'high' ? 'badge-red' :
          item.impact === 'medium' ? 'badge-amber' : 'badge-laugh'
        )}>
          {item.impact} priority
        </span>
      </div>
      <p className="text-ink-300 text-sm">{item.description}</p>
      {item.lineReference && (
        <p className="text-xs text-amber-400/70 mt-2 font-mono">
          Reference: Line {item.lineReference}
        </p>
      )}
    </div>
  );
}

function QuickWinCard({ win }: { win: QuickWin }) {
  const difficultyColors = {
    easy: 'bg-emerald-500/20 text-emerald-400',
    medium: 'bg-amber-500/20 text-amber-400',
    hard: 'bg-red-500/20 text-red-400',
  };

  return (
    <div className="p-4 bg-ink-800/50 rounded-xl border border-ink-700 hover:border-stage-500/30 transition-all">
      <div className="flex items-center gap-2 mb-2">
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${difficultyColors[win.difficulty]}`}>
          {win.difficulty}
        </span>
      </div>
      <p className="text-ink-200 text-sm font-medium mb-1">{win.action}</p>
      <p className="text-ink-500 text-xs">{win.expectedImpact}</p>
    </div>
  );
}
