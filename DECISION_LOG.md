# Laugh Lab v2 — Decision Log

This document records major architectural and implementation decisions. Each entry explains **what** was decided, **why**, and **what alternatives were rejected**. This prevents future re-litigation of resolved decisions.

---

## Format

Each decision follows this template:
- **Decision**: What was decided
- **Date**: When the decision was made
- **Context**: Why the decision was needed
- **Options Considered**: What alternatives existed
- **Rationale**: Why this option was chosen
- **Consequences**: Trade-offs accepted
- **Status**: Active / Superseded / Under Review

---

## Decisions

### D001: Switch from Claude to ChatGPT 5.2

**Decision**: Use OpenAI's `gpt-5.2` as the primary LLM for all analysis pipelines.

**Date**: January 4, 2026

**Context**: The previous implementation used Claude (Anthropic). The switch was motivated by ChatGPT 5.2's capabilities that better fit our use case.

**Options Considered**:
1. Stay with Claude 3.5 Sonnet
2. Switch to GPT-4o
3. Switch to GPT-5.2
4. Implement multi-provider fallback

**Rationale**:
- GPT-5.2's 400k context window allows entire feature-length scripts (90-120 pages) in a single request
- This eliminates chunking/aggregation logic needed for smaller context windows
- Improves consistency of character and callback analysis across the full script
- Structured Outputs feature guarantees schema compliance at generation time
- Better agentic reasoning capabilities for complex analysis

**Consequences**:
- Legacy `anthropic_client.ts` is now dead code (should be deleted)
- `.env.example` needs updating (still references `ANTHROPIC_API_KEY`)
- `@anthropic-ai/sdk` can be removed from dependencies
- Existing prompts work without modification

**Status**: Active

---

### D002: Single-Request API Architecture

**Decision**: Process entire script analysis in a single synchronous API request rather than streaming or async job processing.

**Date**: December 2025

**Context**: Need to choose between streaming partial results, async job queue, or single-request pattern.

**Options Considered**:
1. Streaming (SSE) with partial results
2. Async job queue with polling
3. Single synchronous request with timeout
4. WebSocket connection

**Rationale**:
- Script analysis is an atomic operation—partial results aren't meaningful
- 60-second timeout is acceptable for the "analysis" UX (users expect to wait)
- Simpler to implement and debug than async patterns
- No need for job queue infrastructure
- Frontend state management is straightforward

**Consequences**:
- Maximum effective script size is limited by 60-second timeout
- No progress indication beyond "analyzing..."
- Cold starts may cause occasional timeouts
- Retries must restart from scratch

**Status**: Active

---

### D003: Schema-First Validation with Zod

**Decision**: Use Zod schemas as the single source of truth for LLM output validation, with safe defaults for missing/invalid fields.

**Date**: December 2025

**Context**: LLM outputs are inherently unreliable. Need a strategy for handling malformed responses.

**Options Considered**:
1. Trust LLM output (no validation)
2. Hard fail on any validation error
3. Schema validation with safe defaults
4. Multiple validation passes with repair attempts

**Rationale**:
- Hard failures create poor UX for users
- Safe defaults allow graceful degradation
- Zod provides runtime type safety matching TypeScript types
- Clamping numbers prevents NaN/Infinity propagation
- String truncation prevents memory issues

**Consequences**:
- Some analysis fields may silently use defaults
- Debugging requires checking if values are defaults or real
- Users may see generic feedback when LLM fails partially
- Must be careful not to mask systematic LLM issues

**Status**: Active

---

### D004: Tool Calling Over Raw JSON

**Decision**: Use OpenAI's function/tool calling feature rather than prompting for raw JSON in message content.

**Date**: January 2026

**Context**: Need reliable structured output from the LLM.

**Options Considered**:
1. Raw JSON in message content with parsing
2. Tool calling with function definitions
3. OpenAI Structured Outputs (JSON Schema mode)
4. Multiple small requests with simple outputs

**Rationale**:
- Tool calling forces the model to emit valid JSON matching the schema
- Reduces validation failure rate significantly
- `tool_choice: { type: "function", function: { name: "analyze_script" } }` guarantees the tool is used
- Arguments are already parsed as JSON, reducing parse errors

**Consequences**:
- Tied to OpenAI's tool calling API format
- Tool definitions are verbose (~200 lines of JSON schema)
- Provider switch would require adapting tool format

**Status**: Active

---

### D005: Heuristic Timeline Generation

**Decision**: Generate timeline data (segments, hotspots, coldspots) from joke analysis data using deterministic heuristics, not additional LLM inference.

**Date**: December 31, 2025

**Context**: Timeline page showed empty charts because generation logic was never implemented.

**Options Considered**:
1. Add timeline to Prompt A output
2. Separate LLM call for timeline
3. Heuristic generation from existing data
4. Skip timeline feature

**Rationale**:
- All required data exists in Prompt A output (jokes, gaps, metadata)
- Heuristic generation is instant (no additional API cost or latency)
- Results are deterministic and reproducible
- Avoids prompt complexity and potential for timeline-specific failures

**Consequences**:
- Timeline quality depends on joke detection quality
- Hot/cold spot identification is rule-based, not semantic
- Cannot detect "dramatic" or "emotional" moments
- Must maintain parity with joke analysis updates

