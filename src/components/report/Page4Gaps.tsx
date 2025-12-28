'use client';

import type { FullAnalysis, Gap, GapRecommendation } from '@/types';
import { formatDuration, cn } from '@/lib/utils';

interface Page4Props {
  analysis: FullAnalysis;
}

export function Page4Gaps({ analysis }: Page4Props) {
  const { gaps } = analysis;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h2 className="section-title">
          <span>🎯</span> Gap Analysis
        </h2>
        <p className="text-ink-400 -mt-4 mb-6">
          Comedy gaps are stretches without laughs. Here&apos;s where to add material.
        </p>
      </div>

      {/* Gap Score Overview */}
      <div className="report-section">
        <div className="grid sm:grid-cols-4 gap-6">
          <div className="text-center p-4 bg-ink-800/50 rounded-xl">
            <div className={cn(
              'text-4xl font-bold font-display',
              gaps.gapScore >= 80 ? 'text-emerald-400' :
              gaps.gapScore >= 60 ? 'text-laugh-400' : 'text-amber-400'
            )}>
              {gaps.gapScore}
            </div>
            <div className="text-xs text-ink-400 mt-1">Gap Score</div>
            <div className="text-xs text-ink-500">(higher = fewer gaps)</div>
          </div>
          <div className="text-center p-4 bg-ink-800/50 rounded-xl">
            <div className="text-4xl font-bold font-display text-ink-100">{gaps.gaps.length}</div>
            <div className="text-xs text-ink-400 mt-1">Total Gaps</div>
          </div>
          <div className="text-center p-4 bg-ink-800/50 rounded-xl">
            <div className="text-4xl font-bold font-display text-ink-100">
              {formatDuration(gaps.averageGapDuration)}
            </div>
            <div className="text-xs text-ink-400 mt-1">Avg Gap Duration</div>
          </div>
          <div className="text-center p-4 bg-ink-800/50 rounded-xl">
            <div className="text-4xl font-bold font-display text-red-400">
              {formatDuration(gaps.longestGap)}
            </div>
            <div className="text-xs text-ink-400 mt-1">Longest Gap</div>
          </div>
        </div>
      </div>

      {/* Retention Cliff Warning */}
      {gaps.retentionCliff && (
        <div className="report-section bg-red-500/5 border-red-500/30">
          <div className="flex items-start gap-4">
            <span className="text-3xl">⚠️</span>
            <div>
              <h3 className="text-lg font-semibold text-red-400 mb-2">Retention Cliff Detected</h3>
              <p className="text-ink-300 text-sm mb-3">
                There&apos;s a significant comedy gap in the final third of your script. 
                Audiences are most likely to disengage here.
              </p>
              <div className="flex items-center gap-4 text-sm text-ink-400">
                <span>Lines {gaps.retentionCliff.startLine} - {gaps.retentionCliff.endLine}</span>
                <span>•</span>
                <span>{formatDuration(gaps.retentionCliff.durationMinutes)} without laughs</span>
              </div>
              <p className="mt-3 text-ink-200 text-sm">
                <strong>Context:</strong> {gaps.retentionCliff.context}
              </p>
              <p className="mt-2 p-3 bg-red-500/10 rounded-lg text-sm text-red-200">
                <strong>Suggestion:</strong> {gaps.retentionCliff.suggestion}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* All Gaps */}
      <div className="report-section">
        <h3 className="section-subtitle">All Comedy Gaps (by priority)</h3>
        <div className="space-y-4">
          {gaps.gaps
            .sort((a, b) => a.priority - b.priority)
            .map((gap, i) => (
              <GapCard key={gap.id} gap={gap} index={i} />
            ))}
        </div>
        {gaps.gaps.length === 0 && (
          <div className="text-center py-12 text-ink-500">
            <span className="text-4xl mb-4 block">🎉</span>
            <p>No significant comedy gaps detected! Great pacing.</p>
          </div>
        )}
      </div>

      {/* Recommendations */}
      {gaps.recommendations.length > 0 && (
        <div className="report-section">
          <h3 className="section-subtitle">Specific Recommendations</h3>
          <div className="space-y-4">
            {gaps.recommendations.map((rec, i) => (
              <RecommendationCard key={i} recommendation={rec} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function GapCard({ gap, index }: { gap: Gap; index: number }) {
  const severityStyles = {
    critical: 'gap-critical',
    moderate: 'gap-moderate',
    minor: 'gap-minor',
  };

  const severityBadge = {
    critical: 'badge-red',
    moderate: 'badge-amber',
    minor: 'badge-laugh',
  };

  return (
    <div 
      className={cn(severityStyles[gap.severity], 'animate-slide-up')}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex items-center gap-3">
          <span className="text-ink-500 font-mono text-sm">#{gap.priority}</span>
          <span className={cn('badge', severityBadge[gap.severity])}>
            {gap.severity}
          </span>
          {gap.isRetentionCliff && (
            <span className="badge badge-red">Retention Cliff</span>
          )}
        </div>
        <span className="text-ink-400 text-sm">
          {formatDuration(gap.durationMinutes)}
        </span>
      </div>

      <div className="mb-3">
        <p className="text-ink-200 text-sm">
          <strong>Lines {gap.startLine} - {gap.endLine}</strong> ({gap.durationLines} lines)
        </p>
        <p className="text-ink-400 text-sm mt-1">{gap.context}</p>
      </div>

      <div className="p-3 bg-ink-800/50 rounded-lg">
        <p className="text-sm">
          <span className="text-laugh-400 font-medium">💡 Suggestion: </span>
          <span className="text-ink-300">{gap.suggestion}</span>
        </p>
      </div>
    </div>
  );
}

function RecommendationCard({ recommendation }: { recommendation: GapRecommendation }) {
  const typeLabels = {
    'add-joke': '➕ Add Joke',
    'add-callback': '🔄 Add Callback',
    'add-character-moment': '🎭 Character Moment',
    'restructure': '🔧 Restructure',
  };

  return (
    <div className="p-4 bg-ink-800/30 rounded-xl border border-ink-700">
      <div className="flex items-center gap-2 mb-2">
        <span className="badge badge-stage">{typeLabels[recommendation.type]}</span>
        <span className="text-ink-500 text-xs">Gap {recommendation.gapId}</span>
      </div>
      <p className="text-ink-200 text-sm mb-2">{recommendation.recommendation}</p>
      {recommendation.exampleLine && (
        <div className="p-2 bg-stage-500/10 border border-stage-500/20 rounded">
          <p className="text-sm text-ink-300 italic">&ldquo;{recommendation.exampleLine}&rdquo;</p>
        </div>
      )}
    </div>
  );
}
