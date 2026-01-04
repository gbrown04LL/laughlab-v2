# Canonical Sources of Truth

This document defines what is authoritative in the Laugh Lab V2 codebase.

If two files disagree, this document decides which one “wins.”

It is aimed at humans and AI agents working on this repo.

---

## 1. Scope and Non-Goals

In scope:

- Defining canonical sources of truth for:
  - LLM model and prompts
  - Database schema and types
  - Validation and analysis output shape
  - Configuration and limits
  - Security and access rules
  - Decision history and operational docs
- Declaring which artifacts are secondary or derived
- Specifying precedence rules and required co-changes

Out of scope:

- Feature design
- UX product decisions
- Full migration history (see MIGRATION_BLUEPRINT_ADDENDUM.md instead)

---

## 2. Precedence Rules (TL;DR)

When in doubt, apply these rules in order:

1) Database behavior  
   Supabase schema + RLS policies are the ultimate truth about stored data and access.

2) Validation schema  
   `src/lib/validation.ts` defines the only acceptable runtime shape of analysis output.

3) Configuration  
   Environment variables and central config modules own configuration and limits.

4) Canonical LLM prompt  
   `PROMPT_A_SYSTEM` in `src/lib/llm/promptA.ts` defines analysis semantics.

5) Documentation  
   - `CANONICAL_SOURCES.md` (this file)  
   - `DECISION_LOG.md` (why we chose X over Y)  
   - `MIGRATION_BLUEPRINT_ADDENDUM.md` (context + migrations)  
   - `HANDOFF.md` (how to run and operate)

If any other file disagrees with the above, that other file is wrong and must be updated or deleted.

---

## 3. Canonical Map by Domain

### 3.1 LLM, Model Selection, and Prompts

Canonical:

- Analysis prompt and semantics:
  - `src/lib/llm/promptA.ts`
  - `PROMPT_A_SYSTEM` is the canonical analysis engine.
- LLM request orchestration and retry behavior:
  - `src/lib/llm/chatgptRequest.ts` (or equivalent LLM client module)
- Model selection:
  - Environment variable `<LLM_MODEL_ENV>` (e.g. `LAUGHLAB_LLM_MODEL`)
  - Default model: `gpt-5.2` (this is the default, not a hardcoded override)

Non-canonical:

- Any legacy Anthropic client (e.g. `src/lib/llm/anthropic_client.ts`)
- Any additional prompt files that:
  - Do not delegate to Prompt A, and
  - Are not explicitly marked as experimental, legacy, or test-only

Rules:

- The env var `<LLM_MODEL_ENV>` is the single source of truth for which model to call in production.
- No hardcoded model names (e.g. `"gpt-5.2"`) may appear outside:
  - The LLM client module, and
  - Tests or explicit migration scripts
- If `promptA.ts` and any other prompt disagree on how to define scores, shapes, or concepts, `promptA.ts` wins for production analysis.

If you change X:

- If you change `PROMPT_A_SYSTEM`:
  - Update any prompt versioning field (once you add it to the DB).
  - Update tests that assert specific output structure.
  - Add a new entry to `DECISION_LOG.md`.

---

### 3.2 Database Schema and Types

Canonical:

- Production schema:
  - `supabase_schema.sql`
- Evaluation / gold-set schema:
  - `supabase_eval_schema.sql`
- RLS policies:
  - All `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;` and `CREATE POLICY` statements in the SQL files

Types:

- Generated or authoritative DB types:
  - Generated Supabase types file (if present), or
  - A single `src/types/db.generated.ts` (or equivalent) clearly marked:
    - “AUTO-GENERATED FROM SUPABASE — DO NOT EDIT BY HAND”

Non-canonical:

- Any TypeScript interfaces that re-describe DB tables by hand.
- Any code that assumes a field exists that is not present in `supabase_schema.sql` / `supabase_eval_schema.sql`.

Rules:

- SQL schema → generated types → application code. That is the direction of truth.
- If TypeScript types and SQL disagree, SQL wins, and TS is wrong.
- No application code may introduce new persistent fields that are not first added to the SQL schema.

If you change X:

- If you add/rename/drop a column in Supabase:
  - Update `supabase_schema.sql` and/or `supabase_eval_schema.sql`.
  - Regenerate Supabase types / update `src/types/db.generated.ts`.
  - Update any Zod or runtime validation that references those fields.
  - Add a short entry to `DECISION_LOG.md` if this changes behavior or data shape.

---

### 3.3 Validation and Analysis Output Shape

Canonical:

- Validation and analysis output shape:
  - `src/lib/validation.ts`
  - This file defines:
    - Which fields exist on analysis results
    - Which fields are required vs optional
    - Allowed value ranges and enums
    - Defaulting and coercion rules (if any)

Non-canonical:

- Inline shape checks in API routes, React components, or utilities.
- Hand-rolled type guards that do not use `validation.ts`.

Rules:

- All analysis responses returned to the client must be validated by the schemas in `src/lib/validation.ts`.
- No code may silently “repair” invalid LLM output by constructing an all-default object outside validation.
- If validation rejects a payload, the caller must treat that as an error, not as a successful but empty result.

If you change X:

- If you change the validation schema:
  - Update any components consuming those fields.
  - Update any DB persistence that relies on the same shape.
  - Update fixtures in tests.
  - Consider adding a new decision in `DECISION_LOG.md` if semantics change.

---

### 3.4 Configuration, Limits, and Environment Variables

Canonical:

- Configuration source:
  - Environment variables (`.env`, project settings)
  - Documented in:
    - `.env.example`
    - `HANDOFF.md` (environment section)
