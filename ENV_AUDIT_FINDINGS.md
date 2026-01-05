# Environment Variable Audit Findings

## Executive Summary

This audit identifies all environment variable usage in the laughlab-v2 codebase and documents violations of server-only secret access patterns.

## Current State Analysis

### Environment Variables in Use

| Variable | Current Scope | Should Be | Usage Location | Issue |
|----------|---------------|-----------|----------------|-------|
| `OPENAI_API_KEY` | Server-only (✓) | Server-only | `src/lib/llm/client.ts`, `src/lib/llm/chatgptRequest.ts`, `src/app/api/analyze/route.ts` | Currently correct, but no startup validation |
| `LLM_MODEL_NAME` | Server-only (✓) | Should be `LAUGHLAB_LLM_MODEL` | `src/lib/llm/client.ts`, `src/lib/llm/chatgptRequest.ts` | **VIOLATION**: Hardcoded default `gpt-5.2` exists; should fail if missing |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only (✓) | Server-only | `src/lib/serverSupabaseClient.ts` | Currently correct |
| `SUPABASE_SERVICE_KEY` | Server-only (✓) | Server-only (alias) | `src/lib/serverSupabaseClient.ts` | Fallback alias for service role key |
| `SUPABASE_URL` | Server-only (✓) | Server-only | `src/lib/serverSupabaseClient.ts` | Currently correct |
| `NEXT_PUBLIC_SUPABASE_URL` | Client-exposed (✓) | Client-exposed | `src/lib/supabase.ts` | Correct - public URL for client SDK |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client-exposed (✓) | Client-exposed | `src/lib/supabase.ts` | Correct - anon key for client SDK |
| `OPENAI_API_URL` | Server-only (✓) | Server-only | `src/lib/llm/chatgptRequest.ts` | Currently correct |

### Architecture Overview

**Project Type**: Hybrid Vite + Next.js App Router
- **Client**: Vite-based React app in `client/` directory
- **Server**: Next.js App Router API routes in `src/app/api/`
- **Shared Libraries**: `src/lib/` (some server-only, some shared)

**Key Finding**: The project uses Next.js App Router for API routes only. Client code is built with Vite and served statically. This means:
- `src/app/api/**/route.ts` files are server-only
- `src/lib/` files are imported by both client and server code
- Files with `'use client'` directive are client-side

## Violations Identified

### 1. **CRITICAL**: Hardcoded LLM Model Default

**Location**: `src/lib/llm/client.ts:3`, `src/lib/llm/chatgptRequest.ts:9`

```typescript
const DEFAULT_MODEL = 'gpt-5.2';
```

**Issue**: The model is hardcoded with a fallback default. Per requirements, `LAUGHLAB_LLM_MODEL` must be required and validated at startup.

**Impact**: If the env var is not set, the system silently falls back to a hardcoded model, which violates the requirement.

### 2. **CRITICAL**: No Centralized Environment Validation

**Issue**: Environment variables are validated ad-hoc at usage sites rather than at startup.

**Impact**: 
- Errors only surface when code paths are executed
- No fail-fast behavior on missing required vars
- Inconsistent error messages

### 3. **MEDIUM**: Variable Naming Inconsistency

**Current**: `LLM_MODEL_NAME`
**Required**: `LAUGHLAB_LLM_MODEL`

**Issue**: The variable name doesn't follow the required naming convention.

### 4. **LOW**: Outdated .env.example

**Location**: `.env.example`

**Issues**:
- Still references `ANTHROPIC_API_KEY` (obsolete after migration to OpenAI)
- Missing `LAUGHLAB_LLM_MODEL` (required)
- Includes Stripe keys (Phase 2, not currently used)

## Files Requiring Changes

### Server-Only Files (Safe - No Client Exposure)

1. **`src/lib/llm/client.ts`** - LLM client initialization
   - Uses `process.env.OPENAI_API_KEY`
   - Uses `process.env.LLM_MODEL_NAME`
   - **Action**: Remove hardcoded default, rename to `LAUGHLAB_LLM_MODEL`

2. **`src/lib/llm/chatgptRequest.ts`** - OpenAI API wrapper
   - Uses `process.env.OPENAI_API_KEY`
   - Uses `process.env.LLM_MODEL_NAME`
   - Uses `process.env.OPENAI_API_URL`
   - **Action**: Remove hardcoded default, rename to `LAUGHLAB_LLM_MODEL`

