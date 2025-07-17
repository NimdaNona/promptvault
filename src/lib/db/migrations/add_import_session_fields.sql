-- Add missing fields to import_sessions table for complete import functionality

-- Add status field with default 'pending'
ALTER TABLE import_sessions 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed'));

-- Add processedCount field
ALTER TABLE import_sessions 
ADD COLUMN IF NOT EXISTS processed_count INTEGER DEFAULT 0;

-- Add totalCount field  
ALTER TABLE import_sessions
ADD COLUMN IF NOT EXISTS total_count INTEGER DEFAULT 0;

-- Add error field for storing error messages
ALTER TABLE import_sessions
ADD COLUMN IF NOT EXISTS error TEXT;

-- Add results field for storing import results
ALTER TABLE import_sessions
ADD COLUMN IF NOT EXISTS results JSONB;

-- Add updatedAt timestamp
ALTER TABLE import_sessions
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Create index on status for faster queries
CREATE INDEX IF NOT EXISTS import_sessions_status_idx ON import_sessions(status);

-- Create index on updatedAt for sorting
CREATE INDEX IF NOT EXISTS import_sessions_updated_at_idx ON import_sessions(updated_at DESC);