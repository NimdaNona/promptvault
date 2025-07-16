import { drizzle } from 'drizzle-orm/vercel-postgres';
import { sql } from '@vercel/postgres';
import * as schema from './schema';

// Create database instance
export const db = drizzle(sql, { schema });

// Export schema for easy access
export * from './schema';