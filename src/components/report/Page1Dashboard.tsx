'use client';

import type { FullAnalysis } from '@/types';
import { FORMAT_TARGETS } from '@/types';
import { ScoreGauge, MetricDisplay } from '@/components/charts/ScoreGauge';
import { JokeDistribution } from '@/components/charts/JokeDistribution';

interface Page1Props {
  analysis: FullAnalysis;
}

export function Page1Dashboard({ analysis }: Page1Props) {
  const { metrics, format, scriptStats, summary, coachNote } = analysis;
  const formatInfo = FORMAT_TARGETS[format];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-ink-800/50 rounded-full mb-4">
          <span className="text-lg">{format === 'sitcom' ? '📺' : format === 'feature' ? '🎬' : format === 'sketch' ? '🎭' : '🎤'}</span>
          <span className="text-ink-300 text-sm">{formatInfo.label}</span>
          <span className="text-ink-600">•</span>
          <span className="text-ink-400 text-sm">~{scriptStats.estimatedRuntime} min</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-display font-bold text-ink-100 mb-2">
          {analysis.title}
        </h1>
        <p className="text-ink-400 max-w-2xl mx-auto">{summary}</p>
      </div>

      {/* Main Score */}
      <div className="report-section flex flex-col items-center py-10">
        <ScoreGauge score={metrics.overallScore} size="lg" />
        <p className="mt-6 text-ink-300 text-center max-w-md">
          {coachNote}
        </p>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricDisplay
          value={metrics.laughsPerMinute.toFixed(1)}
          label="Laughs Per Minute"
          target={formatInfo.lpm}
          unit=" LPM"
          size="md"
        />
        <MetricDisplay
          value={metrics.linesPerJoke.toFixed(1)}
          label="Lines Per Joke"
          target={formatInfo.lpj}
          unit=" lines"
          size="md"
        />
        <MetricDisplay
          value={metrics.totalJokes}
          label="Total Jokes"
          size="md"
        />
        <MetricDisplay
          value={`${metrics.callbackFrequency}%`}
          label="Callback Frequency"
          size="md"
        />
      </div>

      {/* Secondary Metrics */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Format Comparison */}
        <div className="report-section">
          <h3 className="section-subtitle flex items-center gap-2">
            📊 Format Comparison
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-ink-800/50 rounded-lg">
              <span className="text-ink-300">Laughs Per Minute</span>
              <div className="flex items-center gap-3">
                <span className="text-ink-100 font-semibold">{metrics.laughsPerMinute.toFixed(1)}</span>
                <span className={`badge ${
                  metrics.formatComparison.lpmStatus === 'above' ? 'badge-emerald' :
                  metrics.formatComparison.lpmStatus === 'on-target' ? 'badge-laugh' : 'badge-amber'
                }`}>
                  {metrics.formatComparison.lpmStatus === 'above' ? '↑ Above' :
                   metrics.formatComparison.lpmStatus === 'on-target' ? '✓ On Target' : '↓ Below'}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 bg-ink-800/50 rounded-lg">
              <span className="text-ink-300">Lines Per Joke</span>
              <div className="flex items-center gap-3">
                <span className="text-ink-100 font-semibold">{metrics.linesPerJoke.toFixed(1)}</span>
                <span className={`badge ${
                  metrics.formatComparison.lpjStatus === 'above' ? 'badge-amber' :
                  metrics.formatComparison.lpjStatus === 'on-target' ? 'badge-laugh' : 'badge-emerald'
                }`}>
                  {metrics.formatComparison.lpjStatus === 'above' ? '↑ Longer' :
                   metrics.formatComparison.lpjStatus === 'on-target' ? '✓ On Target' : '↓ Tighter'}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 bg-ink-800/50 rounded-lg">
              <span className="text-ink-300">Industry Percentile</span>
              <span className="text-laugh-400 font-semibold">Top {100 - metrics.formatComparison.industryPercentile}%</span>
            </div>
          </div>
        </div>

        {/* Joke Distribution */}
        <div className="report-section">
          <h3 className="section-subtitle flex items-center gap-2">
            🎯 Joke Complexity Mix
          </h3>
          <JokeDistribution data={metrics.jokeDistribution} variant="vertical" />
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-ink-800/30 rounded-xl text-center">
          <div className="text-2xl font-bold text-emerald-400">{metrics.peakLaughMoments}</div>
          <div className="text-xs text-ink-400 mt-1">Peak Laugh Moments</div>
        </div>
        <div className="p-4 bg-ink-800/30 rounded-xl text-center">
          <div className="text-2xl font-bold text-stage-400">{metrics.sustainedLaughSequences}</div>
          <div className="text-xs text-ink-400 mt-1">Sustained Sequences</div>
        </div>
        <div className="p-4 bg-ink-800/30 rounded-xl text-center">
          <div className="text-2xl font-bold text-laugh-400">{scriptStats.sceneCount}</div>
          <div className="text-xs text-ink-400 mt-1">Scenes</div>
        </div>
        <div className="p-4 bg-ink-800/30 rounded-xl text-center">
          <div className="text-2xl font-bold text-blue-400">{scriptStats.characterCount}</div>
          <div className="text-xs text-ink-400 mt-1">Characters</div>
        </div>
      </div>
    </div>
  );
}
