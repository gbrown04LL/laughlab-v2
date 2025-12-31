'use client';

import type { FullAnalysis } from '@/types';
import { LaughTimeline } from '@/components/charts/LaughTimeline';
import { formatDuration } from '@/lib/utils';

interface Page2Props {
  analysis: FullAnalysis;
}

export function Page2Timeline({ analysis }: Page2Props) {
  const { timeline } = analysis;

  // Check if timeline data is available
  const hasTimelineData = timeline?.segments && timeline.segments.length > 0;
  const hasBiggestLaugh = timeline?.biggestLaugh && timeline.biggestLaugh.description !== 'N/A';
  const hasLongestDrySpell = timeline?.longestDrySpell && timeline.longestDrySpell.description !== 'N/A';

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h2 className="section-title">
          <span>📈</span> Laugh Density Timeline
        </h2>
        <p className="text-ink-400 -mt-4 mb-6">
          See where the laughs land across your script. Higher scores mean more comedy concentrated in that section.
        </p>
      </div>

      {/* Main Chart */}
      <div className="report-section">
        {hasTimelineData ? (
          <LaughTimeline data={timeline} showGaps={true} />
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <span className="text-6xl mb-4">📊</span>
            <h3 className="text-xl font-semibold text-ink-200 mb-2">Timeline Data Unavailable</h3>
            <p className="text-ink-400 max-w-md">
              The laugh density timeline couldn't be generated for this analysis. This may happen with very short scripts or unusual formats.
            </p>
          </div>
        )}
        
        {/* Legend */}
        <div className="flex flex-wrap items-center gap-6 mt-6 pt-4 border-t border-ink-800 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-laugh-400" />
            <span className="text-ink-400">Laugh Score</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-emerald-500" style={{ borderStyle: 'dashed', borderWidth: '1px' }} />
            <span className="text-ink-400">Target (6+)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-red-500/20 border border-red-500/30" />
            <span className="text-ink-400">Critical Gap</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-amber-500/20 border border-amber-500/30" />
            <span className="text-ink-400">Moderate Gap</span>
          </div>
        </div>
      </div>

      {/* Key Moments */}
      {(hasBiggestLaugh || hasLongestDrySpell) && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Biggest Laugh */}
          {hasBiggestLaugh && (
            <div className="report-section border-l-4 border-emerald-500">
              <h3 className="section-subtitle text-emerald-400">🎉 Biggest Laugh</h3>
              <div className="space-y-2">
                <p className="text-ink-300">{timeline.biggestLaugh.description}</p>
                <div className="flex items-center gap-4 text-sm text-ink-500">
                  <span>Minute {timeline.biggestLaugh.minute}</span>
                  <span>•</span>
                  <span>Line {timeline.biggestLaugh.line}</span>
                </div>
            {timeline.biggestLaugh.quote && (
              <blockquote className="mt-3 p-3 bg-emerald-500/5 border-l-2 border-emerald-500 rounded-r-lg">
                <p className="text-ink-200 text-sm italic">&ldquo;{timeline.biggestLaugh.quote}&rdquo;</p>
              </blockquote>
            )}
              </div>
            </div>
          )}

          {/* Longest Dry Spell */}
          {hasLongestDrySpell && (
            <div className="report-section border-l-4 border-amber-500">
              <h3 className="section-subtitle text-amber-400">🏜️ Longest Dry Spell</h3>
              <div className="space-y-2">
                <p className="text-ink-300">{timeline.longestDrySpell.description}</p>
                <div className="flex items-center gap-4 text-sm text-ink-500">
                  <span>Around minute {timeline.longestDrySpell.minute}</span>
                  <span>•</span>
                  <span>Near line {timeline.longestDrySpell.line}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Hot Spots */}
      {timeline.hotSpots.length > 0 && (
        <div className="report-section">
          <h3 className="section-subtitle">🔥 Comedy Hot Spots</h3>
          <p className="text-ink-400 text-sm mb-4">
            These sections are firing on all cylinders. Great examples of sustained comedy.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {timeline.hotSpots.map((spot, i) => (
              <div key={i} className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="badge badge-emerald">
                    {formatDuration(spot.startMinute)} - {formatDuration(spot.endMinute)}
                  </span>
                  <span className="text-emerald-400 font-semibold">{spot.jokeCount} jokes</span>
                </div>
                <p className="text-ink-300 text-sm">{spot.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cold Spots Preview */}
      {timeline.coldSpots.length > 0 && (
        <div className="report-section">
          <h3 className="section-subtitle">❄️ Comedy Cold Spots</h3>
          <p className="text-ink-400 text-sm mb-4">
            These stretches could use more laughs. See the Gap Analysis page for detailed recommendations.
          </p>
          <div className="space-y-3">
            {timeline.coldSpots.slice(0, 3).map((spot, i) => (
              <div 
                key={i} 
                className={`p-4 rounded-xl border ${
                  spot.severity === 'critical' ? 'bg-red-500/5 border-red-500/20' :
                  spot.severity === 'moderate' ? 'bg-amber-500/5 border-amber-500/20' :
                  'bg-blue-500/5 border-blue-500/20'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`badge ${
                    spot.severity === 'critical' ? 'badge-red' :
                    spot.severity === 'moderate' ? 'badge-amber' : 'badge-laugh'
                  }`}>
                    {spot.severity.charAt(0).toUpperCase() + spot.severity.slice(1)} Gap
                  </span>
                  <span className="text-ink-400 text-sm">
                    {formatDuration(spot.durationMinutes)}
                  </span>
                </div>
                <p className="text-ink-300 text-sm">{spot.suggestion}</p>
              </div>
            ))}
          </div>
          {timeline.coldSpots.length > 3 && (
            <p className="text-center text-ink-500 text-sm mt-4">
              +{timeline.coldSpots.length - 3} more gaps identified in Gap Analysis
            </p>
          )}
        </div>
      )}
    </div>
  );
}
