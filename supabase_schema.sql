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
CREATE POLICY "Allow users to read their own reports" ON public.reports
    FOR SELECT USING (
        (auth.uid() = user_id) OR 
        (fingerprint IS NOT NULL) -- We will filter by fingerprint in the query
    );

-- 4. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_reports_user_id ON public.reports(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_fingerprint ON public.reports(fingerprint);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON public.reports(created_at DESC);
