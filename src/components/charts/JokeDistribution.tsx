'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { JokeDistribution as JokeDistributionType } from '@/types';

interface JokeDistributionProps {
  data: JokeDistributionType;
  variant?: 'horizontal' | 'vertical';
}

const COMPLEXITY_CONFIG = [
  { key: 'high', label: 'High Complexity', color: '#10b981', multiplier: '3.3x' },
  { key: 'advanced', label: 'Advanced', color: '#22c55e', multiplier: '2.8x' },
  { key: 'intermediate', label: 'Intermediate', color: '#facc15', multiplier: '2.3x' },
  { key: 'standard', label: 'Standard', color: '#f97316', multiplier: '1.7x' },
  { key: 'basic', label: 'Basic', color: '#ef4444', multiplier: '1.2x' },
];

export function JokeDistribution({ data, variant = 'horizontal' }: JokeDistributionProps) {
  const chartData = COMPLEXITY_CONFIG.map((config) => ({
    name: config.label,
    count: data[config.key as keyof JokeDistributionType] || 0,
    color: config.color,
    multiplier: config.multiplier,
  }));

  const total = chartData.reduce((sum, item) => sum + item.count, 0);

  interface TooltipPayload {
    name: string;
    count: number;
    color: string;
    multiplier: string;
  }

  interface CustomTooltipProps {
    active?: boolean;
    payload?: Array<{ payload: TooltipPayload }>;
  }

  const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      const percentage = total > 0 ? ((item.count / total) * 100).toFixed(1) : 0;
      return (
        <div className="bg-ink-900 border border-ink-700 rounded-lg p-3 shadow-xl">
          <p className="font-medium text-ink-100">{item.name}</p>
          <p className="text-laugh-400 font-semibold">{item.count} jokes ({percentage}%)</p>
          <p className="text-ink-500 text-xs mt-1">Weight: {item.multiplier}</p>
        </div>
      );
    }
    return null;
  };

  if (variant === 'vertical') {
    return (
      <div className="space-y-3">
        {chartData.map((item) => {
          const percentage = total > 0 ? (item.count / total) * 100 : 0;
          return (
            <div key={item.name} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-ink-300">{item.name}</span>
                <span className="text-ink-400">{item.count} ({percentage.toFixed(0)}%)</span>
              </div>
              <div className="h-2 bg-ink-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500 animate-bar-grow origin-left"
                  style={{ 
                    width: `${percentage}%`,
                    backgroundColor: item.color,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="h-[250px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 5, right: 20, left: 80, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} horizontal={false} />
          <XAxis type="number" stroke="#64748b" tick={{ fill: '#64748b', fontSize: 12 }} />
          <YAxis 
            type="category" 
            dataKey="name" 
            stroke="#64748b" 
            tick={{ fill: '#94a3b8', fontSize: 12 }}
            width={75}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="count" radius={[0, 4, 4, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
