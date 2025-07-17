import { db } from "./index";
import { users, prompts, tags, promptTags, importSessions } from "./schema";
import { eq } from "drizzle-orm";

/**
 * Seeds test data for the import system
 * Run with: npx tsx src/lib/db/seed-import-data.ts
 */
async function seedImportData() {
  console.log("🌱 Starting import data seed...");

  try {
    // Find a test user (you'll need to replace this with your actual test user ID)
    const testUser = await db.query.users.findFirst({
      where: eq(users.clerkId, "user_2p3WiPFGgBcDeFgHiJkL") // Replace with your test user clerk ID
    });

    if (!testUser) {
      console.error("❌ Test user not found. Please update the clerkId in the seed script.");
      return;
    }

    console.log(`✅ Found test user: ${testUser.email}`);

    // Create test import sessions
    const [clineImportSession] = await db.insert(importSessions).values({
      userId: testUser.id,
      source: 'cline',
      status: 'completed',
      importedCount: 5,
      skippedCount: 2,
      processedCount: 7,
      totalCount: 7,
      metadata: {
        fileCount: 3,
        totalSize: 45678,
        processingTime: 3456,
        completedAt: new Date().toISOString()
      },
      results: {
        imported: 5,
        skipped: 2,
        errors: [],
        warnings: ['2 duplicate prompts detected and skipped']
      }
    }).returning();

    console.log("✅ Created Cline import session");

    // Create sample tags
    const tagData = [
      { name: 'React', color: '#3B82F6' },
      { name: 'TypeScript', color: '#10B981' },
      { name: 'Code Generation', color: '#F59E0B' },
      { name: 'Debugging', color: '#EF4444' },
      { name: 'Refactoring', color: '#8B5CF6' }
    ];

    const createdTags = await db.insert(tags).values(
      tagData.map(tag => ({
        ...tag,
        userId: testUser.id
      }))
    ).returning();

    console.log(`✅ Created ${createdTags.length} tags`);

    // Create sample prompts imported from Cline
    const clinePrompts = [
      {
        name: "Fix TypeScript error in React component",
        content: "I'm getting a TypeScript error in my React component. The error says 'Property 'user' does not exist on type 'never''. Here's my code:\n\n```typescript\nconst UserProfile = () => {\n  const { data, isLoading } = useQuery(['user'], fetchUser);\n  \n  if (isLoading) return <div>Loading...</div>;\n  \n  return <div>{data.user.name}</div>;\n}\n```\n\nHow can I fix this type error?",
        folder: "Code Generation/React",
        metadata: {
          source: 'cline',
          conversationId: 'cline-task-fix-ts-error',
          conversationTitle: 'Fix TypeScript error in React component',
          timestamp: Date.now() - 86400000, // 1 day ago
          model: 'claude-3',
          importSessionId: clineImportSession.id,
          aiAnalysis: {
            category: 'Debugging',
            complexity: 'moderate',
            suggestedFolder: 'Debugging/TypeScript'
          }
        }
      },
      {
        name: "Implement dark mode toggle",
        content: "Please help me implement a dark mode toggle for my Next.js application. I want to:\n1. Use Tailwind CSS for styling\n2. Persist the preference in localStorage\n3. Respect system preferences\n4. Add a toggle button in the header",
        folder: "UI/UX",
        metadata: {
          source: 'cline',
          conversationId: 'cline-task-dark-mode',
          conversationTitle: 'Implement dark mode toggle',
          timestamp: Date.now() - 172800000, // 2 days ago
          model: 'gpt-4',
          importSessionId: clineImportSession.id,
          aiAnalysis: {
            category: 'UI/UX',
            complexity: 'complex',
            suggestedFolder: 'UI/UX/Dark Mode'
          }
        }
      },
      {
        name: "Optimize database query performance",
        content: "My database query is running slowly. Here's the query:\n\n```sql\nSELECT u.*, COUNT(p.id) as post_count\nFROM users u\nLEFT JOIN posts p ON p.user_id = u.id\nWHERE u.created_at > '2024-01-01'\nGROUP BY u.id\nORDER BY post_count DESC\nLIMIT 100;\n```\n\nThe users table has 1M rows and posts has 10M rows. How can I optimize this?",
        folder: "Database",
        metadata: {
          source: 'cline',
          conversationId: 'cline-task-db-optimize',
          conversationTitle: 'Optimize database query',
          timestamp: Date.now() - 259200000, // 3 days ago
          model: 'claude-3',
          importSessionId: clineImportSession.id,
          aiAnalysis: {
            category: 'Performance',
            complexity: 'complex',
            suggestedFolder: 'Database/Optimization'
          }
        }
      },
      {
        name: "Write unit tests for authentication service",
        content: "I need to write comprehensive unit tests for my authentication service. The service handles:\n- User registration\n- Login with email/password\n- JWT token generation and validation\n- Password reset flow\n\nI'm using Jest and TypeScript. Can you help me write thorough tests?",
        folder: "Testing",
        metadata: {
          source: 'cline',
          conversationId: 'cline-task-auth-tests',
          conversationTitle: 'Write auth service tests',
          timestamp: Date.now() - 345600000, // 4 days ago
          model: 'gpt-4',
          importSessionId: clineImportSession.id,
          aiAnalysis: {
            category: 'Testing',
            complexity: 'complex',
            suggestedFolder: 'Testing/Unit Tests'
          }
        }
      },
      {
        name: "Refactor API endpoints to follow REST conventions",
        content: "My API endpoints are inconsistent. Current structure:\n- GET /getUsers\n- POST /createNewUser\n- PUT /updateUserInfo/:id\n- DELETE /removeUser/:id\n\nCan you help me refactor these to follow proper REST conventions?",
        folder: "API Development",
        metadata: {
          source: 'cline',
          conversationId: 'cline-task-api-refactor',
          conversationTitle: 'Refactor API endpoints',
          timestamp: Date.now() - 432000000, // 5 days ago
          model: 'claude-3',
          importSessionId: clineImportSession.id,
          aiAnalysis: {
            category: 'Refactoring',
            complexity: 'simple',
            suggestedFolder: 'API Development/REST'
          }
        }
      }
    ];

    const createdPrompts = await db.insert(prompts).values(
      clinePrompts.map(prompt => ({
        ...prompt,
        userId: testUser.id,
        model: prompt.metadata.model || 'gpt-4',
        createdAt: new Date(prompt.metadata.timestamp),
        updatedAt: new Date(prompt.metadata.timestamp)
      }))
    ).returning();

    console.log(`✅ Created ${createdPrompts.length} Cline-imported prompts`);

    // Create prompt-tag associations
    const promptTagAssociations = [
      { promptIndex: 0, tagNames: ['React', 'TypeScript', 'Debugging'] },
      { promptIndex: 1, tagNames: ['React', 'UI/UX'] },
      { promptIndex: 2, tagNames: ['Database', 'Performance'] },
      { promptIndex: 3, tagNames: ['Testing', 'TypeScript'] },
      { promptIndex: 4, tagNames: ['API Development', 'Refactoring'] }
    ];

    for (const association of promptTagAssociations) {
      const prompt = createdPrompts[association.promptIndex];
      const relevantTags = createdTags.filter(tag => 
        association.tagNames.includes(tag.name)
      );

      for (const tag of relevantTags) {
        await db.insert(promptTags).values({
          promptId: prompt.id,
          tagId: tag.id
        }).onConflictDoNothing();
      }
    }

    console.log("✅ Created prompt-tag associations");

    // Update user's prompt count
    await db.update(users)
      .set({ 
        promptCount: testUser.promptCount + createdPrompts.length,
        updatedAt: new Date()
      })
      .where(eq(users.id, testUser.id));

    console.log("✅ Updated user prompt count");

    // Create another import session for different sources
    await db.insert(importSessions).values([
      {
        userId: testUser.id,
        source: 'chatgpt',
        status: 'completed',
        importedCount: 12,
        skippedCount: 3,
        processedCount: 15,
        totalCount: 15,
        metadata: {
          fileCount: 1,
          totalSize: 123456,
          processingTime: 5678
        }
      },
      {
        userId: testUser.id,
        source: 'claude',
        status: 'failed',
        importedCount: 0,
        skippedCount: 0,
        processedCount: 0,
        totalCount: 10,
        error: 'Invalid file format',
        metadata: {
          fileCount: 1,
          totalSize: 34567
        }
      }
    ]);

    console.log("✅ Created additional import sessions for testing");

    console.log("\n🎉 Import data seed completed successfully!");
    console.log(`   - Created ${createdPrompts.length} imported prompts`);
    console.log(`   - Created ${createdTags.length} tags`);
    console.log(`   - Created 3 import sessions`);
    console.log("\n📝 Note: Remember to update the test user clerkId in this script!");

  } catch (error) {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  }

  process.exit(0);
}

// Run the seed
seedImportData();