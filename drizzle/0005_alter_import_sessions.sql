-- Alter import_sessions table to match new schema

-- 1. Rename 'source' column to 'platform'
ALTER TABLE import_sessions RENAME COLUMN source TO platform;

-- 2. Add new required columns with defaults first
ALTER TABLE import_sessions 
  ADD COLUMN IF NOT EXISTS file_name TEXT DEFAULT 'unknown.json',
  ADD COLUMN IF NOT EXISTS file_size INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS file_type TEXT DEFAULT 'application/json',
  ADD COLUMN IF NOT EXISTS blob_url TEXT,
  ADD COLUMN IF NOT EXISTS total_prompts INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS processed_prompts INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS failed_prompts INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMP DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;

-- 3. Update existing rows to have proper values
UPDATE import_sessions 
SET 
  file_name = COALESCE(metadata->>'fileName', 'unknown.json'),
  file_size = COALESCE((metadata->>'fileSize')::INTEGER, 0),
  file_type = COALESCE(metadata->>'fileType', 'application/json'),
  total_prompts = COALESCE(total_count, 0),
  processed_prompts = COALESCE(imported_count, 0),
  failed_prompts = COALESCE(skipped_count, 0),
  started_at = created_at
WHERE file_name = 'unknown.json';

-- 4. Now make the columns NOT NULL
ALTER TABLE import_sessions 
  ALTER COLUMN file_name SET NOT NULL,
  ALTER COLUMN file_size SET NOT NULL,
  ALTER COLUMN file_type SET NOT NULL,
  ALTER COLUMN total_prompts SET NOT NULL,
  ALTER COLUMN processed_prompts SET NOT NULL,
  ALTER COLUMN failed_prompts SET NOT NULL,
  ALTER COLUMN started_at SET NOT NULL;

-- 5. Drop old columns
ALTER TABLE import_sessions 
  DROP COLUMN IF EXISTS imported_count,
  DROP COLUMN IF EXISTS skipped_count,
  DROP COLUMN IF EXISTS processed_count,
  DROP COLUMN IF EXISTS total_count,
  DROP COLUMN IF EXISTS results,
  DROP COLUMN IF EXISTS created_at,
  DROP COLUMN IF EXISTS updated_at;

-- 6. Drop old indexes
DROP INDEX IF EXISTS import_sessions_source_idx;
DROP INDEX IF EXISTS import_sessions_updated_at_idx;

-- 7. Create new indexes
CREATE INDEX IF NOT EXISTS import_sessions_platform_idx ON import_sessions(platform);
CREATE INDEX IF NOT EXISTS import_sessions_started_at_idx ON import_sessions(started_at);