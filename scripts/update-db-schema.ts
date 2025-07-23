import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';
import path from 'path';

// Load environment variables
config({ path: path.resolve(process.cwd(), '.env.local') });

const sql = neon(process.env.DATABASE_URL!);

async function updateSchema() {
  console.log('Starting database schema update...');
  
  try {
    // Start transaction
    await sql`BEGIN`;

    console.log('Renaming source column to platform...');
    await sql`ALTER TABLE import_sessions RENAME COLUMN source TO platform`;

    console.log('Adding new columns...');
    await sql`
      ALTER TABLE import_sessions 
      ADD COLUMN IF NOT EXISTS file_name TEXT DEFAULT 'unknown.json',
      ADD COLUMN IF NOT EXISTS file_size INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS file_type TEXT DEFAULT 'application/json',
      ADD COLUMN IF NOT EXISTS blob_url TEXT,
      ADD COLUMN IF NOT EXISTS total_prompts INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS processed_prompts INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS failed_prompts INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS started_at TIMESTAMP DEFAULT NOW(),
      ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP
    `;

    console.log('Updating existing rows...');
    await sql`
      UPDATE import_sessions 
      SET 
        file_name = COALESCE(metadata->>'fileName', 'unknown.json'),
        file_size = COALESCE((metadata->>'fileSize')::INTEGER, 0),
        file_type = COALESCE(metadata->>'fileType', 'application/json'),
        total_prompts = COALESCE(total_count, 0),
        processed_prompts = COALESCE(imported_count, 0),
        failed_prompts = COALESCE(skipped_count, 0),
        started_at = created_at
      WHERE file_name = 'unknown.json'
    `;

    console.log('Setting NOT NULL constraints...');
    await sql`
      ALTER TABLE import_sessions 
      ALTER COLUMN file_name SET NOT NULL,
      ALTER COLUMN file_size SET NOT NULL,
      ALTER COLUMN file_type SET NOT NULL,
      ALTER COLUMN total_prompts SET NOT NULL,
      ALTER COLUMN processed_prompts SET NOT NULL,
      ALTER COLUMN failed_prompts SET NOT NULL,
      ALTER COLUMN started_at SET NOT NULL
    `;

    console.log('Dropping old columns...');
    await sql`
      ALTER TABLE import_sessions 
      DROP COLUMN IF EXISTS imported_count,
      DROP COLUMN IF EXISTS skipped_count,
      DROP COLUMN IF EXISTS processed_count,
      DROP COLUMN IF EXISTS total_count,
      DROP COLUMN IF EXISTS results,
      DROP COLUMN IF EXISTS created_at,
      DROP COLUMN IF EXISTS updated_at
    `;

    console.log('Dropping old indexes...');
    await sql`DROP INDEX IF EXISTS import_sessions_source_idx`;
    await sql`DROP INDEX IF EXISTS import_sessions_updated_at_idx`;

    console.log('Creating new indexes...');
    await sql`CREATE INDEX IF NOT EXISTS import_sessions_platform_idx ON import_sessions(platform)`;
    await sql`CREATE INDEX IF NOT EXISTS import_sessions_started_at_idx ON import_sessions(started_at)`;

    // Commit transaction
    await sql`COMMIT`;
    
    console.log('Schema update completed successfully!');
  } catch (error) {
    console.error('Error updating schema:', error);
    await sql`ROLLBACK`;
    throw error;
  }
}

updateSchema().catch(console.error);