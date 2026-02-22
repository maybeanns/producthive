-- ProductHive V2 Database Schema
-- Run this in your Supabase SQL Editor

-- ─── Jobs Table ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL CHECK (type IN ('prd', 'build', 'continue')),
    status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
    input JSONB NOT NULL DEFAULT '{}',
    result JSONB,
    model_id TEXT,
    user_id UUID,
    error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── PRD States ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS prd_states (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    state JSONB NOT NULL DEFAULT '{}',
    version INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Debate Rounds ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS debate_rounds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    round_number INT NOT NULL,
    agent_role TEXT NOT NULL,
    agent_name TEXT NOT NULL,
    model_used TEXT,
    content JSONB NOT NULL DEFAULT '{}',
    raw_text TEXT,
    used_fallback BOOLEAN DEFAULT false,
    fallback_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Generated Code Files ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS code_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    path TEXT NOT NULL,
    content TEXT NOT NULL,
    language TEXT,
    generated_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── User API Keys (encrypted at rest by Supabase) ──────────────────────────
CREATE TABLE IF NOT EXISTS user_api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    provider TEXT NOT NULL CHECK (provider IN ('openai', 'anthropic', 'groq')),
    encrypted_key TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, provider)
);

-- ─── Indexes ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_user_id ON jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_prd_states_job_id ON prd_states(job_id);
CREATE INDEX IF NOT EXISTS idx_debate_rounds_job_id ON debate_rounds(job_id);
CREATE INDEX IF NOT EXISTS idx_code_files_job_id ON code_files(job_id);
CREATE INDEX IF NOT EXISTS idx_user_api_keys_user_id ON user_api_keys(user_id);

-- ─── Row-Level Security ─────────────────────────────────────────────────────
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE prd_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE debate_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE code_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_api_keys ENABLE ROW LEVEL SECURITY;

-- Users can only see their own jobs
CREATE POLICY "Users can view own jobs" ON jobs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own jobs" ON jobs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Service role bypass (for workers)
CREATE POLICY "Service role full access to jobs" ON jobs
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to prd_states" ON prd_states
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to debate_rounds" ON debate_rounds
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to code_files" ON code_files
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to user_api_keys" ON user_api_keys
    FOR ALL USING (auth.role() = 'service_role');

-- Users can manage own API keys
CREATE POLICY "Users can manage own api keys" ON user_api_keys
    FOR ALL USING (auth.uid() = user_id);

-- ─── Updated_at trigger ──────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON jobs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_api_keys_updated_at BEFORE UPDATE ON user_api_keys
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
