'use client';

import { getScoreGradient, getScoreLabel } from '@/lib/utils';

interface ScoreGaugeProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export function ScoreGauge({ score, size = 'lg', showLabel = true }: ScoreGaugeProps) {
  const sizeConfig = {
    sm: { width: 80, stroke: 6, fontSize: 'text-2xl' },
    md: { width: 120, stroke: 8, fontSize: 'text-4xl' },
    lg: { width: 160, stroke: 10, fontSize: 'text-5xl' },
  };

  const config = sizeConfig[size];
  const radius = (config.width - config.stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const gradient = getScoreGradient(score);
  const label = getScoreLabel(score);

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: config.width, height: config.width }}>
        <svg
          width={config.width}
          height={config.width}
          className="transform -rotate-90"
        >
          {/* Background circle */}
          <circle
            cx={config.width / 2}
            cy={config.width / 2}
            r={radius}
            fill="none"
            stroke="#1e293b"
            strokeWidth={config.stroke}
          />
          {/* Progress circle */}
          <circle
            cx={config.width / 2}
            cy={config.width / 2}
            r={radius}
            fill="none"
            stroke="url(#scoreGradient)"
            strokeWidth={config.stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference - progress}
            className="transition-all duration-1000 ease-out"
          />
          <defs>
            <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={score >= 60 ? '#facc15' : '#ef4444'} />
              <stop offset="100%" stopColor={score >= 80 ? '#10b981' : score >= 60 ? '#facc15' : '#f97316'} />
            </linearGradient>
          </defs>
        </svg>
        {/* Score text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`${config.fontSize} font-bold font-display text-ink-100 animate-score-reveal`}>
            {score}
          </span>
          <span className="text-ink-500 text-xs">/100</span>
        </div>
      </div>
      {showLabel && (
        <p className={`mt-3 font-semibold ${score >= 80 ? 'text-emerald-400' : score >= 60 ? 'text-laugh-400' : 'text-amber-400'}`}>
          {label}
        </p>
      )}
    </div>
  );
}

// Simple metric display
interface MetricDisplayProps {
  value: number | string;
  label: string;
  target?: number;
  unit?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function MetricDisplay({ value, label, target, unit, size = 'md' }: MetricDisplayProps) {
  const sizeClasses = {
    sm: 'text-2xl',
    md: 'text-4xl',
    lg: 'text-5xl',
  };

  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  const isAboveTarget = target !== undefined && !isNaN(numValue) && numValue >= target;

  return (
    <div className="metric-card">
      <div className={`${sizeClasses[size]} font-bold font-display text-laugh-400`}>
        {value}
        {unit && <span className="text-lg text-ink-500 ml-1">{unit}</span>}
      </div>
      <div className="metric-label">{label}</div>
      {target !== undefined && (
        <div className={`text-xs mt-2 ${isAboveTarget ? 'text-emerald-400' : 'text-amber-400'}`}>
          {isAboveTarget ? '✓' : '○'} Target: {target}{unit}
        </div>
      )}
    </div>
  );
}
