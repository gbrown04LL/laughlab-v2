// ===========================================
// AUTO-GENERATED FROM SUPABASE SCHEMA
// DO NOT EDIT BY HAND
// Generated from: supabase_schema_v2.sql
// ===========================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserTier = 'free' | 'starter' | 'professional' | 'enterprise';
export type ScriptFormat = 'sitcom' | 'feature' | 'sketch' | 'standup' | 'auto';
export type JobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
export type StageStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          tier: UserTier;
          analyses_this_month: number;
          usage_month_key: string;
          fingerprint: string | null;
          metadata: Json;
        };
        Insert: {
          id: string;
          created_at?: string;
          updated_at?: string;
          tier?: UserTier;
          analyses_this_month?: number;
          usage_month_key?: string;
          fingerprint?: string | null;
          metadata?: Json;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          tier?: UserTier;
          analyses_this_month?: number;
          usage_month_key?: string;
          fingerprint?: string | null;
          metadata?: Json;
        };
      };
      scripts: {
        Row: {
          id: string;
          created_at: string;
          user_id: string;
          title: string;
          format: ScriptFormat;
          script_text: string | null;
          storage_path: string | null;
          char_count: number;
          metadata: Json;
          expires_at: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          user_id: string;
          title: string;
          format: ScriptFormat;
          script_text?: string | null;
          storage_path?: string | null;
          char_count?: number;
          metadata?: Json;
          expires_at?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          user_id?: string;
          title?: string;
          format?: ScriptFormat;
          script_text?: string | null;
          storage_path?: string | null;
          char_count?: number;
          metadata?: Json;
          expires_at?: string | null;
        };
      };
      jobs: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          user_id: string;
          script_id: string | null;
          status: JobStatus;
          current_stage: string | null;
          progress: number;
          error_code: string | null;
          error_message: string | null;
          heartbeat_at: string;
          metadata: Json;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          user_id: string;
          script_id?: string | null;
          status?: JobStatus;
          current_stage?: string | null;
          progress?: number;
          error_code?: string | null;
          error_message?: string | null;
          heartbeat_at?: string;
          metadata?: Json;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          user_id?: string;
          script_id?: string | null;
          status?: JobStatus;
          current_stage?: string | null;
          progress?: number;
          error_code?: string | null;
          error_message?: string | null;
          heartbeat_at?: string;
          metadata?: Json;
        };
      };
      stages: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          job_id: string;
          user_id: string;
          stage_name: string;
          status: StageStatus;
          started_at: string | null;
          completed_at: string | null;
          error_code: string | null;
          error_message: string | null;
          retry_count: number;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          job_id: string;
          user_id: string;
          stage_name: string;
          status?: StageStatus;
          started_at?: string | null;
          completed_at?: string | null;
          error_code?: string | null;
          error_message?: string | null;
          retry_count?: number;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          job_id?: string;
          user_id?: string;
          stage_name?: string;
          status?: StageStatus;
          started_at?: string | null;
          completed_at?: string | null;
          error_code?: string | null;
          error_message?: string | null;
          retry_count?: number;
        };
      };
      stage_outputs: {
        Row: {
          id: string;
          created_at: string;
          stage_id: string;
          job_id: string;
          user_id: string;
          output_data: Json;
          tokens_used: number | null;
          latency_ms: number | null;
          model_version: string | null;
          prompt_version: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          stage_id: string;
          job_id: string;
          user_id: string;
          output_data: Json;
          tokens_used?: number | null;
          latency_ms?: number | null;
          model_version?: string | null;
          prompt_version?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          stage_id?: string;
          job_id?: string;
          user_id?: string;
          output_data?: Json;
          tokens_used?: number | null;
          latency_ms?: number | null;
          model_version?: string | null;
          prompt_version?: string | null;
        };
      };
      reports: {
        Row: {
          id: string;
          created_at: string;
          user_id: string;
          job_id: string | null;
          script_id: string | null;
          fingerprint: string | null;
          title: string;
          format: ScriptFormat;
          overall_score: number;
          analysis_data: Json;
          prompt_version: string | null;
          model_version: string | null;
          metadata: Json;
        };
        Insert: {
          id?: string;
          created_at?: string;
          user_id: string;
          job_id?: string | null;
          script_id?: string | null;
          fingerprint?: string | null;
          title: string;
          format: ScriptFormat;
          overall_score: number;
          analysis_data: Json;
          prompt_version?: string | null;
          model_version?: string | null;
          metadata?: Json;
        };
        Update: {
          id?: string;
          created_at?: string;
          user_id?: string;
          job_id?: string | null;
          script_id?: string | null;
          fingerprint?: string | null;
          title?: string;
          format?: ScriptFormat;
          overall_score?: number;
          analysis_data?: Json;
          prompt_version?: string | null;
          model_version?: string | null;
          metadata?: Json;
        };
      };
      usage_counters: {
        Row: {
          key: string;
          window_type: string;
          window_start: string;
          count: number;
          updated_at: string;
        };
        Insert: {
          key: string;
          window_type: string;
          window_start: string;
          count?: number;
          updated_at?: string;
        };
        Update: {
          key?: string;
          window_type?: string;
          window_start?: string;
          count?: number;
          updated_at?: string;
        };
      };
      // Evaluation tables
      gold_scripts: {
        Row: {
          id: string;
          title: string;
          script_text: string;
          script_storage_path: string | null;
          format: ScriptFormat;
          tags: string[] | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          script_text: string;
          script_storage_path?: string | null;
          format: ScriptFormat;
          tags?: string[] | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          script_text?: string;
          script_storage_path?: string | null;
          format?: ScriptFormat;
          tags?: string[] | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      gold_expected_results: {
        Row: {
          id: string;
          script_id: string;
          version_label: string;
          expected_metrics: Json;
          prompt_b_assertions: Json | null;
          created_at: string;
          is_active: boolean;
        };
        Insert: {
          id?: string;
          script_id: string;
          version_label?: string;
          expected_metrics: Json;
          prompt_b_assertions?: Json | null;
          created_at?: string;
          is_active?: boolean;
        };
        Update: {
          id?: string;
          script_id?: string;
          version_label?: string;
          expected_metrics?: Json;
          prompt_b_assertions?: Json | null;
          created_at?: string;
          is_active?: boolean;
        };
      };
      eval_runs: {
        Row: {
          id: string;
          prompt_version: string;
          model_version: string;
          status: 'running' | 'completed' | 'failed';
          summary_metrics: Json | null;
          created_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          prompt_version: string;
          model_version: string;
          status?: 'running' | 'completed' | 'failed';
          summary_metrics?: Json | null;
          created_at?: string;
          completed_at?: string | null;
        };
        Update: {
          id?: string;
          prompt_version?: string;
          model_version?: string;
          status?: 'running' | 'completed' | 'failed';
          summary_metrics?: Json | null;
          created_at?: string;
          completed_at?: string | null;
        };
      };
      eval_run_results: {
        Row: {
          id: string;
          run_id: string;
          script_id: string;
          actual_analysis: Json;
          actual_coach_note: string | null;
          metrics_diff: Json | null;
          passed: boolean;
          failure_reasons: string[] | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          run_id: string;
          script_id: string;
          actual_analysis: Json;
          actual_coach_note?: string | null;
          metrics_diff?: Json | null;
          passed?: boolean;
          failure_reasons?: string[] | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          run_id?: string;
          script_id?: string;
          actual_analysis?: Json;
          actual_coach_note?: string | null;
          metrics_diff?: Json | null;
          passed?: boolean;
          failure_reasons?: string[] | null;
          created_at?: string;
        };
      };
    };
    Functions: {
      increment_usage_counter: {
        Args: {
          p_key: string;
          p_window_type: string;
          p_window_start: string;
          p_amount?: number;
        };
        Returns: number;
      };
      update_job_heartbeat: {
        Args: {
          p_job_id: string;
        };
        Returns: void;
      };
      reap_stuck_jobs: {
        Args: {
          p_timeout_minutes?: number;
        };
        Returns: number;
      };
    };
  };
}

