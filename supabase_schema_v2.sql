-- ==========================================
-- LAUGH LAB PRO - DATABASE SCHEMA V2
-- Security-Hardened with Proper RLS Policies
-- ==========================================

-- ==========================================
-- 1. USERS TABLE (extends auth.users)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'starter', 'professional', 'enterprise')),
    analyses_this_month INTEGER NOT NULL DEFAULT 0,
    usage_month_key TEXT NOT NULL DEFAULT to_char(NOW(), 'YYYY-MM'),
    fingerprint TEXT, -- For anonymous tracking before auth
    metadata JSONB DEFAULT '{}'::jsonb
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_profile" ON public.profiles
    FOR ALL
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- ==========================================
-- 2. SCRIPTS TABLE (user-uploaded scripts)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.scripts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    format TEXT NOT NULL CHECK (format IN ('sitcom', 'feature', 'sketch', 'standup', 'auto')),
    script_text TEXT, -- For small/medium scripts (< 500KB)
    storage_path TEXT, -- For large scripts in Storage bucket
    char_count INTEGER NOT NULL DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb,
    expires_at TIMESTAMPTZ -- For free tier auto-deletion
);

ALTER TABLE public.scripts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_owns_scripts" ON public.scripts
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_scripts_user_id ON public.scripts(user_id);
CREATE INDEX IF NOT EXISTS idx_scripts_expires_at ON public.scripts(expires_at) WHERE expires_at IS NOT NULL;

-- ==========================================
-- 3. JOBS TABLE (analysis job queue)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    script_id UUID REFERENCES public.scripts(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
    current_stage TEXT,
    progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    error_code TEXT,
    error_message TEXT,
    heartbeat_at TIMESTAMPTZ DEFAULT NOW(), -- For stuck-job detection
    metadata JSONB DEFAULT '{}'::jsonb
);

ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_owns_jobs" ON public.jobs
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_jobs_user_id ON public.jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON public.jobs(status) WHERE status IN ('pending', 'running');
CREATE INDEX IF NOT EXISTS idx_jobs_heartbeat ON public.jobs(heartbeat_at) WHERE status = 'running';

-- ==========================================
-- 4. STAGES TABLE (analysis pipeline stages)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.stages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    stage_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'skipped')),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    error_code TEXT,
    error_message TEXT,
    retry_count INTEGER NOT NULL DEFAULT 0,
    UNIQUE(job_id, stage_name)
);

ALTER TABLE public.stages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_owns_stages" ON public.stages
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_stages_job_id ON public.stages(job_id);
CREATE INDEX IF NOT EXISTS idx_stages_user_id ON public.stages(user_id);

-- ==========================================
-- 5. STAGE OUTPUTS TABLE (stage results)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.stage_outputs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    stage_id UUID NOT NULL REFERENCES public.stages(id) ON DELETE CASCADE,
    job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    output_data JSONB NOT NULL,
    tokens_used INTEGER,
    latency_ms INTEGER,
    model_version TEXT,
    prompt_version TEXT
);

ALTER TABLE public.stage_outputs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_owns_stage_outputs" ON public.stage_outputs
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_stage_outputs_stage_id ON public.stage_outputs(stage_id);
CREATE INDEX IF NOT EXISTS idx_stage_outputs_job_id ON public.stage_outputs(job_id);
CREATE INDEX IF NOT EXISTS idx_stage_outputs_user_id ON public.stage_outputs(user_id);

-- ==========================================
-- 6. REPORTS TABLE (final analysis reports)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
    script_id UUID REFERENCES public.scripts(id) ON DELETE SET NULL,
    fingerprint TEXT, -- For anonymous tracking (deprecated, use user_id)
    title TEXT NOT NULL,
    format TEXT NOT NULL CHECK (format IN ('sitcom', 'feature', 'sketch', 'standup', 'auto')),
    overall_score INTEGER NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
    analysis_data JSONB NOT NULL,
    prompt_version TEXT, -- Track which prompt version generated this
    model_version TEXT, -- Track which model generated this
    metadata JSONB DEFAULT '{}'::jsonb
);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Drop old insecure policies
DROP POLICY IF EXISTS "Allow anonymous inserts" ON public.reports;
DROP POLICY IF EXISTS "Allow users to read their own reports" ON public.reports;

