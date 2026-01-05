# Laugh Lab Migration Technical Blueprint — Execution Addendum

**Version:** 1.0
**Date:** January 4, 2026
**Status:** Execution-Ready

This addendum answers the questions engineers always ask—usually too late. It supplements the core blueprint with execution-grade specifics that prevent drift, scope creep, and rework.

---

## 1. Source of Truth & Canonical References

### What Is Authoritative

| Domain | Canonical Source | Notes |
|--------|------------------|-------|
| **LLM Model** | `gpt-5.2` (defined in `src/lib/llm/client.ts:3`) | Override via `LLM_MODEL_NAME` env var for testing only |
| **Database Schema** | `supabase_schema.sql`, `supabase_eval_schema.sql` | Application code must not implicitly extend or reshape stored data |
| **Primary Analysis Prompt** | `PROMPT_A_SYSTEM` in `src/lib/llm/promptA.ts` | Temperature 0, deterministic scoring; changes require versioning |
| **Coach Feedback Prompt** | `PROMPT_B_SYSTEM` in `src/lib/llm/promptB.ts` | Temperature 0.3 for natural prose |
| **Coach Note Prompt** | `generateCoachNote()` in `src/lib/llm/generateCoachNote.ts` | Has hard fallback; no retry on failure |
| **Validation** | `src/lib/validation.ts` | Final gatekeeper; no unvalidated data may be persisted or surfaced |
| **Scoring Logic** | Prompt A output only | Scores are **advisory feedback**, not contractual guarantees |

### What Is NOT Authoritative

- **Legacy files**: `src/lib/llm/anthropic_client.ts` (unused after migration—delete it)
- **`.env.example`**: Outdated; still references `ANTHROPIC_API_KEY` instead of `OPENAI_API_KEY`
- **Benchmark percentiles**: Currently use format-based defaults (`translatePromptAToFullAnalysis.ts:477`); not derived from real industry data

---

## 2. Non-Goals & Constraints

### This Migration Explicitly Does NOT Solve

| Non-Goal | Rationale |
|----------|-----------|
| Real-time analysis | Single-request architecture; no streaming or incremental updates |
| Model training or fine-tuning | Pure inference; no training data collection |
| Long-term script storage beyond session | Scripts exist in Zustand + localStorage only; Supabase stores reports, not raw scripts |
| Score normalization across genres | Format-specific benchmarks exist but percentiles are advisory defaults |
| Authentication (Phase 1) | Uses fingerprint-based anonymous tracking; `user_id` FK exists but auth routes do not |
| Payment integration (Phase 1) | Tier limits enforced but Stripe integration is Phase 2 |
| PDF export | Frontend-only feature; not implemented |

### Hard Constraints

| Constraint | Value | Enforcement Point |
|------------|-------|-------------------|
| Max script length | 150,000 characters | `src/app/api/analyze/route.ts` |
| Min script length | 100 characters | `src/app/api/analyze/route.ts` |
| Max title length | 200 characters | `src/app/api/analyze/route.ts` |
| Request timeout | 60 seconds | `src/lib/llm/chatgptRequest.ts:10` |
| Rate limit (per-minute) | 5 requests/IP | `src/lib/ratelimit.ts` |
| Rate limit (per-day free) | 20 requests/IP | `src/lib/ratelimit.ts` |
| Monthly usage (free tier) | 2 analyses | `src/lib/ratelimit.ts` |

---

## 3. Data Ownership & Lifecycle

### Script Journey (Narrative)

1. **Entry**: User pastes script into `/analyze` form
2. **Validation**: API validates length (100–150,000 chars), format, title
3. **Processing**: Script sent to ChatGPT 5.2 via `runPromptA()`; response validated via Zod
4. **Enrichment**: `translatePromptAToFullAnalysis()` generates timeline, maps benchmarks
5. **Coach Note**: `generateCoachNote()` produces prose feedback (or hard fallback)
6. **Storage**:
   - **Zustand store** (client-side): Full analysis object
   - **localStorage**: Persisted via Zustand persist middleware
   - **Supabase `reports` table**: Overall score, title, format, full `analysis_data` JSONB
7. **Retention**:
   - Client-side: Until browser clear or new analysis overwrites
   - Supabase: Indefinite (no TTL policy currently defined)
8. **Raw script**: **Never persisted** in database; only analysis results stored

### What Is Logged Permanently

