import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool } from '@neondatabase/serverless';
import * as schema from './schema';

// Create database connection with pooling for transaction support
const pool = new Pool({ connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL! });

// Create database instance
export const db = drizzle(pool, { schema });

// Export schema for easy access
export * from './schema';