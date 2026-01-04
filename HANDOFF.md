# Laugh Lab v2 — Handoff Guide

**For new contributors, contractors, or future-you returning after a break.**

This document gets you from zero to running in under 10 minutes.

---

## Quick Start (5 minutes)

### 1. Clone and Install

```bash
git clone <repo-url>
cd laughlab-v2
corepack enable
pnpm install
```

### 2. Configure Environment

Create `.env.local` in the project root:

```bash
# REQUIRED - Get from OpenAI dashboard
OPENAI_API_KEY=sk-...

# OPTIONAL - Override default model (default: gpt-5.2)
# LLM_MODEL_NAME=gpt-5.2

# OPTIONAL - For persistent storage (Supabase)
# NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
# NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

### 3. Run Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000)

### 4. Verify It Works

1. Navigate to `/analyze`
2. Paste any comedy script (or click "Load Sample")
3. Click "Analyze Script"
4. Wait ~30 seconds
5. View the multi-page report

---

## Project Structure

```
laughlab-v2/
├── src/
│   ├── app/                    # Next.js 14 App Router
│   │   ├── api/analyze/        # POST /api/analyze endpoint
│   │   ├── analyze/            # Script input page
│   │   ├── report/             # Multi-page report
│   │   └── history/            # Analysis history
│   ├── lib/
│   │   ├── llm/                # LLM integration
│   │   │   ├── client.ts       # OpenAI client setup
│   │   │   ├── chatgptRequest.ts # HTTP with retry logic
│   │   │   ├── promptA.ts      # Scoring prompt
│   │   │   ├── promptB.ts      # Coach feedback prompt
│   │   │   ├── runPromptA.ts   # Execute Prompt A
│   │   │   └── generateCoachNote.ts
│   │   ├── validation.ts       # Zod schemas
│   │   ├── ratelimit.ts        # Rate limiting
│   │   └── store.ts            # Zustand state
│   ├── components/
│   │   ├── report/             # Report page components
│   │   ├── charts/             # Recharts visualizations
│   │   └── ui/                 # Shadcn UI components
│   └── types/
│       └── index.ts            # TypeScript definitions
├── tests/                      # Vitest unit tests
├── supabase_schema.sql         # Production DB schema
├── supabase_eval_schema.sql    # Evaluation harness schema
└── vercel.json                 # Deployment config
```

---

## Key Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server |
| `pnpm build` | Production build |
| `pnpm start` | Start production server |
| `pnpm test` | Run Vitest tests |
| `pnpm run typecheck` | TypeScript type checking |
| `pnpm lint` | Run ESLint |

---

## Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `OPENAI_API_KEY` | Yes | — | OpenAI API key |
| `LLM_MODEL_NAME` | No | `gpt-5.2` | Model to use |
| `OPENAI_API_URL` | No | OpenAI default | Custom endpoint |
| `NEXT_PUBLIC_SUPABASE_URL` | No | — | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | No | — | Supabase anon key |

---

## How the Analysis Pipeline Works

```
1. User submits script
   ↓
2. POST /api/analyze
   - Validates input (100-150k chars, format, title)
   - Checks rate limits (5/min, 20/day free)
   - Checks usage limits (2/month free)
   ↓
3. runPromptA()
   - Sends script + prompt to ChatGPT 5.2
   - Uses tool calling for structured JSON output
   - Retries up to 3x with exponential backoff
   ↓
4. translatePromptAToFullAnalysis()
   - Maps raw LLM output to FullAnalysis type
   - Generates timeline from joke data
   - Applies format benchmarks
   ↓
5. validateAndSanitizeAnalysis()
   - Zod schema validation
   - Clamps numbers, truncates strings
   - Returns safe defaults for missing data
   ↓
6. generateCoachNote()
   - Prose feedback from ChatGPT
   - Falls back to generic text on failure
   ↓
7. Response
   - Returns FullAnalysis + coachNote
   - Stores in Zustand + localStorage
   - Persists to Supabase (if configured)
