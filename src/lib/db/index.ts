import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from './schema';

// Create database connection
const sql = neon(process.env.DATABASE_URL || process.env.POSTGRES_URL!);

// Create database instance
export const db = drizzle(sql, { schema });

// Export schema for easy access
export * from './schema';