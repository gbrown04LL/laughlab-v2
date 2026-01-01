'use client';

import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Cell,
} from 'recharts';
import type { CharacterAnalysis } from '@/types';

interface CharacterChartProps {
  data: CharacterAnalysis;
  variant?: 'radar' | 'bar';
}

const COLORS = ['#facc15', '#a855f7', '#22c55e', '#3b82f6', '#ef4444', '#ec4899'];

export function CharacterChart({ data, variant = 'bar' }: CharacterChartProps) {
  const { characters } = data;

  if (variant === 'radar') {
    const radarData = characters.map((char) => ({
      name: char.name,
      jokes: char.jokePercentage,
      voice: char.voiceConsistency,
      fullMark: 100,
    }));

    return (
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={radarData}>
            <PolarGrid stroke="#334155" />
            <PolarAngleAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} />
            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 10 }} />
            <Radar
              name="Joke Share"
              dataKey="jokes"
              stroke="#facc15"
              fill="#facc15"
              fillOpacity={0.3}
            />
            <Radar
              name="Voice Consistency"
              dataKey="voice"
              stroke="#a855f7"
              fill="#a855f7"
              fillOpacity={0.3}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#0f172a',
                border: '1px solid #334155',
                borderRadius: '8px',
              }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // Bar chart variant
  const barData = characters.map((char) => ({
    name: char.name,
    jokes: char.jokeCount,
    percentage: char.jokePercentage,
    style: char.primaryStyle,
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-ink-900 border border-ink-700 rounded-lg p-3 shadow-xl">
          <p className="font-medium text-ink-100">{item.name}</p>
          <p className="text-laugh-400 font-semibold">{item.jokes} jokes ({item.percentage.toFixed(0)}%)</p>
          <p className="text-ink-500 text-xs mt-1">Style: {item.style}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="h-[250px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={barData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
          <XAxis dataKey="name" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 12 }} />
          <YAxis stroke="#64748b" tick={{ fill: '#64748b', fontSize: 12 }} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="jokes" radius={[4, 4, 0, 0]}>
            {barData.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// Character balance visual
export function CharacterBalance({ data }: { data: CharacterAnalysis['balance'] }) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'balanced': return 'text-emerald-400';
      case 'slightly-unbalanced': return 'text-amber-400';
      case 'unbalanced': return 'text-red-400';
      default: return 'text-ink-400';
    }
  };

  return (
    <div className="p-4 bg-ink-800/50 rounded-xl">
      <div className="flex items-center justify-between mb-3">
        <span className="text-ink-300 text-sm">Character Balance</span>
        <span className={`font-semibold ${getStatusColor(data.status)}`}>
          {data.score}/100
        </span>
      </div>
      <div className="h-2 bg-ink-700 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${data.score}%`,
            backgroundColor: data.status === 'balanced' ? '#10b981' : data.status === 'slightly-unbalanced' ? '#f59e0b' : '#ef4444',
          }}
        />
      </div>
      {data.underutilized.length > 0 && (
        <p className="text-xs text-ink-500 mt-2">
          Underutilized: {data.underutilized.join(', ')}
        </p>
      )}
    </div>
  );
}
