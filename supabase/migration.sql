-- ============================================
-- Shareable Scope Links + Public Comments
-- Run this in Supabase SQL Editor
-- ============================================

-- 0. Add target_audience column if missing
ALTER TABLE scope_ai_outputs ADD COLUMN IF NOT EXISTS target_audience JSONB;

-- 1. scope_shares — unique share tokens per scope output
CREATE TABLE IF NOT EXISTS scope_shares (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  scope_ai_output_id BIGINT NOT NULL REFERENCES scope_ai_outputs(id) ON DELETE CASCADE,
  share_token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  is_active BOOLEAN DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_scope_shares_token ON scope_shares(share_token);

ALTER TABLE scope_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Creator can read own shares" ON scope_shares
  FOR SELECT USING (auth.uid() = created_by OR is_active = true);

CREATE POLICY "Creator can insert shares" ON scope_shares
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Creator can update own shares" ON scope_shares
  FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Creator can delete own shares" ON scope_shares
  FOR DELETE USING (auth.uid() = created_by);

-- 2. scope_comments — public comments with commenter info
CREATE TABLE IF NOT EXISTS scope_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  scope_share_id UUID NOT NULL REFERENCES scope_shares(id) ON DELETE CASCADE,
  commenter_name TEXT NOT NULL,
  commenter_email TEXT NOT NULL,
  comment_text TEXT NOT NULL,
  section_ref TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE scope_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can add comments" ON scope_comments
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can read comments" ON scope_comments
  FOR SELECT USING (true);
