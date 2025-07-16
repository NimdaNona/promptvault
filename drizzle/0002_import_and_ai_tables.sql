-- Import history tracking
CREATE TABLE IF NOT EXISTS import_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source TEXT NOT NULL, -- 'chatgpt', 'claude', 'cline', 'cursor', 'gemini', 'file'
  imported_count INTEGER DEFAULT 0,
  skipped_count INTEGER DEFAULT 0,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- AI optimization history
CREATE TABLE IF NOT EXISTS prompt_optimizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_id UUID NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
  original_content TEXT NOT NULL,
  optimized_content TEXT NOT NULL,
  improvements JSONB,
  score_before REAL,
  score_after REAL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Template library
CREATE TABLE IF NOT EXISTS prompt_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  content TEXT NOT NULL,
  variables JSONB,
  usage_count INTEGER DEFAULT 0,
  rating REAL,
  is_official BOOLEAN DEFAULT FALSE,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX import_sessions_user_id_idx ON import_sessions(user_id);
CREATE INDEX import_sessions_source_idx ON import_sessions(source);
CREATE INDEX prompt_optimizations_prompt_id_idx ON prompt_optimizations(prompt_id);
CREATE INDEX prompt_templates_category_idx ON prompt_templates(category);
CREATE INDEX prompt_templates_official_idx ON prompt_templates(is_official);