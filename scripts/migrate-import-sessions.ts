import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

async function migrateImportSessions() {
  try {
    console.log('Starting import_sessions table migration...');
    
    // Drop the old table
    await db.execute(sql`DROP TABLE IF EXISTS import_sessions CASCADE`);
    console.log('Dropped old import_sessions table');
    
    // Create the new table with updated schema
    await db.execute(sql`
      CREATE TABLE import_sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        platform TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
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
      )
    `);
    console.log('Created new import_sessions table');
    
    // Create indexes
    await db.execute(sql`CREATE INDEX import_sessions_user_id_idx ON import_sessions(user_id)`);
    await db.execute(sql`CREATE INDEX import_sessions_platform_idx ON import_sessions(platform)`);
    await db.execute(sql`CREATE INDEX import_sessions_status_idx ON import_sessions(status)`);
    await db.execute(sql`CREATE INDEX import_sessions_started_at_idx ON import_sessions(started_at)`);
    console.log('Created indexes');
    
    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrateImportSessions();