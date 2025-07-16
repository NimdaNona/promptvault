import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { prompts, promptTags, tags, users } from "@/lib/db/schema";
import { eq, and, like, desc } from "drizzle-orm";
import { z } from "zod";
import { TIERS } from "@/lib/stripe";

// Schema for creating a prompt
const createPromptSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  content: z.string().min(1),
  model: z.string().optional().default("gpt-4"),
  folder: z.string().optional(),
  isPublic: z.boolean().optional().default(false),
  metadata: z.record(z.any()).optional(),
  tags: z.array(z.string()).optional(),
});

// GET /api/prompts - List user's prompts
export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search");
    const folder = searchParams.get("folder");
    const tag = searchParams.get("tag");

    // Build query conditions
    const conditions = [eq(prompts.userId, userId)];
    
    if (search) {
      conditions.push(like(prompts.name, `%${search}%`));
    }
    
    if (folder) {
      conditions.push(eq(prompts.folder, folder));
    }

    // Get prompts with tags
    const userPrompts = await db
      .select({
        prompt: prompts,
        tags: tags,
      })
      .from(prompts)
      .leftJoin(promptTags, eq(prompts.id, promptTags.promptId))
      .leftJoin(tags, eq(promptTags.tagId, tags.id))
      .where(and(...conditions))
      .orderBy(desc(prompts.updatedAt));

    // Group prompts with their tags
    const promptsMap = new Map();
    
    for (const row of userPrompts) {
      if (!promptsMap.has(row.prompt.id)) {
        promptsMap.set(row.prompt.id, {
          ...row.prompt,
          tags: [],
        });
      }
      
      if (row.tags) {
        promptsMap.get(row.prompt.id).tags.push(row.tags);
      }
    }

    // Filter by tag if specified
    let finalPrompts = Array.from(promptsMap.values());
    if (tag) {
      finalPrompts = finalPrompts.filter(p => 
        p.tags.some((t: any) => t.name === tag)
      );
    }

    return Response.json(finalPrompts);
  } catch (error) {
    console.error("Error fetching prompts:", error);
    return new Response("Internal server error", { status: 500 });
  }
}

// POST /api/prompts - Create a new prompt
export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return new Response("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const validatedData = createPromptSchema.parse(body);

    // Check user's prompt count for tier limits
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      return new Response("User not found", { status: 404 });
    }

    // Check tier limits
    const tierLimits = TIERS[user.tier as keyof typeof TIERS].limits;
    if (tierLimits.prompts !== -1 && user.promptCount >= tierLimits.prompts) {
      return new Response(
        JSON.stringify({ 
          error: "Prompt limit reached", 
          message: `You've reached the ${tierLimits.prompts} prompt limit for the ${user.tier} tier. Please upgrade to create more prompts.` 
        }), 
        { 
          status: 403,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    // Create prompt and handle tags
    const result = await db.transaction(async (tx) => {
      // Create the prompt
      const [newPrompt] = await tx
        .insert(prompts)
        .values({
          userId,
          name: validatedData.name,
          description: validatedData.description,
          content: validatedData.content,
          model: validatedData.model,
          folder: validatedData.folder,
          isPublic: validatedData.isPublic,
          metadata: validatedData.metadata,
        })
        .returning();

      // Handle tags if provided
      if (validatedData.tags && validatedData.tags.length > 0) {
        for (const tagName of validatedData.tags) {
          // Find or create tag
          let tagRecord = await tx.query.tags.findFirst({
            where: and(eq(tags.userId, userId), eq(tags.name, tagName)),
          });

          if (!tagRecord) {
            const [newTag] = await tx
              .insert(tags)
              .values({
                name: tagName,
                userId,
              })
              .returning();
            tagRecord = newTag;
          }

          // Link tag to prompt
          await tx.insert(promptTags).values({
            promptId: newPrompt.id,
            tagId: tagRecord.id,
          });
        }
      }

      // Update user's prompt count
      await tx
        .update(users)
        .set({ 
          promptCount: user.promptCount + 1,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));

      return newPrompt;
    });

    return Response.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response(JSON.stringify(error.errors), { status: 400 });
    }
    
    console.error("Error creating prompt:", error);
    return new Response("Internal server error", { status: 500 });
  }
}