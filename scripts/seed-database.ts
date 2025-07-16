import { db } from '../src/lib/db';
import { users } from '../src/lib/db/schema';
import dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../.env.local') });

async function seedDatabase() {
  try {
    console.log('Seeding database...');
    
    // Check if there are any users already
    const existingUsers = await db.query.users.findMany();
    
    if (existingUsers.length > 0) {
      console.log('Database already contains users. Skipping seed.');
      return;
    }

    // Note: In production, users are created via Clerk webhooks
    // This seed script is mainly for development/testing
    
    console.log('✅ Database seed complete!');
    console.log('Note: Users will be created automatically when they sign up via Clerk.');
    
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

seedDatabase();