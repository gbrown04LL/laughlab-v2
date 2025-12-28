'use client';

import { useState } from 'react';
import type { ScriptFormat } from '@/types';

interface ScriptInputProps {
  onSubmit: (script: string, format: ScriptFormat, title: string) => void;
  isLoading: boolean;
}

const FORMAT_OPTIONS: { value: ScriptFormat; label: string; icon: string }[] = [
  { value: 'auto', label: 'Auto-Detect', icon: '✨' },
  { value: 'sitcom', label: 'Sitcom', icon: '📺' },
  { value: 'feature', label: 'Feature Film', icon: '🎬' },
  { value: 'sketch', label: 'Sketch', icon: '🎭' },
  { value: 'standup', label: 'Stand-Up', icon: '🎤' },
];

const SAMPLE_SCRIPT = `INT. COFFEE SHOP - DAY

JERRY and GEORGE sit at their usual booth. George looks panicked.

GEORGE
I think I've made a terrible mistake.

JERRY
What did you do now?

GEORGE
I told my boss I speak fluent French.

JERRY
Do you speak French?

GEORGE
I took it in high school! For two years!

JERRY
That was thirty years ago.

GEORGE
It's like riding a bike. Once you learn, you never forget.

JERRY
Riding a bike doesn't require conjugating verbs in the subjunctive.

GEORGE
How hard can it be? Oui, non, baguette, croissant...

JERRY
You're listing breakfast foods.

GEORGE
French breakfast foods! I'm already halfway there.

JERRY
You're going to get fired.

GEORGE
Or... I become fluent in three days. It's called immersion.

JERRY
Where are you going to find immersion in three days?

GEORGE
I'll watch French films, eat French food, date a French woman...

JERRY
Where are you going to find a French woman?

GEORGE
There's got to be an app for that.

JERRY
"Desperate Americans seeking French tutors slash potential alibis"?

GEORGE
You mock, but desperation is the mother of invention.

JERRY
I thought necessity was the mother of invention.

GEORGE
Necessity is the father. Desperation is the mother. And panic is the weird uncle who shows up uninvited.

JERRY
This metaphor is getting away from you.

GEORGE
(standing dramatically)
By Friday, I'll be thinking in French. Dreaming in French.

JERRY
What about lying in French? Because that's what you need.

GEORGE
"Lying" is such an ugly word. I prefer "creative linguistic improvisation."

JERRY
That's not even English.

GEORGE
See? I'm already forgetting English. The French is pushing it out. Au revoir!

George exits. Jerry shakes his head.

JERRY
(to himself)
He's going to end up speaking neither.`;

export function ScriptInput({ onSubmit, isLoading }: ScriptInputProps) {
  const [script, setScript] = useState('');
  const [format, setFormat] = useState<ScriptFormat>('auto');
  const [title, setTitle] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (script.trim() && !isLoading) {
      onSubmit(script.trim(), format, title.trim() || 'Untitled Script');
    }
  };

  const handleLoadSample = () => {
    setScript(SAMPLE_SCRIPT);
    setFormat('sitcom');
    setTitle('The French Lesson');
  };

  const wordCount = script.trim().split(/\s+/).filter(Boolean).length;
  const lineCount = script.trim().split('\n').filter(Boolean).length;
  const estimatedMinutes = Math.round(lineCount / 15);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Title */}
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-ink-300 mb-2">
          Script Title <span className="text-ink-500">(optional)</span>
        </label>
        <input
          type="text"
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="My Hilarious Script"
          className="input-field"
          disabled={isLoading}
        />
      </div>

      {/* Format */}
      <div>
        <label className="block text-sm font-medium text-ink-300 mb-3">Script Format</label>
        <div className="flex flex-wrap gap-2">
          {FORMAT_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setFormat(option.value)}
              disabled={isLoading}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                format === option.value
                  ? 'bg-laugh-500 text-ink-950 shadow-lg shadow-laugh-500/20'
                  : 'bg-ink-800 text-ink-300 hover:bg-ink-700'
              } disabled:opacity-50`}
            >
              <span className="mr-1.5">{option.icon}</span>
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Script */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label htmlFor="script" className="block text-sm font-medium text-ink-300">
            Your Script
          </label>
          <button
            type="button"
            onClick={handleLoadSample}
            disabled={isLoading}
            className="text-xs text-laugh-400 hover:text-laugh-300 transition-colors"
          >
            Load sample script
          </button>
        </div>
        <textarea
          id="script"
          value={script}
          onChange={(e) => setScript(e.target.value)}
          placeholder={`Paste your comedy script here...

INT. LOCATION - TIME

CHARACTER
Dialogue goes here...`}
          className="input-field min-h-[350px] font-mono text-sm leading-relaxed"
          disabled={isLoading}
        />
        <div className="flex items-center justify-between mt-3 text-xs text-ink-500">
          <div className="flex items-center gap-4">
            <span>{lineCount.toLocaleString()} lines</span>
            <span>•</span>
            <span>{wordCount.toLocaleString()} words</span>
            {estimatedMinutes > 0 && (
              <>
                <span>•</span>
                <span>~{estimatedMinutes} min</span>
              </>
            )}
          </div>
          <span>Supports: Screenplay, dialogue, monologue</span>
        </div>
      </div>

      {/* Submit */}
      <div className="flex items-center gap-4 pt-2">
        <button
          type="submit"
          disabled={!script.trim() || isLoading}
          className="btn-primary text-base px-8 py-3.5"
        >
          {isLoading ? (
            <>
              <span className="spinner spinner-sm" />
              Analyzing...
            </>
          ) : (
            <>🔍 Analyze Script</>
          )}
        </button>
        {script.trim() && !isLoading && (
          <button
            type="button"
            onClick={() => { setScript(''); setTitle(''); }}
            className="btn-ghost text-ink-500"
          >
            Clear
          </button>
        )}
      </div>
    </form>
  );
}
