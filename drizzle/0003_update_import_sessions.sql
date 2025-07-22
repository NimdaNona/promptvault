-- Update import_sessions table
ALTER TABLE "import_sessions" ADD COLUMN IF NOT EXISTS "platform" text NOT NULL DEFAULT 'file';
ALTER TABLE "import_sessions" ADD COLUMN IF NOT EXISTS "file_name" text NOT NULL DEFAULT '';
ALTER TABLE "import_sessions" ADD COLUMN IF NOT EXISTS "file_size" integer NOT NULL DEFAULT 0;
ALTER TABLE "import_sessions" ADD COLUMN IF NOT EXISTS "file_type" text NOT NULL DEFAULT 'text/plain';
ALTER TABLE "import_sessions" ADD COLUMN IF NOT EXISTS "blob_url" text;
ALTER TABLE "import_sessions" ADD COLUMN IF NOT EXISTS "total_prompts" integer NOT NULL DEFAULT 0;
ALTER TABLE "import_sessions" ADD COLUMN IF NOT EXISTS "processed_prompts" integer NOT NULL DEFAULT 0;
ALTER TABLE "import_sessions" ADD COLUMN IF NOT EXISTS "failed_prompts" integer NOT NULL DEFAULT 0;
ALTER TABLE "import_sessions" ADD COLUMN IF NOT EXISTS "started_at" timestamp NOT NULL DEFAULT now();
ALTER TABLE "import_sessions" ADD COLUMN IF NOT EXISTS "completed_at" timestamp;

-- Drop old columns if they exist
ALTER TABLE "import_sessions" DROP COLUMN IF EXISTS "source";
ALTER TABLE "import_sessions" DROP COLUMN IF EXISTS "imported_count";
ALTER TABLE "import_sessions" DROP COLUMN IF EXISTS "skipped_count";
ALTER TABLE "import_sessions" DROP COLUMN IF EXISTS "processed_count";
ALTER TABLE "import_sessions" DROP COLUMN IF EXISTS "total_count";
ALTER TABLE "import_sessions" DROP COLUMN IF EXISTS "results";
ALTER TABLE "import_sessions" DROP COLUMN IF EXISTS "created_at";
ALTER TABLE "import_sessions" DROP COLUMN IF EXISTS "updated_at";

-- Update indexes
DROP INDEX IF EXISTS "import_sessions_source_idx";
DROP INDEX IF EXISTS "import_sessions_updated_at_idx";
CREATE INDEX IF NOT EXISTS "import_sessions_platform_idx" ON "import_sessions" ("platform");
CREATE INDEX IF NOT EXISTS "import_sessions_started_at_idx" ON "import_sessions" ("started_at");

-- Remove defaults after migration
ALTER TABLE "import_sessions" ALTER COLUMN "platform" DROP DEFAULT;
ALTER TABLE "import_sessions" ALTER COLUMN "file_name" DROP DEFAULT;
ALTER TABLE "import_sessions" ALTER COLUMN "file_size" DROP DEFAULT;
ALTER TABLE "import_sessions" ALTER COLUMN "file_type" DROP DEFAULT;