- Numeric and behavioral limits (single source):
  - Script length limit (e.g. 150k chars)
  - Request timeout (e.g. 60 seconds)
  - Rate limits (e.g. 5 analyses per minute per fingerprint)
  - Defined in a central config module (e.g. `src/config/limits.ts` or similar)

Non-canonical:

- Hardcoded limits or magic numbers scattered across the codebase.
- Undocumented environment variables.

Rules:

- All limits must be defined once, in a central config module, and imported elsewhere.
- `.env.example` and `HANDOFF.md` must list every required env var.
- If a value is configurable via env, code must not override it with a conflicting hardcoded default.

If you change X:

- If you change an env var name or semantics:
  - Update `.env.example`.
  - Update `HANDOFF.md`.
  - Update the central config module and all uses.
- If you change a limit (chars, timeouts, rate limits):
  - Update the central config module only; all callers must consume from it.
  - Update MIGRATION_BLUEPRINT_ADDENDUM.md where constraints are documented.
  - Update UI copy if limits are shown to users.

---

### 3.5 Security and Access (RLS vs Client Logic)

Canonical:

- Supabase Row Level Security (RLS):
  - All `CREATE POLICY` statements in `supabase_schema.sql` / `supabase_eval_schema.sql`.
- Security behavior:
  - What a caller can or cannot do is defined by RLS, not by the frontend.

Non-canonical:

- Any client-side “security” checks that hide buttons or rows.
- Any assumption that “if we don’t show it in the UI, it’s secure.”

Rules:

- RLS policies must prevent:
  - Reading other users’ / other fingerprints’ reports.
  - Writing rows without proper ownership checks.
- Frontend and backend logic are UX and API convenience; they cannot weaken RLS.

If you change X:

- If you change RLS policies:
  - Update this document’s security section with a brief description.
  - Update any backend code that assumed the old behavior.
  - Add or update tests / manual steps to verify RLS is correct.

---

### 3.6 Documentation and Decision History

Canonical:

- Source of Truth document:
  - `CANONICAL_SOURCES.md` (this file)
- Migration and architecture notes:
  - `MIGRATION_BLUEPRINT_ADDENDUM.md`
- Decision history:
  - `DECISION_LOG.md`
- Operational onboarding:
  - `HANDOFF.md`

Non-canonical:

- Comments in random files that contradict this document.
- One-off notes in issues or pull requests that are not reflected here or in the decision log.

Rules:

- If you make a non-trivial architecture decision, add an entry to `DECISION_LOG.md`.
- If you change what is canonical, you must update `CANONICAL_SOURCES.md` first.
- If handoff steps change, update `HANDOFF.md` and link to the relevant decisions.

---

## 4. Deprecated and Non-Canonical Artifacts

The following are explicitly non-canonical and should not be wired into production:

- Legacy Anthropic client:
  - `src/lib/llm/anthropic_client.ts`
  - Status: legacy / experimental. Safe to delete once no branches use it.
- Any unused prompts:
  - Prompt files not referenced by the main analysis pipeline, unless clearly marked:
    - `// Experimental`
    - `// Test-only`
- Stale env documentation:
  - Any references in `.env.example` to variables no longer used in code.

When in doubt:

- If a file is not referenced by the main pipeline and is not documented here, treat it as non-canonical and consider archiving or deleting it.

---

## 5. “If You Change X, You Must Change Y” Rules

Use this as a checklist when modifying core parts of the system.

1) Change: LLM model or provider  
   - Also change:
     - `<LLM_MODEL_ENV>` definition and docs
     - LLM client module (`chatgptRequest.ts` or equivalent)
     - MIGRATION_BLUEPRINT_ADDENDUM.md (cost, context window)
     - Any tests asserting token/latency behavior  
   - Add decision: `DECISION_LOG.md` entry explaining why.

2) Change: Prompt A (`PROMPT_A_SYSTEM` in `promptA.ts`)  
   - Also change:
     - Any prompt version field in the DB (once added)
     - Tests / fixtures tied to expected score ranges or behavior
     - DECISION_LOG with a new prompt version decision

3) Change: Analysis output shape (`validation.ts`)  
   - Also change:
     - Components that render analysis results
     - DB schema if persistent fields change
     - Test fixtures and mock responses

4) Change: Supabase schema (any table)  
   - Also change:
     - Regenerated DB types or `db.generated.ts`
     - Any Zod schemas that mirror these fields
     - DECISION_LOG if behavior or API contracts change

5) Change: Limits (chars, timeouts, rate limits)  
   - Also change:
     - Central config module (`limits` file)
     - `.env.example` and `HANDOFF.md` if env-driven
     - MIGRATION_BLUEPRINT_ADDENDUM.md constraint section
     - Any UI text that references limits

6) Change: RLS policies  
   - Also change:
     - This document’s security section
     - Any backend code that relied on previous access patterns
     - Tests/manual checks verifying no data leakage

7) Change: Evaluation / gold-set tables  
   - Also change:
     - `supabase_eval_schema.sql`
     - Types and ingest scripts
     - MIGRATION_BLUEPRINT_ADDENDUM.md “Evaluation Hooks” section

---

## 6. How to Use This Document

- New engineer:
  - Read this file first.
  - Then read `HANDOFF.md`.
  - Then skim `MIGRATION_BLUEPRINT_ADDENDUM.md` and `DECISION_LOG.md`.

- AI agent:
  - Treat the files listed here as canonical.
  - Do not modify or rely on other “truth-like” files without cross-checking them against these sources.

If you are about to change something and don’t see it mentioned here, either:

- Add it to this document, or  
- Treat it as non-canonical and safe to delete or refactor.
