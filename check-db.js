const { neon } = require('@neondatabase/serverless');

const sql = neon('postgresql://neondb_owner:npg_pA8Xdbnw5Hrl@ep-lingering-silence-adj8yw5z-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require');

async function checkUser() {
  try {
    // Check if user exists
    const userResult = await sql`SELECT id, email, name FROM users WHERE id = 'user_30WkbNR3YZhT0cdcyeJyWxDyTK6'`;
    console.log('User lookup result:', userResult);
    
    // List all users
    const allUsers = await sql`SELECT id, email FROM users LIMIT 10`;
    console.log('\nAll users (first 10):', allUsers);
    
    // Check import_sessions structure
    const tableInfo = await sql`
      SELECT column_name, data_type, is_nullable, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'import_sessions' 
      ORDER BY ordinal_position
    `;
    console.log('\nimport_sessions columns:', tableInfo);
    
  } catch (error) {
    console.error('Database error:', error);
  }
}

checkUser();