// Convenience type aliases
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Script = Database['public']['Tables']['scripts']['Row'];
export type Job = Database['public']['Tables']['jobs']['Row'];
export type Stage = Database['public']['Tables']['stages']['Row'];
export type StageOutput = Database['public']['Tables']['stage_outputs']['Row'];
export type Report = Database['public']['Tables']['reports']['Row'];
export type UsageCounter = Database['public']['Tables']['usage_counters']['Row'];
export type GoldScript = Database['public']['Tables']['gold_scripts']['Row'];
export type GoldExpectedResult = Database['public']['Tables']['gold_expected_results']['Row'];
export type EvalRun = Database['public']['Tables']['eval_runs']['Row'];
export type EvalRunResult = Database['public']['Tables']['eval_run_results']['Row'];

// Insert types
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert'];
export type ScriptInsert = Database['public']['Tables']['scripts']['Insert'];
export type JobInsert = Database['public']['Tables']['jobs']['Insert'];
export type StageInsert = Database['public']['Tables']['stages']['Insert'];
export type StageOutputInsert = Database['public']['Tables']['stage_outputs']['Insert'];
export type ReportInsert = Database['public']['Tables']['reports']['Insert'];

// Update types
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];
export type ScriptUpdate = Database['public']['Tables']['scripts']['Update'];
export type JobUpdate = Database['public']['Tables']['jobs']['Update'];
export type StageUpdate = Database['public']['Tables']['stages']['Update'];
export type StageOutputUpdate = Database['public']['Tables']['stage_outputs']['Update'];
export type ReportUpdate = Database['public']['Tables']['reports']['Update'];
