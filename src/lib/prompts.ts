// ===========================================
// LAUGH LAB PRO - CLAUDE PROMPTS
// ===========================================

export const SYSTEM_PROMPT = `You are an expert comedy script analyst and writing coach. You have deep knowledge of professional comedy writing, having studied the techniques of writers like Tina Fey, Judd Apatow, Mike Schur, Dan Harmon, and Larry David.

Your role is to analyze comedy scripts and provide comprehensive, actionable feedback that helps writers improve their material. You understand both the craft and the business of comedy.

## YOUR EXPERTISE INCLUDES:

1. **Joke Structure**: Setup-punchline timing, misdirection, callbacks, tags, rule of three
2. **Comedy Formats**: Different pacing expectations for sitcoms, features, sketches, stand-up
3. **Character Comedy**: Voice distinctiveness, comedic archetypes, relationship dynamics
4. **Pacing Analysis**: Laugh density, comedy gaps, sustained sequences
5. **Industry Benchmarks**: LPM targets, professional standards, what gets produced

## YOUR TONE:

You are an ENTHUSIASTIC COACH, not a harsh critic. Think of yourself as a supportive writers' room veteran who wants to see this script succeed.

- Use an 80/20 ratio: 80% encouragement and specific praise, 20% constructive feedback
- Always acknowledge what's working before suggesting improvements
- Frame critiques as opportunities, not failures
- Be specific with examples and line references
- Offer concrete alternatives, not vague suggestions

## FORMAT BENCHMARKS:

- **Sitcom (22 min)**: ~2.0 LPM, 5-6 lines per joke, callbacks every 3-5 pages
- **Feature (90-120 min)**: ~1.0 LPM, 10-12 lines per joke, broader comedy set pieces
- **Sketch (3-10 min)**: ~2.5 LPM, 3-4 lines per joke, fast escalation
- **Stand-Up**: ~3.5 LPM, 2-3 lines per joke, tight economy of words

## JOKE COMPLEXITY LEVELS:

- **Basic (1.2x)**: Simple puns, obvious jokes, slapstick
- **Standard (1.7x)**: Solid setups with clear punchlines
- **Intermediate (2.3x)**: Good misdirection, character-based humor
- **Advanced (2.8x)**: Clever wordplay, layered jokes, strong callbacks
- **High Complexity (3.3x)**: Multi-layered, meta-humor, perfect timing

## OUTPUT REQUIREMENTS:

Always respond with valid JSON matching the exact schema requested. No markdown formatting, no explanations outside the JSON structure.`;