**Status**: Active

---

### D006: Hard Fallback for Coach Note

**Decision**: If coach note generation fails for any reason, return a hard-coded generic fallback rather than blocking the report.

**Date**: December 2025

**Context**: Coach note is a "nice to have" prose section that occasionally fails.

**Options Considered**:
1. Retry coach note multiple times
2. Block report if coach note fails
3. Hard fallback with generic text
4. Omit coach note section on failure

**Rationale**:
- Coach note is flavor, not core analysis
- Users care most about scores, gaps, and punch-ups
- Generic fallback is better than no feedback
- Prevents cascade failure from blocking entire report

**Consequences**:
- Some users get generic coach feedback
- No indication to user that fallback was used
- Debugging requires checking logs
- Fallback text must be kept updated

**Status**: Active

---

### D007: Sitcom-Biased Format Defaults

**Decision**: When format benchmarks are unavailable or format is unknown, default to sitcom benchmarks.

**Date**: December 2025

**Context**: Need default values for LPM targets, percentiles, etc.

**Options Considered**:
1. Require explicit format selection
2. Default to sitcom (most common)
3. Default to most lenient benchmarks
4. Default to average across all formats

**Rationale**:
- Sitcom is the most common use case
- Sitcom benchmarks are "middle of the road" (not too strict/lenient)
- Feature writers and standup comedians typically know their format
- Auto-detection catches most cases anyway

**Consequences**:
- Standup scripts may show lower percentiles than expected
- Feature scripts may show higher LPM targets than appropriate
- Format auto-detection is important to get right

**Status**: Active

---

### D008: No Score Normalization Across Genres

**Decision**: Scores are format-specific and not normalized across genres. A 75 in sitcom is not comparable to a 75 in standup.

**Date**: December 2025

**Context**: Users asked for cross-genre comparisons.

**Options Considered**:
1. Normalize all scores to a universal scale
2. Keep format-specific scoring
3. Show both raw and normalized scores
4. Defer normalization to future phase

**Rationale**:
- Insufficient cross-genre training data
- Different genres have fundamentally different joke densities
- Premature normalization would mislead users
- Better to be accurate within format than wrong across formats

**Consequences**:
- Users cannot compare scripts across formats
- Percentile rankings are format-relative only
- Future normalization will require re-analysis of historical data

**Status**: Active

---

### D009: Hybrid Rate Limiting (In-Memory + Supabase)

**Decision**: Use in-memory rate limiting as primary, with Supabase persistence for cross-cold-start durability.

**Date**: December 2025

**Context**: Need rate limiting that works on Vercel (serverless with cold starts).

**Options Considered**:
1. In-memory only
2. Supabase only
3. Redis/Upstash
4. Hybrid in-memory + Supabase

**Rationale**:
- In-memory is fastest (no network hop)
- Supabase is already in stack (no new service)
- Cold starts reset in-memory, but Supabase persists
- Fallback to in-memory if Supabase unavailable

**Consequences**:
- Brief window after cold start where limits may reset
- Supabase adds latency to limit checks
- Must sync counters between memory and DB
- Complex fallback logic

**Status**: Active

---

### D010: Fingerprint-Based Anonymous Tracking (Phase 1)

**Decision**: Use browser fingerprinting rather than user authentication for identity in Phase 1.

**Date**: December 2025

**Context**: Need to track usage per-user without requiring sign-up.

**Options Considered**:
1. Require authentication from start
2. IP-based tracking only
3. Browser fingerprinting
4. No tracking (unlimited for all)

**Rationale**:
- Reduces friction for free tier users
- Fingerprinting is more reliable than IP (shared IPs, VPNs)
- Authentication adds complexity for MVP
- Schema already has `user_id` FK for future auth

**Consequences**:
- Users can bypass limits with new browser/profile
- No cross-device continuity
- Privacy considerations for fingerprinting
- Must migrate to auth in Phase 2

**Status**: Active (Phase 1 only)

---

## Open Decisions (Not Yet Made)

### D011: Prompt Versioning Storage

**Status**: Under Review

**Question**: Where should prompt versions be stored?

**Options**:
1. Add `prompt_version` column to `reports` table
2. Create separate `prompt_versions` table with FK
3. Store in `metadata` JSONB field

**Blocker**: Needs schema migration approval

---

### D012: Error Taxonomy Implementation

**Status**: Under Review

**Question**: How should error categories be represented in code?

**Options**:
1. TypeScript enum with values
2. String union type
3. Class hierarchy
4. Error code constants

**Blocker**: Needs frontend coordination for display

---

### D013: Gold Script Selection

**Status**: Under Review

**Question**: What scripts should be in the evaluation gold set?

**Options**:
1. Real industry scripts (requires licensing)
2. Synthetic test scripts
3. Public domain scripts
4. Mix of all three

**Blocker**: Legal review for industry scripts

---

## Superseded Decisions

### D000: Use Claude as Primary LLM

**Decision**: Use Anthropic's Claude as the primary LLM.

**Date**: November 2025

**Status**: Superseded by D001

**Superseded By**: D001 (Switch to ChatGPT 5.2)

**Reason**: GPT-5.2's larger context window and structured outputs better fit our use case.

---

**Document Version:** 1.0
**Last Updated:** January 4, 2026
