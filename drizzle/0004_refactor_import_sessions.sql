-- First, drop the old import_sessions table
DROP TABLE IF EXISTS import_sessions CASCADE;

-- Create the new import_sessions table with updated schema
CREATE TABLE import_sessions (
  id TEXT PRIMARY KEY, -- Using text for nanoid
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL, -- 'chatgpt', 'claude', 'cline', 'cursor', 'gemini'
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_type TEXT NOT NULL,
  blob_url TEXT,
  total_prompts INTEGER NOT NULL DEFAULT 0,
  processed_prompts INTEGER NOT NULL DEFAULT 0,
  failed_prompts INTEGER NOT NULL DEFAULT 0,
  error TEXT,
  metadata JSONB,
  started_at TIMESTAMP NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX import_sessions_user_id_idx ON import_sessions(user_id);
CREATE INDEX import_sessions_platform_idx ON import_sessions(platform);
CREATE INDEX import_sessions_status_idx ON import_sessions(status);
CREATE INDEX import_sessions_started_at_idx ON import_sessions(started_at);