```

---

## Known Footguns

### 1. Missing API Key

**Symptom**: App crashes on startup with "OPENAI_API_KEY is missing"

**Fix**: Add `OPENAI_API_KEY=sk-...` to `.env.local`

---

### 2. Empty LLM_MODEL_NAME

**Symptom**: Error "LLM_MODEL_NAME is set but empty"

**Fix**: Either omit `LLM_MODEL_NAME` entirely or provide a valid value

---

### 3. Report Page Stuck on "Loading..."

**Symptom**: After analysis, report page shows loading spinner forever

**Cause**: Race condition between navigation and Zustand persist middleware

**Status**: Fixed with manual localStorage recovery in `src/app/report/page.tsx`

**If it recurs**: Check browser console for hydration errors; clear localStorage

---

### 4. Rate Limits Reset on Cold Start

**Symptom**: Rate limits seem to reset unpredictably

**Cause**: In-memory rate limiting resets when Vercel spins up new instance

**Mitigation**: Supabase persistence supplements in-memory (if configured)

---

### 5. Timeline Shows Empty Charts

**Symptom**: Timeline page has "N/A" everywhere

**Cause**: Script has no detected jokes, or analysis failed silently

**Check**: Look at `metrics.totalJokes` in analysis—if 0, that's expected behavior

---

### 6. Legacy Anthropic Code

**Symptom**: Confusion about `anthropic_client.ts`

**Reality**: This file is unused since the GPT-5.2 migration; safe to delete

---

## Testing Locally

### Run All Tests

```bash
pnpm test
```

### Run Specific Test

```bash
pnpm test -- tests/generateCoachNote.test.ts
```

### Test the API Manually

```bash
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "script": "JERRY: What is the deal with airline food?\nGEORGE: I know, right?\nJERRY: Its like theyre trying to poison us.",
    "title": "Test Script",
    "format": "sitcom"
  }'
```

---

## Deploying

### Automatic (Preferred)

Push to `main` branch triggers Vercel auto-deploy:

```bash
git push origin main
```

### Manual

```bash
vercel --prod
```

### Rollback

In Vercel dashboard:
1. Go to Deployments
2. Find previous successful deployment
3. Click "..." → "Promote to Production"

---

## Database Setup (Optional)

If using Supabase for persistence:

### 1. Create Supabase Project

Go to [supabase.com](https://supabase.com) and create a new project.

### 2. Run Schema Migration

In Supabase SQL Editor, run:
- `supabase_schema.sql` (production tables)
- `supabase_eval_schema.sql` (evaluation harness)

### 3. Get Credentials

From Project Settings → API:
- Copy "Project URL" → `NEXT_PUBLIC_SUPABASE_URL`
- Copy "anon public" key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 4. Add to Environment

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

---

## Evaluation Harness (Not Yet Populated)

The evaluation infrastructure exists but needs gold scripts:

### Tables

- `gold_scripts` — Canonical test scripts
- `gold_expected_results` — Expected analysis outputs
- `eval_runs` — Test run metadata
- `eval_run_results` — Per-script results

### To Run Evaluation

1. Populate `gold_scripts` with test scripts
2. Populate `gold_expected_results` with expected outputs
3. Run evaluation (script TBD—currently manual)
4. Check `eval_run_results` for pass/fail

---

## Getting Help

### Documentation

- `MIGRATION_BLUEPRINT_ADDENDUM.md` — Execution details
- `DECISION_LOG.md` — Why decisions were made
- `CODEX_DEBUGGING_REPORT.md` — Previous fixes
- `TEST_PLAN.md` — Security test plan

### Key Files for Common Tasks

| Task | File |
|------|------|
| Change prompts | `src/lib/llm/promptA.ts`, `promptB.ts` |
| Adjust validation | `src/lib/validation.ts` |
| Modify rate limits | `src/lib/ratelimit.ts` |
| Add report sections | `src/components/report/Page*.tsx` |
| Update API logic | `src/app/api/analyze/route.ts` |

---

## Checklist: Before You Start Coding

- [ ] `.env.local` exists with `OPENAI_API_KEY`
- [ ] `pnpm install` completed without errors
- [ ] `pnpm dev` starts without errors
- [ ] Can access http://localhost:3000
- [ ] Sample analysis completes successfully
- [ ] Ran `pnpm test` — all pass
- [ ] Read `DECISION_LOG.md` to understand prior decisions

---

**Document Version:** 1.0
**Last Updated:** January 4, 2026
