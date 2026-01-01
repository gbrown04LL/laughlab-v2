'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
} from 'recharts';
import type { TimelineData, TimelineSegment } from '@/types';

interface LaughTimelineProps {
  data: TimelineData;
  showGaps?: boolean;
}

export function LaughTimeline({ data, showGaps = true }: LaughTimelineProps) {
  const { segments, coldSpots } = data;

  // Format data for recharts
  const chartData = segments.map((segment) => ({
    name: `${segment.startMinute.toFixed(0)}m`,
    minute: segment.startMinute,
    laughScore: segment.laughScore,
    jokes: segment.jokeCount,
    type: segment.dominantType,
    label: segment.dominantType === 'punchline' ? 'Punchline Peak' : segment.dominantType === 'callback' ? 'Callback' : null
  }));

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900/95 backdrop-blur-lg border border-laugh-500/30 rounded-xl px-4 py-3 shadow-2xl">
          <p className="text-laugh-400 font-bold text-sm mb-1">Minute {data.minute}</p>
          <p className="text-white text-lg font-bold">
            {data.laughScore} laughs
          </p>
          {data.label && (
            <p className="text-laugh-300 text-xs mt-2 flex items-center gap-1">
              <span className="text-laugh-400">✨</span>
              {data.label}
            </p>
          )}
          <p className="text-ink-400 text-xs mt-1">
            {data.jokes} joke{data.jokes !== 1 ? 's' : ''}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="chart-container">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
        >
          <defs>
            <linearGradient id="laughGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#facc15" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#facc15" stopOpacity={0} />
            </linearGradient>
          </defs>
          
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
          
          <XAxis
            dataKey="name"
            stroke="#64748b"
            tick={{ fill: '#64748b', fontSize: 12 }}
            axisLine={{ stroke: '#334155' }}
          />
          
          <YAxis
            domain={[0, 10]}
            stroke="#64748b"
            tick={{ fill: '#64748b', fontSize: 12 }}
            axisLine={{ stroke: '#334155' }}
            ticks={[0, 2, 4, 6, 8, 10]}
          />
          
          <Tooltip content={<CustomTooltip />} />
          
          {/* Cold spots (gaps) as reference areas */}
          {showGaps && coldSpots.map((gap, i) => (
            <ReferenceArea
              key={i}
              x1={`${gap.startMinute.toFixed(0)}m`}
              x2={`${gap.endMinute.toFixed(0)}m`}
              fill={gap.severity === 'critical' ? '#ef4444' : gap.severity === 'moderate' ? '#f59e0b' : '#3b82f6'}
              fillOpacity={0.1}
              stroke={gap.severity === 'critical' ? '#ef4444' : gap.severity === 'moderate' ? '#f59e0b' : '#3b82f6'}
              strokeOpacity={0.3}
            />
          ))}
          
          {/* Target line */}
          <ReferenceLine
            y={6}
            stroke="#22c55e"
            strokeDasharray="5 5"
            strokeOpacity={0.5}
            label={{ value: 'Target', fill: '#22c55e', fontSize: 10, position: 'right' }}
          />
          
          <Area
            type="monotone"
            dataKey="laughScore"
            stroke="#facc15"
            strokeWidth={2}
            fill="url(#laughGradient)"
            dot={{ fill: '#facc15', strokeWidth: 0, r: 4 }}
            activeDot={{ fill: '#fde047', strokeWidth: 0, r: 6 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
