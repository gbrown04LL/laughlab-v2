# Vercel Environment Variable Setup

This document provides the exact environment variables needed for Vercel deployment.

## Required Environment Variables

These variables **must** be set in Vercel for the application to start:

### 1. `OPENAI_API_KEY` (Required, Sensitive)

- **Value**: Your OpenAI API key (starts with `sk-proj-` or `sk-`)
- **Get from**: https://platform.openai.com/api-keys
- **Vercel Settings**: Mark as **Sensitive** (encrypted)
- **Environments**: Production, Preview, Development

### 2. `LAUGHLAB_LLM_MODEL` (Required, Sensitive)

- **Value**: The LLM model name to use (e.g., `gpt-5.2`, `gpt-4-turbo`, `gpt-4o`)
- **Note**: This variable is **required** with no default fallback
- **Vercel Settings**: Mark as **Sensitive** (encrypted)
- **Environments**: Production, Preview, Development

## Optional Environment Variables

These variables enable additional features but are not required for basic functionality:

### Supabase (Persistence & Rate Limiting)

#### `NEXT_PUBLIC_SUPABASE_URL`

- **Value**: Your Supabase project URL (e.g., `https://xxxxx.supabase.co`)
- **Get from**: Supabase Dashboard → Project Settings → API
- **Vercel Settings**: Not sensitive (public)
- **Environments**: Production, Preview, Development

#### `NEXT_PUBLIC_SUPABASE_ANON_KEY`

- **Value**: Your Supabase anonymous/public key
- **Get from**: Supabase Dashboard → Project Settings → API → anon public
- **Vercel Settings**: Not sensitive (public, protected by RLS)
- **Environments**: Production, Preview, Development

#### `SUPABASE_SERVICE_ROLE_KEY` (Server-Only)

- **Value**: Your Supabase service role key
- **Get from**: Supabase Dashboard → Project Settings → API → service_role
- **⚠️ WARNING**: This key has **elevated privileges** and bypasses RLS
- **Vercel Settings**: Mark as **Sensitive** (encrypted)
- **Environments**: Production, Preview, Development
- **Security**: This key is **never** exposed to client code

### OpenAI (Custom Endpoint)

#### `OPENAI_API_URL`

- **Value**: Custom OpenAI API endpoint URL
- **Default**: `https://api.openai.com/v1/chat/completions`
- **Use case**: Proxies, custom gateways, or alternative OpenAI-compatible APIs
- **Vercel Settings**: Not sensitive
- **Environments**: Production, Preview, Development

## Vercel Configuration Steps

### Via Vercel Dashboard

1. Go to your project in Vercel
2. Navigate to **Settings** → **Environment Variables**
3. Add each variable:
   - **Key**: Variable name (e.g., `OPENAI_API_KEY`)
   - **Value**: Your secret value
   - **Environments**: Select all (Production, Preview, Development)
   - **Sensitive**: Check for secrets (API keys, service role keys)
4. Click **Save**
5. Redeploy your application for changes to take effect

### Via Vercel CLI

```bash
# Required variables
vercel env add OPENAI_API_KEY production
vercel env add OPENAI_API_KEY preview
vercel env add OPENAI_API_KEY development

vercel env add LAUGHLAB_LLM_MODEL production
vercel env add LAUGHLAB_LLM_MODEL preview
vercel env add LAUGHLAB_LLM_MODEL development

# Optional Supabase variables
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production

# Repeat for preview and development as needed
```

## Environment Variable Validation

The application uses **centralized environment validation** via `src/lib/env.ts`:

- **Fail-fast behavior**: If required variables are missing, the app will crash at startup with a clear error message
- **Type safety**: All environment variables are validated with Zod schemas
- **No silent defaults**: `LAUGHLAB_LLM_MODEL` has no fallback - it must be explicitly set

### Example Validation Error

If `LAUGHLAB_LLM_MODEL` is missing, you'll see:

```
❌ Environment variable validation failed:

  - LAUGHLAB_LLM_MODEL: Required

💡 Fix: Add missing variables to your .env.local file or deployment environment.
📖 See .env.example for reference.
```

## Security Best Practices

### Server-Only Secrets

These variables are **never** exposed to client code:

- `OPENAI_API_KEY`
- `LAUGHLAB_LLM_MODEL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_URL`

They are only accessible in:
- API routes (`src/app/api/**/route.ts`)
- Server-only libraries (`src/lib/env.ts`, `src/lib/serverSupabaseClient.ts`)

### Client-Safe Variables

These variables are safe to expose to the browser (prefixed with `NEXT_PUBLIC_`):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

They are used by client-side Supabase SDK and protected by Row Level Security (RLS) policies.

## Troubleshooting

### Deployment Fails with "LAUGHLAB_LLM_MODEL is required"

**Cause**: The required `LAUGHLAB_LLM_MODEL` environment variable is not set in Vercel.

**Fix**:
1. Go to Vercel Dashboard → Settings → Environment Variables
2. Add `LAUGHLAB_LLM_MODEL` with value `gpt-5.2` (or your preferred model)
3. Mark as **Sensitive**
4. Select all environments (Production, Preview, Development)
5. Redeploy

### Changes Not Taking Effect

**Cause**: Environment variable changes require a redeploy.

**Fix**:
1. After updating environment variables in Vercel
2. Go to **Deployments** tab
3. Click **Redeploy** on the latest deployment
4. Or push a new commit to trigger automatic deployment

### "OPENAI_API_KEY must start with 'sk-'" Error

**Cause**: Invalid API key format.

**Fix**:
1. Verify your API key from https://platform.openai.com/api-keys
2. Ensure it starts with `sk-proj-` or `sk-`
3. Update the value in Vercel environment variables
4. Redeploy

## Migration from Old Variable Names

If you're migrating from an older version of the codebase:

| Old Variable | New Variable | Action |
|--------------|--------------|--------|
| `LLM_MODEL_NAME` | `LAUGHLAB_LLM_MODEL` | Rename in Vercel |
| `ANTHROPIC_API_KEY` | `OPENAI_API_KEY` | Replace (different provider) |
| `SUPABASE_SERVICE_KEY` | `SUPABASE_SERVICE_ROLE_KEY` | Rename (both work as aliases) |

## Verification Checklist

Before deploying to production, verify:

- [ ] `OPENAI_API_KEY` is set and marked as **Sensitive**
- [ ] `LAUGHLAB_LLM_MODEL` is set and marked as **Sensitive**
- [ ] Optional Supabase variables are set if using persistence
- [ ] `SUPABASE_SERVICE_ROLE_KEY` is marked as **Sensitive** (if used)
- [ ] All variables are set for all environments (Production, Preview, Development)
- [ ] Application starts without validation errors
- [ ] Analysis API route works correctly

## Support

For issues related to:
- **Environment variable validation**: Check `src/lib/env.ts`
- **API key errors**: Verify OpenAI API key at https://platform.openai.com/api-keys
- **Supabase connection**: Check Supabase Dashboard → Project Settings → API
- **Vercel deployment**: See https://vercel.com/docs/environment-variables

---

**Last Updated**: 2026-01-05  
**Related Files**: `src/lib/env.ts`, `.env.example`, `HANDOFF.md`