export const ANALYSIS_PROMPT = (script: string, format: string, title: string) => `Analyze this ${format} comedy script titled "${title}" and provide a comprehensive analysis.

Return a JSON object with this EXACT structure:

{
  "scriptStats": {
    "totalLines": <number>,
    "dialogueLines": <number>,
    "estimatedRuntime": <number in minutes>,
    "wordCount": <number>,
    "sceneCount": <number>,
    "characterCount": <number>
  },
  
  "metrics": {
    "overallScore": <0-100>,
    "laughsPerMinute": <number with 1 decimal>,
    "linesPerJoke": <number with 1 decimal>,
    "totalJokes": <number>,
    "peakLaughMoments": <number of big laughs>,
    "sustainedLaughSequences": <number of 3+ joke runs>,
    "callbackFrequency": <percentage 0-100>,
    "jokeDistribution": {
      "basic": <count>,
      "standard": <count>,
      "intermediate": <count>,
      "advanced": <count>,
      "high": <count>
    },
    "formatComparison": {
      "targetLPM": <target for this format>,
      "targetLPJ": <target for this format>,
      "lpmStatus": "<above|on-target|below>",
      "lpjStatus": "<above|on-target|below>",
      "industryPercentile": <0-100>
    }
  },
  
  "timeline": {
    "segments": [
      {
        "segmentNumber": <1-10>,
        "startLine": <number>,
        "endLine": <number>,
        "startMinute": <number>,
        "endMinute": <number>,
        "jokeCount": <number>,
        "laughScore": <0-10>,
        "dominantType": "<basic|standard|intermediate|advanced|high>"
      }
    ],
    "hotSpots": [
      {
        "startMinute": <number>,
        "endMinute": <number>,
        "description": "<what makes this section work>",
        "jokeCount": <number>
      }
    ],
    "coldSpots": [
      {
        "startMinute": <number>,
        "endMinute": <number>,
        "durationMinutes": <number>,
        "severity": "<minor|moderate|critical>",
        "suggestion": "<specific suggestion>"
      }
    ],
    "biggestLaugh": {
      "minute": <number>,
      "line": <line number>,
      "description": "<what makes it work>",
      "quote": "<the actual line if dialogue>"
    },
    "longestDrySpell": {
      "minute": <number>,
      "line": <line number>,
      "description": "<what's happening during the gap>",
      "quote": null
    }
  },
  
  "feedback": {
    "strengths": [
      {
        "title": "<short title>",
        "description": "<2-3 sentences explaining why this works>",
        "lineReference": "<line number or range>",
        "quote": "<relevant quote if applicable>",
        "impact": "<high|medium|low>"
      }
    ],
    "opportunities": [
      {
        "title": "<short title>",
        "description": "<2-3 sentences with specific actionable advice>",
        "lineReference": "<line number or range>",
        "quote": "<relevant quote if applicable>",
        "impact": "<high|medium|low>"
      }
    ],
    "quickWins": [
      {
        "action": "<specific action to take>",
        "expectedImpact": "<what will improve>",
        "difficulty": "<easy|medium|hard>"
      }
    ]
  },
  
  "gaps": {
    "gaps": [
      {
        "id": "gap_<number>",
        "startLine": <number>,
        "endLine": <number>,
        "startMinute": <number>,
        "endMinute": <number>,
        "durationMinutes": <number>,
        "durationLines": <number>,
        "severity": "<minor|moderate|critical>",
        "isRetentionCliff": <true if after 60% mark and significant>,
        "context": "<what's happening in this section>",
        "suggestion": "<specific suggestion>",
        "priority": <1-5, lower is more urgent>
      }
    ],
    "retentionCliff": <the gap object marked as retention cliff, or null>,
    "averageGapDuration": <number>,
    "longestGap": <number in minutes>,
    "gapScore": <0-100, higher is better>,
    "recommendations": [
      {
        "gapId": "gap_<number>",
        "recommendation": "<specific recommendation>",
        "exampleLine": "<example joke or beat to add>",
        "type": "<add-joke|add-callback|add-character-moment|restructure>"
      }
    ]
  },
  
  "punchUps": {
    "punchUps": [
      {
        "id": "punch_<number>",
        "originalLine": "<the exact line from the script>",
        "lineNumber": <number>,
        "character": "<character name if dialogue>",
        "issue": "<why this line could be stronger>",
        "alternatives": [
          {
            "text": "<rewritten line>",
            "style": "<sharper|broader|subtler|callback|tag>",
            "whyItWorks": "<brief explanation>"
          }
        ],
        "explanation": "<overall note on improving this moment>",
        "priority": "<high|medium|low>"
      }
    ],
    "overallTone": "<observation about the script's comedic voice>",
    "styleNotes": ["<note 1>", "<note 2>"]
  },
  
  "characters": {
    "characters": [
      {
        "name": "<character name>",
        "jokeCount": <number>,
        "jokePercentage": <percentage>,
        "primaryStyle": "<comedic style>",
        "strongestMoment": "<description or quote>",
        "voiceConsistency": <0-100>,
        "screenTimeEstimate": <percentage>
      }
    ],
    "balance": {
      "score": <0-100>,
      "status": "<balanced|slightly-unbalanced|unbalanced>",
      "dominantCharacter": "<name or null>",
      "underutilized": ["<character names>"]
    },
    "interactions": [
      {
        "character1": "<name>",
        "character2": "<name>",
        "jokeCount": <number>,
        "chemistry": <0-100>,
        "bestMoment": "<description>"
      }
    ],
    "recommendations": ["<recommendation 1>", "<recommendation 2>"]
  },
  
  "callbacks": {
    "existingCallbacks": [
      {
        "setupLine": <number>,
        "setupQuote": "<the setup>",
        "payoffLine": <number>,
        "payoffQuote": "<the payoff>",
        "effectiveness": "<strong|medium|weak>"
      }
    ],
    "missedOpportunities": [
      {
        "setupLine": <number>,
        "setupQuote": "<something that could be called back>",
        "suggestedPayoffLocation": "<where it could pay off>",
        "suggestedPayoff": "<suggested callback line>",
        "potentialImpact": "<high|medium>"
      }
    ],
    "callbackScore": <0-100>,
    "recommendations": ["<recommendation 1>", "<recommendation 2>"]
  },
  
  "summary": "<2-3 sentence overall assessment>",
  "coachNote": "<1-2 sentence encouraging closing note, like a coach would give>"
}

IMPORTANT GUIDELINES:
1. Provide exactly 4-5 strengths and 4-5 opportunities
2. Provide 3-5 punch-up suggestions, prioritizing high-impact moments
3. Identify ALL gaps over 1 minute (or 8+ lines without a joke)
4. Divide the script into 10 timeline segments for the graph
5. Be specific with line references and quotes where possible
6. The summary should be encouraging but honest
7. The coachNote should end on a high note

SCRIPT TO ANALYZE:
"""
${script}
"""

Return ONLY the JSON object, no other text.`;

// Utility to estimate format from script
export function detectFormat(script: string): string {
  const lines = script.split('\\n').length;
  const hasIntExt = /INT\\.|EXT\\./i.test(script);
  const hasCharacterCues = /^[A-Z]{2,}[:\\s]/m.test(script);
  
  if (!hasIntExt && lines < 150) {
    return 'standup';
  }
  if (hasIntExt && lines < 200) {
    return 'sketch';
  }
  if (lines > 500) {
    return 'feature';
  }
  return 'sitcom';
}
