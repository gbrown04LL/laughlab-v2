-- ==========================================
-- LAUGH LAB PRO - DATABASE SCHEMA
-- ==========================================

-- 1. Create the reports table
CREATE TABLE IF NOT EXISTS public.reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    user_id UUID REFERENCES auth.users(id), -- Optional: for when we add auth
    fingerprint TEXT, -- For anonymous tracking
    title TEXT NOT NULL,
    format TEXT NOT NULL,
    overall_score INTEGER NOT NULL,
    analysis_data JSONB NOT NULL, -- The full FullAnalysis object
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- 3. Create policies
-- Allow anonymous users to insert reports (for now)
CREATE POLICY "Allow anonymous inserts" ON public.reports
    FOR INSERT WITH CHECK (true);

-- Allow users to read their own reports based on fingerprint (anonymous)
-- Or by user_id (if authenticated)
DROP POLICY IF EXISTS "Allow users to read their own reports" ON public.reports;
CREATE POLICY "Allow users to read their own reports" ON public.reports
    FOR SELECT USING (
        (auth.uid() = user_id) OR
        (
            fingerprint IS NOT NULL AND
            fingerprint = COALESCE(
                (current_setting('request.jwt.claims', true)::jsonb ->> 'fingerprint'),
                current_setting('request.headers.x-client-fingerprint', true)
            )
        )
    );

-- 4. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_reports_user_id ON public.reports(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_fingerprint ON public.reports(fingerprint);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON public.reports(created_at DESC);

-- Telemetry (Prompt A metadata)
ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS prompt_a_model TEXT,
  ADD COLUMN IF NOT EXISTS prompt_a_latency_ms INTEGER;
CREATE INDEX IF NOT EXISTS idx_reports_prompt_a_model ON public.reports(prompt_a_model);

-- ==========================================
-- USAGE / RATE LIMIT COUNTERS
-- ==========================================
CREATE TABLE IF NOT EXISTS public.usage_counters (
    key TEXT NOT NULL,
    window_type TEXT NOT NULL,
    window_start TIMESTAMPTZ NOT NULL,
    count INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT usage_counters_pkey PRIMARY KEY (key, window_type, window_start)
);

CREATE INDEX IF NOT EXISTS idx_usage_counters_window ON public.usage_counters(window_type, window_start);
CREATE INDEX IF NOT EXISTS idx_usage_counters_key ON public.usage_counters(key);

ALTER TABLE public.usage_counters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages usage counters" ON public.usage_counters
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

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
                  updated_at = timezone('utc'::text, now())
    RETURNING count INTO new_count;

    RETURN new_count;
END;
$$;
