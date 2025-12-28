'use client';

import type { FullAnalysis } from '@/types';
import { CharacterChart, CharacterBalance } from '@/components/charts/CharacterChart';

interface Page6Props {
  analysis: FullAnalysis;
}

export function Page6Characters({ analysis }: Page6Props) {
  const { characters, callbacks } = analysis;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h2 className="section-title">
          <span>🎭</span> Character & Callback Analysis
        </h2>
        <p className="text-ink-400 -mt-4 mb-6">
          How your characters contribute to the comedy and opportunities for running gags.
        </p>
      </div>

      {/* Character Distribution */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="report-section">
          <h3 className="section-subtitle">Joke Distribution by Character</h3>
          <CharacterChart data={characters} variant="bar" />
        </div>

        <div className="report-section">
          <h3 className="section-subtitle">Character Balance</h3>
          <CharacterBalance data={characters.balance} />
          
          <div className="mt-6 space-y-3">
            {characters.characters.slice(0, 4).map((char, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-ink-800/50 rounded-lg">
                <div>
                  <span className="font-medium text-ink-100">{char.name}</span>
                  <span className="text-ink-500 text-sm ml-2">({char.primaryStyle})</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-ink-400 text-sm">{char.jokeCount} jokes</span>
                  <span className="text-laugh-400 font-semibold">{char.jokePercentage.toFixed(0)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Character Profiles */}
      <div className="report-section">
        <h3 className="section-subtitle">Character Comedy Profiles</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          {characters.characters.map((char, i) => (
            <div key={i} className="p-4 bg-ink-800/30 rounded-xl border border-ink-700">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-ink-100">{char.name}</h4>
                <span className="badge badge-laugh">{char.jokePercentage.toFixed(0)}% of jokes</span>
              </div>
              <div className="space-y-2 text-sm">
                <p className="text-ink-400">
                  <span className="text-ink-500">Style:</span> {char.primaryStyle}
                </p>
                <p className="text-ink-400">
                  <span className="text-ink-500">Voice Consistency:</span>{' '}
                  <span className={char.voiceConsistency >= 80 ? 'text-emerald-400' : char.voiceConsistency >= 60 ? 'text-laugh-400' : 'text-amber-400'}>
                    {char.voiceConsistency}/100
                  </span>
                </p>
                <p className="text-ink-300 mt-2">
                  <span className="text-ink-500">Best Moment:</span> {char.strongestMoment}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Character Interactions */}
      {characters.interactions.length > 0 && (
        <div className="report-section">
          <h3 className="section-subtitle">Comedy Chemistry</h3>
          <p className="text-ink-400 text-sm mb-4">
            How well character pairings generate laughs together.
          </p>
          <div className="space-y-3">
            {characters.interactions.map((interaction, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-ink-800/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="font-medium text-ink-100">{interaction.character1}</span>
                  <span className="text-ink-600">↔</span>
                  <span className="font-medium text-ink-100">{interaction.character2}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-ink-400 text-sm">{interaction.jokeCount} jokes together</span>
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-2 bg-ink-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-laugh-400 rounded-full"
                        style={{ width: `${interaction.chemistry}%` }}
                      />
                    </div>
                    <span className="text-laugh-400 text-sm font-medium">{interaction.chemistry}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Callbacks Section */}
      <div className="report-section">
        <h3 className="section-subtitle flex items-center gap-2">
          <span>🔄</span> Callback Analysis
        </h3>
        
        <div className="grid sm:grid-cols-3 gap-4 mb-6">
          <div className="p-4 bg-ink-800/50 rounded-xl text-center">
            <div className="text-3xl font-bold text-laugh-400">{callbacks.existingCallbacks.length}</div>
            <div className="text-xs text-ink-400 mt-1">Existing Callbacks</div>
          </div>
          <div className="p-4 bg-ink-800/50 rounded-xl text-center">
            <div className="text-3xl font-bold text-stage-400">{callbacks.missedOpportunities.length}</div>
            <div className="text-xs text-ink-400 mt-1">Opportunities</div>
          </div>
          <div className="p-4 bg-ink-800/50 rounded-xl text-center">
            <div className={`text-3xl font-bold ${callbacks.callbackScore >= 70 ? 'text-emerald-400' : callbacks.callbackScore >= 40 ? 'text-amber-400' : 'text-red-400'}`}>
              {callbacks.callbackScore}
            </div>
            <div className="text-xs text-ink-400 mt-1">Callback Score</div>
          </div>
        </div>

        {/* Existing Callbacks */}
        {callbacks.existingCallbacks.length > 0 && (
          <div className="mb-6">
            <h4 className="text-sm font-medium text-ink-300 mb-3">Found Callbacks</h4>
            <div className="space-y-3">
              {callbacks.existingCallbacks.map((cb, i) => (
                <div key={i} className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-lg">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <span className="text-xs text-ink-500">Setup (Line {cb.setupLine})</span>
                      <p className="text-ink-300 text-sm mt-1">&ldquo;{cb.setupQuote}&rdquo;</p>
                    </div>
                    <div>
                      <span className="text-xs text-ink-500">Payoff (Line {cb.payoffLine})</span>
                      <p className="text-ink-300 text-sm mt-1">&ldquo;{cb.payoffQuote}&rdquo;</p>
                    </div>
                  </div>
                  <div className="mt-2">
                    <span className={`badge ${cb.effectiveness === 'strong' ? 'badge-emerald' : cb.effectiveness === 'medium' ? 'badge-laugh' : 'badge-amber'}`}>
                      {cb.effectiveness} callback
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Missed Opportunities */}
        {callbacks.missedOpportunities.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-ink-300 mb-3">Callback Opportunities</h4>
            <div className="space-y-3">
              {callbacks.missedOpportunities.map((opp, i) => (
                <div key={i} className="p-4 bg-stage-500/5 border border-stage-500/20 rounded-lg">
                  <div className="mb-3">
                    <span className="text-xs text-ink-500">Setup (Line {opp.setupLine})</span>
                    <p className="text-ink-300 text-sm mt-1">&ldquo;{opp.setupQuote}&rdquo;</p>
                  </div>
                  <div className="p-3 bg-ink-800/50 rounded">
                    <span className="text-xs text-stage-400">💡 Suggested Callback</span>
                    <p className="text-ink-200 text-sm mt-1">&ldquo;{opp.suggestedPayoff}&rdquo;</p>
                    <p className="text-ink-500 text-xs mt-1">Could work around: {opp.suggestedPayoffLocation}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommendations */}
        {callbacks.recommendations.length > 0 && (
          <div className="mt-6 p-4 bg-ink-800/30 rounded-xl">
            <h4 className="text-sm font-medium text-laugh-400 mb-2">Callback Tips</h4>
            <ul className="space-y-1">
              {callbacks.recommendations.map((rec, i) => (
                <li key={i} className="text-ink-400 text-sm flex items-start gap-2">
                  <span className="text-laugh-400">•</span>
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Character Recommendations */}
      {characters.recommendations.length > 0 && (
        <div className="report-section bg-ink-800/30">
          <h3 className="section-subtitle">Character Recommendations</h3>
          <ul className="space-y-2">
            {characters.recommendations.map((rec, i) => (
              <li key={i} className="flex items-start gap-2 text-ink-300">
                <span className="text-laugh-400">→</span>
                {rec}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
