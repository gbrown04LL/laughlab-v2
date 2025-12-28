// ===========================================
// LAUGH LAB PRO - UTILITY FUNCTIONS
// ===========================================

import type { JokeComplexity, Gap, UserTier } from '@/types';

// Generate unique IDs
export function generateId(prefix: string = 'll'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Clamp a number between min and max
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

// Format duration in minutes to readable string
export function formatDuration(minutes: number): string {
  if (minutes < 1) {
    return `${Math.round(minutes * 60)}s`;
  }
  const mins = Math.floor(minutes);
  const secs = Math.round((minutes - mins) * 60);
  if (secs === 0) {
    return `${mins}m`;
  }
  return `${mins}m ${secs}s`;
}

// Get color for score
export function getScoreColor(score: number): string {
  if (score >= 80) return 'text-emerald-400';
  if (score >= 60) return 'text-laugh-400';
  if (score >= 40) return 'text-amber-400';
  return 'text-red-400';
}

// Get background color for score
export function getScoreBgColor(score: number): string {
  if (score >= 80) return 'bg-emerald-500';
  if (score >= 60) return 'bg-laugh-500';
  if (score >= 40) return 'bg-amber-500';
  return 'bg-red-500';
}

// Get gradient for score
export function getScoreGradient(score: number): string {
  if (score >= 80) return 'from-emerald-400 to-emerald-600';
  if (score >= 60) return 'from-laugh-400 to-laugh-600';
  if (score >= 40) return 'from-amber-400 to-amber-600';
  return 'from-red-400 to-red-600';
}

// Get label for score
export function getScoreLabel(score: number): string {
  if (score >= 90) return 'Outstanding!';
  if (score >= 80) return 'Excellent';
  if (score >= 70) return 'Great';
  if (score >= 60) return 'Good';
  if (score >= 50) return 'Solid';
  if (score >= 40) return 'Needs Work';
  return 'Early Draft';
}

// Get color for gap severity
export function getGapSeverityColor(severity: Gap['severity']): string {
  switch (severity) {
    case 'critical': return 'text-red-400 bg-red-500/10 border-red-500/30';
    case 'moderate': return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
    case 'minor': return 'text-blue-400 bg-blue-500/10 border-blue-500/30';
    default: return 'text-ink-400 bg-ink-500/10 border-ink-500/30';
  }
}

// Get color for joke complexity
export function getComplexityColor(complexity: JokeComplexity): string {
  switch (complexity) {
    case 'high': return 'bg-emerald-500';
    case 'advanced': return 'bg-laugh-500';
    case 'intermediate': return 'bg-amber-500';
    case 'standard': return 'bg-orange-500';
    case 'basic': return 'bg-red-500';
    default: return 'bg-ink-500';
  }
}

// Get complexity label
export function getComplexityLabel(complexity: JokeComplexity): string {
  switch (complexity) {
    case 'high': return 'High Complexity';
    case 'advanced': return 'Advanced';
    case 'intermediate': return 'Intermediate';
    case 'standard': return 'Standard';
    case 'basic': return 'Basic';
    default: return complexity;
  }
}

// Format percentage
export function formatPercentage(value: number, decimals: number = 0): string {
  return `${value.toFixed(decimals)}%`;
}

// Format number with commas
export function formatNumber(value: number): string {
  return value.toLocaleString();
}

// Truncate text
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

// Check if user can analyze (based on tier limits)
export function canAnalyze(tier: UserTier, analysesThisMonth: number): boolean {
  const limits: Record<UserTier, number> = {
    free: 2,
    starter: Infinity,
    professional: Infinity,
    enterprise: Infinity,
  };
  return analysesThisMonth < limits[tier];
}

// Get remaining analyses
export function getRemainingAnalyses(tier: UserTier, analysesThisMonth: number): number | 'unlimited' {
  if (tier !== 'free') return 'unlimited';
  return Math.max(0, 2 - analysesThisMonth);
}

// Parse Claude's JSON response, handling potential issues
export function parseClaudeResponse<T>(text: string): T {
  // Remove potential markdown formatting
  let cleaned = text.trim();
  
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.slice(3);
  }
  
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3);
  }
  
  cleaned = cleaned.trim();
  
  return JSON.parse(cleaned);
}

// Calculate estimated runtime from line count
export function estimateRuntime(lineCount: number): number {
  // Approximately 15 lines per minute for screenplay format
  return lineCount / 15;
}

// Report page configuration
export const REPORT_PAGES = [
  { number: 1, title: 'Dashboard', path: 'dashboard', icon: '📊' },
  { number: 2, title: 'Timeline', path: 'timeline', icon: '📈' },
  { number: 3, title: 'Feedback', path: 'feedback', icon: '💬' },
  { number: 4, title: 'Gap Analysis', path: 'gaps', icon: '🎯' },
  { number: 5, title: 'Punch-Ups', path: 'punchups', icon: '⚡' },
  { number: 6, title: 'Characters', path: 'characters', icon: '🎭' },
] as const;

// CN utility for conditional classnames
export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}