-- New secure policies
CREATE POLICY "user_owns_reports" ON public.reports
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_reports_user_id ON public.reports(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_job_id ON public.reports(job_id);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON public.reports(created_at DESC);

-- ==========================================
-- 7. USAGE COUNTERS TABLE (rate limiting)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.usage_counters (
    key TEXT NOT NULL,
    window_type TEXT NOT NULL,
    window_start TIMESTAMPTZ NOT NULL,
    count INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT usage_counters_pkey PRIMARY KEY (key, window_type, window_start)
);

ALTER TABLE public.usage_counters ENABLE ROW LEVEL SECURITY;

-- Only service role can manage usage counters
CREATE POLICY "service_role_manages_usage_counters" ON public.usage_counters
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_usage_counters_window ON public.usage_counters(window_type, window_start);
CREATE INDEX IF NOT EXISTS idx_usage_counters_key ON public.usage_counters(key);

-- ==========================================
-- 8. HELPER FUNCTIONS
-- ==========================================

-- Increment usage counter (idempotent UPSERT)
CREATE OR REPLACE FUNCTION public.increment_usage_counter(
    p_key TEXT,
    p_window_type TEXT,
    p_window_start TIMESTAMPTZ,
    p_amount INTEGER DEFAULT 1
) RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    new_count INTEGER;
BEGIN
    INSERT INTO public.usage_counters(key, window_type, window_start, count)
    VALUES (p_key, p_window_type, p_window_start, p_amount)
    ON CONFLICT (key, window_type, window_start)
    DO UPDATE SET count = public.usage_counters.count + p_amount,
                  updated_at = NOW()
    RETURNING count INTO new_count;

    RETURN new_count;
END;
$$;

-- Update job heartbeat (for stuck-job detection)
CREATE OR REPLACE FUNCTION public.update_job_heartbeat(
    p_job_id UUID
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.jobs
    SET heartbeat_at = NOW(), updated_at = NOW()
    WHERE id = p_job_id AND status = 'running';
END;
$$;

-- Stuck job reaper (to be called by pg_cron)
CREATE OR REPLACE FUNCTION public.reap_stuck_jobs(
    p_timeout_minutes INTEGER DEFAULT 15
) RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    reaped_count INTEGER;
BEGIN
    UPDATE public.jobs
    SET status = 'failed',
        error_code = 'STUCK_JOB_TIMEOUT',
        error_message = 'Job timed out after ' || p_timeout_minutes || ' minutes without heartbeat',
        updated_at = NOW()
    WHERE status = 'running'
      AND heartbeat_at < NOW() - (p_timeout_minutes || ' minutes')::INTERVAL;
    
    GET DIAGNOSTICS reaped_count = ROW_COUNT;
    RETURN reaped_count;
END;
$$;

-- ==========================================
-- 9. STORAGE BUCKET POLICIES (SQL comments)
-- ==========================================
-- These must be applied via Supabase Dashboard or CLI:
--
-- Bucket: scripts
-- Policy: user_owns_script_files
-- SELECT: (bucket_id = 'scripts') AND (auth.uid()::text = (storage.foldername(name))[1])
-- INSERT: (bucket_id = 'scripts') AND (auth.uid()::text = (storage.foldername(name))[1])
-- UPDATE: (bucket_id = 'scripts') AND (auth.uid()::text = (storage.foldername(name))[1])
-- DELETE: (bucket_id = 'scripts') AND (auth.uid()::text = (storage.foldername(name))[1])
--
-- Bucket: reports
-- Policy: user_owns_report_files
-- SELECT: (bucket_id = 'reports') AND (auth.uid()::text = (storage.foldername(name))[1])
-- INSERT: (bucket_id = 'reports') AND (auth.uid()::text = (storage.foldername(name))[1])
-- UPDATE: (bucket_id = 'reports') AND (auth.uid()::text = (storage.foldername(name))[1])
-- DELETE: (bucket_id = 'reports') AND (auth.uid()::text = (storage.foldername(name))[1])
--
-- File naming convention: {user_id}/{job_id}/{filename}
-- This ensures RLS can enforce ownership via folder structure.

-- ==========================================
-- 10. COMPOSITE INDEXES FOR PERFORMANCE
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_jobs_user_status ON public.jobs(user_id, status);
CREATE INDEX IF NOT EXISTS idx_stages_job_status ON public.stages(job_id, status);
CREATE INDEX IF NOT EXISTS idx_reports_user_created ON public.reports(user_id, created_at DESC);
