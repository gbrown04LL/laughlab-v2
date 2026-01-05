-- ==========================================
-- LAUGH LAB PRO - DATABASE SCHEMA
-- ==========================================

-- 1. Create the reports table
CREATE TABLE IF NOT EXISTS public.reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    user_id UUID REFERENCES auth.users(id),
    session_id UUID,
    title TEXT NOT NULL,
    format TEXT NOT NULL,
    overall_score INTEGER NOT NULL,
    analysis_data JSONB NOT NULL, -- The full FullAnalysis object
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Ensure exactly one ownership column is present
ALTER TABLE public.reports DROP CONSTRAINT IF EXISTS reports_owner_xor;
ALTER TABLE public.reports
  ADD CONSTRAINT reports_owner_xor CHECK (
    (user_id IS NOT NULL AND session_id IS NULL) OR
    (user_id IS NULL AND session_id IS NOT NULL)
  );

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- 3. Ownership policies (user OR server-issued session)
DROP POLICY IF EXISTS "reports_select_owner" ON public.reports;
DROP POLICY IF EXISTS "reports_insert_owner" ON public.reports;
DROP POLICY IF EXISTS "reports_update_owner" ON public.reports;

CREATE POLICY "reports_select_owner" ON public.reports
  FOR SELECT USING (
    (user_id IS NOT NULL AND user_id = auth.uid())
    OR
    (session_id IS NOT NULL AND session_id = current_setting('request.headers.x-session-id', true)::uuid)
  );

CREATE POLICY "reports_insert_owner" ON public.reports
  FOR INSERT WITH CHECK (
    (user_id IS NOT NULL AND user_id = auth.uid())
    OR
    (session_id IS NOT NULL AND session_id = current_setting('request.headers.x-session-id', true)::uuid)
  );

CREATE POLICY "reports_update_owner" ON public.reports
  FOR UPDATE USING (
    (user_id IS NOT NULL AND user_id = auth.uid())
    OR
    (session_id IS NOT NULL AND session_id = current_setting('request.headers.x-session-id', true)::uuid)
  )
  WITH CHECK (
    (user_id IS NOT NULL AND user_id = auth.uid())
    OR
    (session_id IS NOT NULL AND session_id = current_setting('request.headers.x-session-id', true)::uuid)
  );

-- 4. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_reports_user_id ON public.reports(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_session_id ON public.reports(session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON public.reports(created_at DESC);

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
