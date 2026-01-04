# Handoff Guide

This document provides everything you need to set up, run, and operate Laugh Lab Pro. If you are picking this up cold, follow these steps in order.

---

## 1. Prerequisites

Before starting, ensure you have the following installed on your machine:

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | 18+ | JavaScript runtime |
| pnpm | 8+ | Package manager |
| Git | 2.30+ | Version control |
| Supabase CLI | Latest | Database management (optional) |

---

## 2. Environment Setup

Clone the repository and install dependencies:

```bash
gh repo clone gbrown04LL/laughlab-v2
cd laughlab-v2
pnpm install
```

Create a `.env.local` file with the following variables:

```bash
# Required: LLM Configuration
ANTHROPIC_API_KEY=sk-ant-api03-...       # Legacy, kept for reference
OPENAI_API_KEY=sk-proj-...                # Primary LLM provider
LLM_MODEL_NAME=gpt-5.2                    # Model to use for analysis

# Required: Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...          # Server-side only, never expose

# Required: Application URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Optional: Rate Limiting
RATE_LIMIT_PER_MINUTE=5
RATE_LIMIT_PER_HOUR=20
RATE_LIMIT_PER_DAY=50

# Optional: Timeouts (milliseconds)
LLM_TIMEOUT_MS=120000
DB_TIMEOUT_MS=30000

# Optional: Feature Flags
FEATURE_PROMPT_B_ENABLED=true
FEATURE_CHARACTER_ANALYSIS=true
FEATURE_CALLBACK_ANALYSIS=true
FEATURE_EVAL_HARNESS=false
```

---

## 3. Running Locally

Start the development server:

```bash
pnpm run dev
```

The application will be available at `http://localhost:3000`.

To run the Next.js production build locally:

```bash
pnpm run build
pnpm run start
```

---

## 4. Database Setup

The application uses Supabase for data persistence. To apply the schema to a new project:

1. Create a new Supabase project at [supabase.com](https://supabase.com).
2. Copy the SQL from `supabase_schema_v2.sql` and run it in the Supabase SQL Editor.
3. Copy the SQL from `supabase_eval_schema.sql` if you need the evaluation harness.
4. Update your `.env.local` with the new project credentials.

---

## 5. Key Commands

| Command | Description |
|---------|-------------|
| `pnpm run dev` | Start development server |
| `pnpm run build` | Build for production |
| `pnpm run start` | Start production server |
| `pnpm run lint` | Run ESLint |
| `pnpm run test` | Run test suite |
| `pnpm run typecheck` | Run TypeScript type checking |

---

## 6. Project Structure

```
laughlab-v2/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── api/                # API routes
│   │   │   └── analyze/        # Main analysis endpoint
│   │   ├── analyze/            # Script input page
│   │   └── report/             # Analysis report page
│   ├── components/             # React components
│   │   └── ui/                 # Reusable UI components
│   ├── config/                 # Central configuration
│   │   └── limits.ts           # All limits and constants
│   ├── lib/                    # Shared utilities
│   │   ├── llm/                # LLM client and prompts
│   │   ├── errors.ts           # Error taxonomy
│   │   ├── store.ts            # Zustand state management
│   │   ├── supabase.ts         # Supabase client
│   │   └── validation.ts       # Zod schemas
│   └── types/                  # TypeScript types
│       ├── index.ts            # Application types
│       └── db.generated.ts     # Database types
├── supabase_schema_v2.sql      # Production database schema
├── supabase_eval_schema.sql    # Evaluation harness schema
├── CANONICAL_SOURCES.md        # Source of truth definitions
├── DECISION_LOG.md             # Architectural decisions
└── HANDOFF.md                  # This file
```

---

## 7. Known Footguns

These are common pitfalls that can cause issues:

| Issue | Symptom | Solution |
|-------|---------|----------|
| Missing `OPENAI_API_KEY` | 401 errors on analysis | Add the key to `.env.local` |
| Wrong `LLM_MODEL_NAME` | 404 errors on analysis | Use `gpt-5.2` or a valid model |
| Stale Zustand state | Report page redirects to home | Clear localStorage and refresh |
| RLS policy violations | 403 errors on database operations | Ensure `user_id` matches `auth.uid()` |
| Missing `WITH CHECK` | Users can insert rows they don't own | Apply `supabase_schema_v2.sql` |

---

## 8. Testing

To run the test suite:

```bash
pnpm run test
```

To run specific tests:

```bash
pnpm run test -- --grep "analysis"
```

Manual testing checklist:

1. **Happy path**: Submit a sample script, verify report renders correctly.
2. **Rate limiting**: Submit 6 analyses in 1 minute, verify 6th is blocked.
3. **Validation**: Submit an empty script, verify error message.
4. **Cross-user access**: Attempt to read another user's report, verify 403.
5. **Stuck job recovery**: Start an analysis, kill the server, restart, verify job is marked failed.

---

## 9. Deployment

The application is deployed to Vercel. Deployments are triggered automatically on push to `main`.

To deploy manually:

```bash
vercel --prod
```

Environment variables must be configured in the Vercel dashboard under Project Settings > Environment Variables.

---

## 10. Monitoring and Debugging

To check server logs on Vercel:

```bash
vercel logs --follow
```

To check database activity:

1. Go to Supabase Dashboard > Database > Query Performance.
2. Check for slow queries or RLS policy violations.

To debug LLM issues:

1. Check the `next_server.log` for `[Analysis]` prefixed logs.
2. Verify the model name and API key are correct.
3. Check OpenAI status page for outages.

---

## 11. Contact and Escalation

For questions or issues, contact the project maintainer or open an issue on GitHub.
