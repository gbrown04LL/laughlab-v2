-- ===========================================
-- LAUGH LAB EVALUATION HARNESS SCHEMA
-- ===========================================

-- 1. GOLD SCRIPTS
-- Canonical scripts used for evaluation
CREATE TABLE IF NOT EXISTS gold_scripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  script_text TEXT NOT NULL, -- For small/medium scripts
  script_storage_path TEXT, -- For large scripts in Storage
  format TEXT NOT NULL CHECK (format IN ('sitcom', 'feature', 'sketch', 'standup', 'auto')),
  tags TEXT[], -- e.g., ['dialogue-heavy', 'physical', 'callback-rich']
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. GOLD EXPECTED RESULTS
-- The "correct" answers for each script
CREATE TABLE IF NOT EXISTS gold_expected_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  script_id UUID REFERENCES gold_scripts(id) ON DELETE CASCADE,
  version_label TEXT NOT NULL DEFAULT 'default', -- e.g., 'v1', 'strict-mode'
  
  -- Hard metrics targets (JSONB allows flexibility)
  expected_metrics JSONB NOT NULL, 
  -- Example: { "overallScore": 75, "totalJokes": 12, "gaps": [{"start": 10, "end": 20}] }
  
  -- Prompt B assertions (Soft metrics)
  prompt_b_assertions JSONB,
  -- Example: { "must_mention": ["callback on line 45"], "min_word_count": 250 }
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE
);

-- 3. EVALUATION RUNS
-- A single execution of the test suite
CREATE TABLE IF NOT EXISTS eval_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_version TEXT NOT NULL, -- e.g., 'prompt-a-v2.1'
  model_version TEXT NOT NULL, -- e.g., 'claude-3-5-sonnet-20241022'
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
  
  -- Aggregate results
  summary_metrics JSONB,
  -- Example: { "exact_match_rate": 0.85, "avg_score_delta": 2.4 }
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- 4. EVALUATION RUN RESULTS
-- Detailed results for each script in a run
CREATE TABLE IF NOT EXISTS eval_run_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID REFERENCES eval_runs(id) ON DELETE CASCADE,
  script_id UUID REFERENCES gold_scripts(id),
  
  -- Actual output from the system
  actual_analysis JSONB NOT NULL,
  actual_coach_note TEXT,
  
  -- Computed diffs
  metrics_diff JSONB,
  -- Example: { "overallScore_delta": -2, "missing_gaps": 1 }
  
  passed BOOLEAN NOT NULL DEFAULT FALSE,
  failure_reasons TEXT[],
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_gold_expected_script ON gold_expected_results(script_id);
CREATE INDEX IF NOT EXISTS idx_eval_results_run ON eval_run_results(run_id);
CREATE INDEX IF NOT EXISTS idx_eval_runs_created ON eval_runs(created_at DESC);

-- RLS Policies (Internal only - restrict to service role or admin)
ALTER TABLE gold_scripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE gold_expected_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE eval_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE eval_run_results ENABLE ROW LEVEL SECURITY;

-- Allow read/write for authenticated service role (adjust as needed for your team)
CREATE POLICY "Enable all access for service role" ON gold_scripts
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Enable all access for service role" ON gold_expected_results
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Enable all access for service role" ON eval_runs
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Enable all access for service role" ON eval_run_results
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
