# Decision Log

This document records significant architectural and design decisions made during the development of Laugh Lab Pro. Each entry explains **what** was decided, **why**, and **what alternatives were considered**.

---

## 2025-01-04: Switch from Claude to ChatGPT 5.2

**Decision**: Replace Anthropic Claude with OpenAI ChatGPT 5.2 as the primary LLM for all analysis pipelines.

**Why**:
- ChatGPT 5.2 offers a 400k token context window, allowing full feature-length scripts (90-120 pages) to be analyzed in a single request without chunking.
- Improved agentic reasoning capabilities for multi-step analysis tasks.
- Better structured output support with JSON Schema enforcement.
- Cost optimization for high-volume analysis workloads.

**Alternatives Considered**:
- **Claude 3.5 Sonnet**: Good performance but smaller context window (200k) and higher cost per token.
- **Gemini 2.5 Flash**: Fast and cheap but less reliable for complex comedy analysis.
- **Multi-model fallback**: Considered but added complexity; deferred to future iteration.

**Impact**:
- Updated `src/lib/llm/client.ts` to use OpenAI SDK.
- Updated `runPromptA.ts` and `runPromptB.ts` to use OpenAI function calling format.
- Added `LLM_MODEL_NAME` environment variable (default: `gpt-5.2`).
- Legacy Anthropic client preserved in `anthropic_client.ts` for reference.

---

## 2025-01-04: Implement Comprehensive RLS Policies

**Decision**: Replace permissive RLS policies with strict user-ownership policies using `WITH CHECK` clauses on all tables.

**Why**:
- Previous policies allowed anonymous inserts and fingerprint-based reads, which were insecure.
- Fingerprint-based access is easily spoofable and doesn't scale with user authentication.
- `WITH CHECK` clauses prevent users from inserting rows they don't own.

**Alternatives Considered**:
- **Keep fingerprint-based access**: Rejected due to security concerns.
- **Service-role-only writes**: Too restrictive; would require all writes to go through Edge Functions.

**Impact**:
- Created `supabase_schema_v2.sql` with new tables: `profiles`, `scripts`, `jobs`, `stages`, `stage_outputs`.
- All tables now require `user_id` and enforce `auth.uid() = user_id` for all operations.
- Old `reports` table policy updated to require `user_id` ownership.

---

## 2025-01-04: Standardized Error Taxonomy

**Decision**: Create a centralized error classification system with standardized API error responses.

**Why**:
- Previous error handling was inconsistent, with some errors silently returning empty objects.
- No way to distinguish retryable errors from permanent failures.
- User-facing error messages were often too technical or too vague.

**Alternatives Considered**:
- **HTTP status codes only**: Insufficient granularity for client-side handling.
- **Free-form error strings**: Hard to parse programmatically.

**Impact**:
- Created `src/lib/errors.ts` with `ErrorCategory` enum and `LaughLabError` class.
- All API responses now use standardized `ApiError` contract with `code`, `message`, `retryable`, `retry_after_ms`, and `details`.
- Validation errors now throw instead of returning default objects.

---

## 2025-01-04: Central Configuration Module

**Decision**: Consolidate all limits, timeouts, and feature flags into a single configuration module.

**Why**:
- Magic numbers were scattered throughout the codebase.
- No single source of truth for tier-based limits.
- Environment variables were undocumented and inconsistent.

**Alternatives Considered**:
- **Database-driven config**: Too complex for current scale; deferred.
- **Per-file constants**: Rejected due to maintenance burden.

**Impact**:
- Created `src/config/limits.ts` with all limits, timeouts, and tier quotas.
- All code must import from this module; hardcoded values are prohibited.
- `.env.example` updated with all configurable variables.

---

## 2025-01-04: Prompt Versioning in Database

**Decision**: Add `prompt_version` and `model_version` columns to the `reports` table.

**Why**:
- No way to track which prompt version generated a given analysis.
- Makes A/B testing and regression detection impossible.
- Required for evaluation harness to compare results across prompt iterations.

**Alternatives Considered**:
- **Store in metadata JSONB**: Less queryable; rejected.
- **Separate version history table**: Over-engineered for current needs.

**Impact**:
- Added `prompt_version` and `model_version` to `reports` table.
- Analysis pipeline now records version with each report.
- Evaluation harness can filter and compare by version.

---

## 2025-01-04: Sitcom-Biased Defaults

**Decision**: Use sitcom format as the default when format is `auto` or unspecified.

**Why**:
- Sitcom is the most common format submitted by users (based on early usage data).
- Sitcom benchmarks (2.0 LPM, 5.5 LPJ) are reasonable middle-ground defaults.
- Explicit format selection is encouraged but not required.

**Alternatives Considered**:
- **Require explicit format**: Too much friction for casual users.
- **ML-based format detection**: Deferred to future iteration.

**Impact**:
- `FORMAT_TARGETS.auto` uses sitcom values.
- UI prompts users to select format but doesn't block on it.

---

## 2025-01-04: No Real-Time Analysis

**Decision**: Analysis is batch-only; no streaming or real-time feedback during analysis.

**Why**:
- Streaming adds significant complexity to error handling and state management.
- Full analysis takes 30-60 seconds; streaming partial results would be confusing.
- Batch model allows for better retry and recovery logic.

**Alternatives Considered**:
- **SSE streaming**: Considered for progress updates; deferred.
- **WebSocket connection**: Over-engineered for current use case.

**Impact**:
- Analysis API returns complete result or error; no partial states.
- Frontend shows progress bar based on job status polling.

---

## 2025-01-04: In-Memory Rate Limiting (Temporary)

**Decision**: Use in-memory rate limiting for MVP, with database-backed rate limiting planned.

**Why**:
- Simple to implement and sufficient for single-instance deployment.
- Database-backed rate limiting requires additional infrastructure.

**Known Limitations**:
- Rate limit state is lost on server restart.
- Does not scale across multiple server instances.

**Planned Migration**:
- Move to `usage_counters` table with `increment_usage_counter` function.
- Use Redis for high-frequency rate limiting if needed.

---

## Future Decisions (Pending)

- **Multi-model fallback**: Use cheaper model for simple scripts, premium model for complex.
- **Score normalization across genres**: Currently scores are not comparable across formats.
- **Long-term script storage**: Define retention policies for free vs. paid tiers.
- **Team/organization support**: Multi-user access to shared scripts and reports.