| Data Type | Storage Location | Retention |
|-----------|-----------------|-----------|
| Analysis results | Supabase `reports.analysis_data` | Indefinite |
| Overall score | Supabase `reports.overall_score` | Indefinite |
| Format & title | Supabase `reports` | Indefinite |
| Usage counters | Supabase `usage_counters` | Indefinite (used for rate limiting) |
| Raw script text | **Nowhere** | Not stored |
| LLM request/response logs | **Nowhere** | Not stored (console.warn only on errors) |

---

## 4. Prompt Versioning & Rollback Policy

### Current State

> **Gap Identified**: No `prompt_version` column exists in the `reports` table. Analysis results cannot currently be correlated with prompt versions.

### Recommended Implementation

1. **Add column** to `supabase_schema.sql`:
   ```sql
   ALTER TABLE public.reports ADD COLUMN prompt_version TEXT;
   ```

2. **Version format**: `A.v{MAJOR}.{MINOR}.{PATCH}` (e.g., `A.v3.2.0`)
   - **MAJOR**: Structural output changes
   - **MINOR**: Prompt phrasing changes affecting scores
   - **PATCH**: Typo fixes, clarifications

3. **Storage rule**: Every analysis record must store the prompt version used at write time

4. **Rollback procedure**:
   - Prompt source files are in git; rollback = `git revert`
   - Compare analysis results before/after via `eval_runs` table
   - No runtime prompt switching (prompts are baked into code)

### Prompt Registry (Current Versions)

| Prompt | Location | Current Version | Temperature |
|--------|----------|-----------------|-------------|
| Prompt A (Scoring) | `src/lib/llm/promptA.ts` | Not versioned (add `A.v1.0.0`) | 0 |
| Prompt B (Coach) | `src/lib/llm/promptB.ts` | Not versioned (add `B.v1.0.0`) | 0.3 |
| Coach Note | `src/lib/llm/generateCoachNote.ts` | Not versioned (add `C.v1.0.0`) | 0.2 |

---

## 5. Model Abstraction Contract

### What the System Assumes About LLM Responses

| Property | Requirement | Enforcement |
|----------|-------------|-------------|
| **Response format** | JSON via tool calling (`analyze_script` function) | `runPromptA.ts` parses `tool_calls[0].function.arguments` |
| **Schema compliance** | Must match Zod `AnalysisResponseSchema` | `src/lib/validation.ts` |
| **Max latency** | 60 seconds | `CHATGPT_TIMEOUT_MS` in `chatgptRequest.ts` |
| **Retry semantics** | 3 attempts with exponential backoff (1s, 2s, 4s + jitter) | `callChatGPTWithRetry()` |
| **Retryable conditions** | 429 (rate limit), 408 (timeout), 5xx, network errors, AbortError | `shouldRetry()` function |
| **Non-retryable conditions** | 400, 401, 403, 404, validation failures | Immediate failure |

### Provider Abstraction

All provider-specific logic is centralized in:
- `src/lib/llm/client.ts` (OpenAI client instantiation)
- `src/lib/llm/chatgptRequest.ts` (HTTP layer with retry logic)

Switching providers requires changes **only** in these two files. The rest of the system expects:
- A validated JSON result matching `ValidatedAnalysisResponse`, **OR**
- A typed `UpstreamError` with `statusCode` and `promptLabel`

### Error Propagation

```
LLM timeout/error
  → TimeoutError / OpenAIHTTPError
    → shouldRetry() check
      → If retryable: backoff + retry (up to 3x)
      → If exhausted: UpstreamError
        → API route catches, returns appropriate HTTP status
          → UI displays user-friendly message
```

---

## 6. Error Taxonomy

### Current State

The API currently uses a generic `error: string` field. This section defines the structured taxonomy for implementation.

### Error Categories

| Category | HTTP Status | User Visibility | Behavior |
|----------|-------------|-----------------|----------|
| `VALIDATION_ERROR` | 400 | User-visible | Show specific validation message |
| `RATE_LIMIT_EXCEEDED` | 429 | User-visible | Show "Try again in X seconds" with Retry-After |
| `USAGE_LIMIT_EXCEEDED` | 403 | User-visible | Show upgrade prompt or wait message |
| `LLM_TIMEOUT` | 504 | User-visible | "Analysis took too long. Please try again." |
| `LLM_RATE_LIMITED` | 429 | User-visible | "Service busy. Please try again shortly." |
| `LLM_SERVER_ERROR` | 502 | User-visible | "Analysis service unavailable. Please try again." |
| `SCHEMA_MISMATCH` | 500 | Silent (logged) | Return safe defaults; log for investigation |
| `INTERNAL_PIPELINE_ERROR` | 500 | Silent | Log full error; show generic "Something went wrong" |

