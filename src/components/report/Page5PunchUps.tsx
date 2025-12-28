'use client';

import type { FullAnalysis, PunchUp, PunchUpAlternative } from '@/types';
import { cn } from '@/lib/utils';

interface Page5Props {
  analysis: FullAnalysis;
}

export function Page5PunchUps({ analysis }: Page5Props) {
  const { punchUps } = analysis;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h2 className="section-title">
          <span>⚡</span> Punch-Up Workshop
        </h2>
        <p className="text-ink-400 -mt-4 mb-6">
          Specific line rewrites to make your jokes land harder. Each suggestion includes multiple alternatives.
        </p>
      </div>

      {/* Overall Tone */}
      {punchUps.overallTone && (
        <div className="report-section bg-stage-500/5 border-stage-500/20">
          <h3 className="section-subtitle text-stage-400">🎨 Your Comedy Voice</h3>
          <p className="text-ink-300">{punchUps.overallTone}</p>
          {punchUps.styleNotes.length > 0 && (
            <ul className="mt-4 space-y-2">
              {punchUps.styleNotes.map((note, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-ink-400">
                  <span className="text-stage-400">•</span>
                  {note}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Punch-Ups */}
      <div className="space-y-6">
        {punchUps.punchUps.map((punchUp, i) => (
          <PunchUpCard key={punchUp.id} punchUp={punchUp} index={i} />
        ))}
      </div>

      {punchUps.punchUps.length === 0 && (
        <div className="report-section text-center py-12">
          <span className="text-4xl mb-4 block">✨</span>
          <p className="text-ink-400">Your jokes are landing well! No major punch-ups needed.</p>
        </div>
      )}

      {/* Tips */}
      <div className="report-section bg-ink-800/30">
        <h3 className="section-subtitle">💡 Punch-Up Principles</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          {[
            { title: 'Be Specific', desc: 'Replace vague words with concrete, vivid details.' },
            { title: 'Cut the Fat', desc: 'Remove any word that doesn\'t earn its place.' },
            { title: 'End on the Funny', desc: 'Put the punchline at the very end of the line.' },
            { title: 'Heighten & Escalate', desc: 'If something\'s funny, push it further.' },
          ].map((tip, i) => (
            <div key={i} className="p-3 bg-ink-900/50 rounded-lg">
              <h4 className="font-medium text-laugh-400 text-sm mb-1">{tip.title}</h4>
              <p className="text-ink-400 text-xs">{tip.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PunchUpCard({ punchUp, index }: { punchUp: PunchUp; index: number }) {
  const priorityStyles = {
    high: 'border-l-red-500',
    medium: 'border-l-amber-500',
    low: 'border-l-blue-500',
  };

  const priorityBadge = {
    high: 'badge-red',
    medium: 'badge-amber',
    low: 'badge-laugh',
  };

  const styleLabels: Record<PunchUpAlternative['style'], { label: string; color: string }> = {
    sharper: { label: 'Sharper', color: 'text-red-400' },
    broader: { label: 'Broader', color: 'text-amber-400' },
    subtler: { label: 'Subtler', color: 'text-blue-400' },
    callback: { label: 'Callback', color: 'text-stage-400' },
    tag: { label: 'Tag', color: 'text-emerald-400' },
  };

  return (
    <div 
      className={cn('punchup-card border-l-4', priorityStyles[punchUp.priority], 'animate-slide-up')}
      style={{ animationDelay: `${index * 100}ms` }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <span className="badge badge-stage">#{index + 1}</span>
          <span className={cn('badge', priorityBadge[punchUp.priority])}>
            {punchUp.priority} priority
          </span>
        </div>
        <div className="text-right text-sm text-ink-500">
          {punchUp.character && <span className="text-ink-400">{punchUp.character}</span>}
          {punchUp.lineNumber && <span className="ml-2">Line {punchUp.lineNumber}</span>}
        </div>
      </div>

      {/* Original Line */}
      <div className="mb-4">
        <span className="text-xs uppercase tracking-wider text-ink-500 font-medium">Original</span>
        <div className="mt-2 p-4 bg-ink-900 rounded-lg border border-ink-800">
          <p className="text-ink-300 font-mono text-sm">&ldquo;{punchUp.originalLine}&rdquo;</p>
        </div>
        <p className="mt-2 text-xs text-amber-400/80">{punchUp.issue}</p>
      </div>

      {/* Alternatives */}
      <div className="mb-4">
        <span className="text-xs uppercase tracking-wider text-stage-400 font-medium">Alternatives</span>
        <div className="mt-2 space-y-3">
          {punchUp.alternatives.map((alt, j) => (
            <div 
              key={j} 
              className="p-4 bg-stage-500/5 border border-stage-500/20 rounded-lg hover:border-stage-500/40 transition-all"
            >
              <div className="flex items-start gap-3">
                <span className="text-stage-400 mt-0.5">→</span>
                <div className="flex-1">
                  <p className="text-ink-100 text-sm mb-2">&ldquo;{alt.text}&rdquo;</p>
                  <div className="flex items-center gap-3">
                    <span className={cn('text-xs font-medium', styleLabels[alt.style].color)}>
                      {styleLabels[alt.style].label}
                    </span>
                    <span className="text-xs text-ink-500">{alt.whyItWorks}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Explanation */}
      <div className="p-3 bg-ink-800/50 rounded-lg">
        <p className="text-sm text-ink-400">
          <span className="text-laugh-400 font-medium">💡 </span>
          {punchUp.explanation}
        </p>
      </div>
    </div>
  );
}
