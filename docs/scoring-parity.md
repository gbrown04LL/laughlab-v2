# Scoring Engine Parity (Canonical v2)

| Metric | Expected (Canonical) | Implementation (file/function) | Drift | Fix |
| --- | --- | --- | --- | --- |
| Joke multipliers | Setup 1.2, Light 1.7, Intermediate 2.3, Strong 2.8, Exceptional 3.3 | `JOKE_MULTIPLIERS` in `src/lib/scoring.ts` | No | n/a |
| Overall Score | `(JokeRatio * 100 * sqrt(30/T) * GenreFactor) + (0.07*Nplus - 0.05*Nminus)` | `calculateOverallScore` + `calculateRuntimeFactor` in `src/lib/scoring.ts` | No | n/a |
| Runtime factor | `sqrt(30 / T)` | `calculateRuntimeFactor` in `src/lib/scoring.ts` | No | n/a |
| LPM | Count only jokes with multiplier ≥ 2.3 (Intermediate+) per minute | `calculateLpm` in `src/lib/scoring.ts` | No | n/a |
| Gap Priority | `(Duration^2) * (1 + positionWeight) * (1 / localDensity)` | `calculateGapPriority` in `src/lib/scoring.ts` | No | n/a |

Notes:
- `calculateWeightedJokeScore` derives `JokeRatio` from the canonical multipliers using Exceptional (3.3x) as the max possible contribution per joke.
- Validation guards reject non-finite inputs and zero/negative runtimes or densities to avoid silent fallbacks.