### Current Error Classes (in `chatgptRequest.ts`)

| Class | Purpose | Properties |
|-------|---------|------------|
| `UpstreamError` | LLM call failures after retries | `statusCode`, `promptLabel` |
| `TimeoutError` | Request exceeded 60s | `message` |
| `OpenAIHTTPError` | Non-2xx response from OpenAI | `status`, `body` |

### Anti-Pattern to Avoid

The "empty default object" pattern (returning silent defaults when data is invalid) should be used **only** for non-critical fields. Critical failures must surface to the user.

---

## 7. Cost Guardrails

### Token Limits by Tier

| Tier | Monthly Analyses | Max Script Length | Enforcement |
|------|------------------|-------------------|-------------|
| Free | 2 | 150,000 chars | Hard block at limit |
| Starter | Unlimited | 150,000 chars | Soft warning only |
| Professional | Unlimited | 150,000 chars | Soft warning only |
| Enterprise | Unlimited | Custom | Configurable |

### What Happens When Limits Hit

| Limit Type | Trigger | Behavior |
|------------|---------|----------|
| Per-minute rate | 6th request in 60s | 429 with `Retry-After` header |
| Per-day rate (free) | 21st request | 429 with reset time |
| Monthly usage (free) | 3rd analysis | 403 with upgrade prompt |
| Script too long | >150,000 chars | 400 before LLM call |
| LLM timeout | >60s | 504 after retries |

### Recommended: Frontend Token Estimator

Add a lightweight estimator that:
1. Estimates token usage before submission (~4 chars = 1 token)
2. Warns if script approaches tier limits
3. Shows estimated cost for paid tiers
4. **Advisory only**—does not replace backend enforcement

---

## 8. Gold Set & Evaluation Hook Reference

### Evaluation Infrastructure

| Component | Location | Status |
|-----------|----------|--------|
| Schema | `supabase_eval_schema.sql` | Defined |
| Gold scripts table | `gold_scripts` | Empty (needs population) |
| Expected results table | `gold_expected_results` | Empty (needs population) |
| Eval runs table | `eval_runs` | Available |
| Eval results table | `eval_run_results` | Available |

### What "Passing" Means

Define pass/fail criteria for automated evaluation:

```typescript
// Suggested thresholds (not yet implemented)
interface EvalThresholds {
  maxScoreDelta: 5;           // Overall score within ±5 points
  maxJokeCountDelta: 2;       // Total jokes within ±2
  requiredGapOverlap: 0.8;    // 80% of expected gaps detected
  coachNoteMinWords: 50;      // Coach note has substance
  coachNoteMaxWords: 300;     // Coach note is concise
}
```

### Evaluation Trigger

Currently: Manual via SQL or future CLI tool
Recommended: Add `npm run eval` script that:
1. Loads gold scripts from `gold_scripts`
2. Runs each through `runPromptA()`
3. Compares against `gold_expected_results`
4. Writes results to `eval_run_results`
5. Reports pass/fail summary

---

## 9. Handoff Checklist

### If You Are Picking This Up Cold, Do This:

#### 1. Environment Setup

```bash
# Clone and install
git clone <repo-url>
cd laughlab-v2
corepack enable
pnpm install

# Create .env.local with:
OPENAI_API_KEY=sk-...          # Required
LLM_MODEL_NAME=gpt-5.2         # Optional (default: gpt-5.2)
NEXT_PUBLIC_SUPABASE_URL=...   # Optional (for persistence)
NEXT_PUBLIC_SUPABASE_ANON_KEY=... # Optional
```

#### 2. Verify It Works

```bash
# Run dev server
pnpm dev

# Run tests
pnpm test

# Type check
pnpm run typecheck
```

#### 3. Key File Locations

| What | Where |
|------|-------|
| API route | `src/app/api/analyze/route.ts` |
| LLM client | `src/lib/llm/client.ts` |
| Prompt A (scoring) | `src/lib/llm/promptA.ts` |
| Prompt execution | `src/lib/llm/runPromptA.ts` |
| Validation | `src/lib/validation.ts` |
| Rate limiting | `src/lib/ratelimit.ts` |
| Report pages | `src/components/report/Page*.tsx` |

