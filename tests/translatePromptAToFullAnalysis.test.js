const fs = require('fs');
const path = require('path');
const ts = require('typescript');
const assert = require('assert');
const Module = require('module');

const originalResolveFilename = Module._resolveFilename;
Module._resolveFilename = function patchedResolve(request, parent, isMain, options) {
  if (request.startsWith('@/')) {
    const rewritten = path.join(__dirname, '../src', request.slice(2));
    return originalResolveFilename.call(this, rewritten, parent, isMain, options);
  }
  return originalResolveFilename.call(this, request, parent, isMain, options);
};

require.extensions['.ts'] = function register(module, filename) {
  const source = fs.readFileSync(filename, 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React },
    fileName: path.basename(filename),
  });
  // eslint-disable-next-line no-underscore-dangle
  module._compile(outputText, filename);
};

const { translatePromptAToFullAnalysis } = require('../src/lib/llm/translatePromptAToFullAnalysis');
const { validateAndSanitizeAnalysis } = require('../src/lib/validation');

const raw = {
  metadata: { formatType: 'sitcom', totalLines: 120, estimatedRuntimeMin: 10 },
  scores: { overallScore: 75, CHS: 80 },
  metrics: {
    totalJokes: 20,
    laughsPerMinute: 2,
    linesPerJoke: 6,
    peakLaughMoments: 3,
    sustainedLaughCount: 2,
    callbackFrequency: 10,
    characterBalanceScore: 0.6,
    runtimeMinutes: 10,
  },
  jokeAnalysis: {
    categoryCounts: { Basic: 5, Standard: 8, Intermediate: 4, Advanced: 2, HighComplexity: 1 },
    weightedScores: {
      BasicScore: 5,
      StandardScore: 8,
      IntermediateScore: 6,
      AdvancedScore: 5,
      HighScore: 3,
      TotalWeightedJokeScore: 27,
      MaxPossibleScore: 50,
      JokeRatio: 0.5,
    },
    runtimeFactor: 1,
    bonusPoints: 2,
    penaltyPoints: 1,
    jokesByLine: [],
  },
  characterAnalysis: { jokesPerCharacter: { ALICE: 10, BOB: 10 }, characterBalanceScore: 0.5 },
  callbackAnalysis: {
    totalCallbacks: 2,
    callbackFrequency: 10,
    callbacksDetail: [{ setupLine: 10, callbackLine: 50, description: 'test' }],
    missedCallbacks: 1,
  },
  gapAnalysis: { gaps: [{ startLine: 30, endLine: 40, length: 10, durationMin: 1 }], retentionCliff: null, gapPriorityScores: [] },
  hackyJokeAnalysis: { hackyCount: 0, issues: [] },
  recommendations: ['Add more callbacks'],
};

const translated = translatePromptAToFullAnalysis(raw);
const validated = validateAndSanitizeAnalysis(translated);

assert.strictEqual(validated.metrics.totalJokes, raw.metrics.totalJokes, 'totalJokes should map through translator');
assert.strictEqual(validated.metrics.laughsPerMinute, raw.metrics.laughsPerMinute, 'laughsPerMinute should map through translator');
assert.strictEqual(validated.characters.characters.length, Object.keys(raw.characterAnalysis.jokesPerCharacter).length, 'characters should map from jokesPerCharacter');
assert.strictEqual(validated.callbacks.existingCallbacks.length, raw.callbackAnalysis.callbacksDetail.length, 'callbacks should map detail array');

console.log('translatePromptAToFullAnalysis test passed');