3. **`src/lib/serverSupabaseClient.ts`** - Server Supabase client
   - Uses `process.env.SUPABASE_URL`
   - Uses `process.env.SUPABASE_SERVICE_ROLE_KEY`
   - Uses `process.env.SUPABASE_SERVICE_KEY` (fallback)
   - Uses `process.env.NEXT_PUBLIC_SUPABASE_URL` (fallback)
   - **Action**: No changes needed (already server-only)

4. **`src/app/api/analyze/route.ts`** - Analysis API route
   - Uses `process.env.OPENAI_API_KEY` (check only)
   - **Action**: Remove check (will be validated at startup)

### Client-Safe Files (Public Env Vars Only)

1. **`src/lib/supabase.ts`** - Client Supabase helpers
   - Uses `process.env.NEXT_PUBLIC_SUPABASE_URL`
   - Uses `process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **Action**: No changes needed (public vars are safe)

### Files NOT Using Env Vars

- `src/lib/ratelimit.ts` - No direct env var usage (uses serverSupabaseClient)
- `src/lib/llm/anthropic_client.ts` - **OBSOLETE** (should be deleted per migration docs)

## Verification: No Client-Side Secret Exposure

**Method**: Searched for `process.env` and `import.meta.env` in all client-side code.

**Result**: ✅ **PASS** - No client-side files (with `'use client'` directive or in `client/` directory) directly access server secrets.

**Client-side files checked**:
- `src/app/analyze/page.tsx`
- `src/app/history/page.tsx`
- `src/app/report/page.tsx`
- `src/components/**/*.tsx`
- `client/src/**/*.tsx`

**Conclusion**: All secret access is properly isolated to server-side code.

## Upstash Redis Status

**Finding**: No Upstash Redis usage detected in current codebase.

**Evidence**:
- No imports of `@upstash/redis`
- No references to `UPSTASH_REDIS_REST_URL` or `UPSTASH_REDIS_REST_TOKEN` in source code
- Rate limiting uses in-memory store with optional Supabase persistence

**Conclusion**: Upstash variables mentioned in docs are not currently used. They should be removed from documentation or marked as "future enhancement."

## Recommended Changes

### Phase 1: Centralized Env Validation

Create `src/lib/env.ts` with Zod schema validation:
- Validate all required env vars at module load time
- Fail fast with clear error messages
- Export typed env object for type-safe access

### Phase 2: Refactor LLM Client

- Remove hardcoded `DEFAULT_MODEL` constants
- Rename `LLM_MODEL_NAME` → `LAUGHLAB_LLM_MODEL`
- Import validated env from centralized module
- Remove redundant checks in API routes

### Phase 3: Update Documentation

- Update `.env.example` to reflect current requirements
- Remove obsolete `ANTHROPIC_API_KEY`
- Add `LAUGHLAB_LLM_MODEL` as required
- Update `HANDOFF.md`, `README.md`, and migration docs
- Mark Upstash vars as optional/future

### Phase 4: Vercel Configuration

Update Vercel environment variables:
- Add `LAUGHLAB_LLM_MODEL` (required, sensitive)
- Ensure `OPENAI_API_KEY` is marked sensitive
- Ensure `SUPABASE_SERVICE_ROLE_KEY` is marked sensitive
- Remove or document Upstash vars as unused

## Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| Hardcoded model default allows silent failures | **HIGH** | Remove default, require explicit env var |
| Late validation causes runtime errors | **MEDIUM** | Add startup validation with Zod |
| Inconsistent variable naming | **LOW** | Standardize on `LAUGHLAB_LLM_MODEL` |
| Outdated documentation | **LOW** | Update all docs and examples |

## Next Steps

1. ✅ Complete audit (this document)
2. ⏳ Implement centralized env validation module
3. ⏳ Refactor LLM client and chatgptRequest
4. ⏳ Update all documentation
5. ⏳ Create PR with checklist
6. ⏳ Update Vercel environment variables

---

**Audit Date**: 2026-01-05  
**Auditor**: Manus AI (Senior Engineer)  
**Status**: Complete
