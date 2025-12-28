'use client';

import { useState, useEffect } from 'react';

const LOADING_MESSAGES = [
  'Reading your script...',
  'Identifying jokes and punchlines...',
  'Analyzing comedic timing...',
  'Measuring laugh density...',
  'Checking for callbacks...',
  'Evaluating character voices...',
  'Finding comedy gaps...',
  'Generating punch-up suggestions...',
  'Calculating your comedy score...',
];

export function LoadingAnalysis() {
  const [messageIndex, setMessageIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const messageInterval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 2000);

    const progressInterval = setInterval(() => {
      setProgress((prev) => Math.min(prev + Math.random() * 8, 95));
    }, 500);

    return () => {
      clearInterval(messageInterval);
      clearInterval(progressInterval);
    };
  }, []);

  return (
    <div className="card p-12 text-center animate-fade-in">
      {/* Animated icon */}
      <div className="flex justify-center mb-8">
        <div className="relative">
          <span className="text-6xl animate-bounce">🎭</span>
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-16 h-2 bg-ink-800 rounded-full blur-sm" />
        </div>
      </div>

      {/* Progress bar */}
      <div className="max-w-md mx-auto mb-6">
        <div className="h-2 bg-ink-800 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-laugh-500 to-stage-500 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-right text-xs text-ink-500 mt-1">{Math.round(progress)}%</p>
      </div>

      {/* Title */}
      <h3 className="text-xl font-display font-semibold text-ink-100 mb-2">
        Analyzing Your Script
      </h3>
      
      {/* Current step */}
      <p className="text-ink-400 h-6 transition-all">
        {LOADING_MESSAGES[messageIndex]}
      </p>

      {/* Steps indicator */}
      <div className="flex justify-center gap-1.5 mt-8">
        {LOADING_MESSAGES.slice(0, 7).map((_, i) => (
          <div
            key={i}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              i <= messageIndex % 7 ? 'bg-laugh-400' : 'bg-ink-700'
            }`}
          />
        ))}
      </div>

      {/* Pro tip */}
      <div className="mt-10 p-4 bg-ink-800/50 rounded-xl max-w-md mx-auto">
        <p className="text-xs text-ink-400">
          <span className="text-laugh-400 font-medium">Pro Tip:</span>{' '}
          Great comedy often comes from subverting expectations. Set up one thing, deliver another.
        </p>
      </div>
    </div>
  );
}