#### 4. Known Footguns

| Footgun | Symptom | Fix |
|---------|---------|-----|
| Missing `OPENAI_API_KEY` | App crashes on startup | Add to `.env.local` |
| Empty `LLM_MODEL_NAME` | Error thrown | Either omit or provide valid value |
| Zustand hydration race | Report page shows "Loading..." forever | Fixed in `src/app/report/page.tsx` with manual recovery |
| Rate limit in-memory only | Limits reset on Vercel cold start | Use Supabase for persistence |
| Legacy `anthropic_client.ts` | Unused code confusion | Safe to delete |

#### 5. Deploy to Vercel

```bash
# Push to main triggers auto-deploy
git push origin main

# Or manual deploy
vercel --prod
```

---

## 10. Decision Log

### Why These Choices Were Made

| Decision | Rationale | Date |
|----------|-----------|------|
| **GPT-5.2 over Claude** | 400k context window enables single-pass full-script analysis; better structured output support | Jan 4, 2026 |
| **Single-request API design** | Simpler than streaming; no partial results to reconcile; timeout is acceptable for analysis UX | Dec 2025 |
| **Schema-first validation** | Zod guarantees type safety; safe defaults prevent cascading failures | Dec 2025 |
| **Tool calling over raw JSON** | OpenAI's tool calling guarantees schema compliance; reduces retry logic | Jan 2026 |
| **Sitcom-biased defaults** | Most common use case; feature/standup users know their format | Dec 2025 |
| **No score normalization** | Insufficient cross-genre data; premature normalization would mislead users | Dec 2025 |
| **Heuristic timeline generation** | Derived from joke analysis, not LLM inference; deterministic and fast | Dec 31, 2025 |
| **Hard fallback for coach note** | Coach note is flavor, not core; failure shouldn't block report | Dec 2025 |
| **In-memory + Supabase hybrid rate limiting** | In-memory is fast; Supabase provides persistence across cold starts | Dec 2025 |
| **Fingerprint over auth (Phase 1)** | Reduces friction for free tier; auth is Phase 2 | Dec 2025 |

### Decisions NOT Yet Made (Open Questions)

| Question | Options | Blocker |
|----------|---------|---------|
| Prompt versioning storage | Column in reports vs. separate table | Needs schema migration approval |
| Error taxonomy implementation | Enum vs. string union | Needs frontend coordination |
| Gold script selection | Industry scripts vs. synthetic | Legal review for industry scripts |
| Rate limit persistence | Supabase vs. Redis | Cost/latency tradeoff |

---

## 11. Cleanup Checklist

### Technical Debt to Address

- [ ] Delete `src/lib/llm/anthropic_client.ts` (unused)
- [ ] Remove `@anthropic-ai/sdk` from `package.json`
- [ ] Update `.env.example` to use `OPENAI_API_KEY`
- [ ] Add `prompt_version` column to `reports` table
- [ ] Resolve TODO at `translatePromptAToFullAnalysis.ts:477` (nullable percentile)
- [ ] Populate `gold_scripts` table with evaluation data
- [ ] Add Sentry or equivalent error tracking
- [ ] Implement structured logging (Winston/Pino)

---

## Appendix A: Quick Reference Card

```
┌─────────────────────────────────────────────────────────────┐
│                    LAUGH LAB QUICK REFERENCE                 │
├─────────────────────────────────────────────────────────────┤
│ Model:          gpt-5.2                                      │
│ Timeout:        60 seconds                                   │
│ Retries:        3 (1s → 2s → 4s + jitter)                   │
│ Rate limit:     5/min, 20/day (free)                        │
│ Script limits:  100–150,000 chars                           │
│                                                              │
│ Key files:                                                   │
│   API:          src/app/api/analyze/route.ts                │
│   Prompts:      src/lib/llm/prompt{A,B}.ts                  │
│   Validation:   src/lib/validation.ts                       │
│   LLM client:   src/lib/llm/chatgptRequest.ts               │
│                                                              │
│ Env vars:                                                    │
│   OPENAI_API_KEY        (required)                          │
│   LLM_MODEL_NAME        (optional, default: gpt-5.2)        │
│   SUPABASE_URL          (optional, for persistence)         │
│   SUPABASE_ANON_KEY     (optional, for persistence)         │
└─────────────────────────────────────────────────────────────┘
```

---

**Document Version:** 1.0
**Author:** Migration Team
**Review Status:** Pending stakeholder review
