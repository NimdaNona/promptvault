import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { prompts, importSessions, users } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { nanoid } from "nanoid";

// Force Node.js runtime
export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return new Response("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const { prompts: importPrompts, source } = body;

    if (!Array.isArray(importPrompts) || importPrompts.length === 0) {
      return Response.json({ error: "No prompts provided" }, { status: 400 });
    }

    // Create import session with nanoid to match the expected format
    const sessionId = `import_${Date.now()}_${nanoid(6)}`;
    const [importSession] = await db.insert(importSessions).values({
      id: sessionId,
      userId,
      platform: source || 'file',
      status: 'processing',
      fileName: 'bulk-import.json',
      fileSize: JSON.stringify(importPrompts).length,
      fileType: 'application/json',
      totalPrompts: importPrompts.length,
      processedPrompts: 0,
      failedPrompts: 0,
      metadata: {},
    }).returning();

    // Import prompts in a transaction
    let imported = 0;
    let skipped = 0;

    await db.transaction(async (tx) => {
      for (const prompt of importPrompts) {
        try {
          // Validate prompt data
          if (!prompt.name || !prompt.content) {
            skipped++;
            continue;
          }

          // Create the prompt
          await tx.insert(prompts).values({
            userId,
            name: prompt.name.substring(0, 255), // Ensure name length
            content: prompt.content,
            folder: prompt.folder,
            model: prompt.metadata?.model || 'gpt-4',
            metadata: {
              ...prompt.metadata,
              importSessionId: importSession.id,
              importedAt: new Date().toISOString(),
            },
          });

          imported++;
        } catch (error) {
          console.error("Failed to import prompt:", error);
          skipped++;
        }
      }

      // Update import session with results
      await tx.update(importSessions)
        .set({
          status: 'completed',
          processedPrompts: imported,
          failedPrompts: skipped,
          completedAt: new Date(),
          metadata: {
            totalProcessed: importPrompts.length,
            completedAt: new Date().toISOString(),
          },
        })
        .where(eq(importSessions.id, importSession.id));

      // Update user's prompt count
      await tx.update(users)
        .set({ 
          promptCount: sql`prompt_count + ${imported}`,
          updatedAt: new Date()
        })
        .where(eq(users.id, userId));
    });

    return Response.json({
      success: true,
      imported,
      skipped,
      total: importPrompts.length,
      sessionId: importSession.id,
    });
  } catch (error) {
    console.error("Bulk import error:", error);
    return Response.json(
      { error: "Failed to import prompts" },
      { status: 500 }
    );
  }
}