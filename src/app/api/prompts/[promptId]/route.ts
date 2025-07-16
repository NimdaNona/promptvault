import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { prompts, promptVersions, promptTags, tags, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

// Schema for updating a prompt
const updatePromptSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  content: z.string().min(1).optional(),
  model: z.string().optional(),
  folder: z.string().optional(),
  isPublic: z.boolean().optional(),
  metadata: z.record(z.any()).optional(),
  tags: z.array(z.string()).optional(),
  changeMessage: z.string().optional(), // For version history
});

// GET /api/prompts/[promptId] - Get a single prompt
export async function GET(
  req: Request,
  { params }: { params: Promise<{ promptId: string }> }
) {
  try {
    const { promptId } = await params;
    const { userId } = await auth();
    
    if (!userId) {
      return new Response("Unauthorized", { status: 401 });
    }

    const prompt = await db.query.prompts.findFirst({
      where: and(
        eq(prompts.id, promptId),
        eq(prompts.userId, userId)
      ),
      with: {
        versions: {
          orderBy: (versions, { desc }) => [desc(versions.version)],
        },
        tags: {
          with: {
            tag: true,
          },
        },
      },
    });

    if (!prompt) {
      return new Response("Prompt not found", { status: 404 });
    }

    // Format the response
    const formattedPrompt = {
      ...prompt,
      tags: prompt.tags.map(pt => pt.tag),
    };

    return Response.json(formattedPrompt);
  } catch (error) {
    console.error("Error fetching prompt:", error);
    return new Response("Internal server error", { status: 500 });
  }
}

// PATCH /api/prompts/[promptId] - Update a prompt
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ promptId: string }> }
) {
  try {
    const { promptId } = await params;
    const { userId } = await auth();
    
    if (!userId) {
      return new Response("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const validatedData = updatePromptSchema.parse(body);

    // Check if prompt exists and belongs to user
    const existingPrompt = await db.query.prompts.findFirst({
      where: and(
        eq(prompts.id, promptId),
        eq(prompts.userId, userId)
      ),
    });

    if (!existingPrompt) {
      return new Response("Prompt not found", { status: 404 });
    }

    // Update prompt and create version if content changed
    const result = await db.transaction(async (tx) => {
      // If content is being updated, create a version
      if (validatedData.content && validatedData.content !== existingPrompt.content) {
        // Get the latest version number
        const latestVersion = await tx.query.promptVersions.findFirst({
          where: eq(promptVersions.promptId, promptId),
          orderBy: (versions, { desc }) => [desc(versions.version)],
        });

        const nextVersion = (latestVersion?.version || 0) + 1;

        // Create version record
        await tx.insert(promptVersions).values({
          promptId: promptId,
          version: nextVersion,
          content: existingPrompt.content, // Save the old content
          metadata: existingPrompt.metadata,
          changeMessage: validatedData.changeMessage || `Version ${nextVersion}`,
          createdBy: userId,
        });
      }

      // Update the prompt
      const [updatedPrompt] = await tx
        .update(prompts)
        .set({
          name: validatedData.name || existingPrompt.name,
          description: validatedData.description !== undefined ? validatedData.description : existingPrompt.description,
          content: validatedData.content || existingPrompt.content,
          model: validatedData.model || existingPrompt.model,
          folder: validatedData.folder !== undefined ? validatedData.folder : existingPrompt.folder,
          isPublic: validatedData.isPublic !== undefined ? validatedData.isPublic : existingPrompt.isPublic,
          metadata: validatedData.metadata || existingPrompt.metadata,
          updatedAt: new Date(),
        })
        .where(eq(prompts.id, promptId))
        .returning();

      // Update tags if provided
      if (validatedData.tags !== undefined) {
        // Remove existing tags
        await tx.delete(promptTags).where(eq(promptTags.promptId, promptId));

        // Add new tags
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
            promptId: promptId,
            tagId: tagRecord.id,
          });
        }
      }

      return updatedPrompt;
    });

    return Response.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response(JSON.stringify(error.errors), { status: 400 });
    }
    
    console.error("Error updating prompt:", error);
    return new Response("Internal server error", { status: 500 });
  }
}

// DELETE /api/prompts/[promptId] - Delete a prompt
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ promptId: string }> }
) {
  try {
    const { promptId } = await params;
    const { userId } = await auth();
    
    if (!userId) {
      return new Response("Unauthorized", { status: 401 });
    }

    // Check if prompt exists and belongs to user
    const existingPrompt = await db.query.prompts.findFirst({
      where: and(
        eq(prompts.id, promptId),
        eq(prompts.userId, userId)
      ),
    });

    if (!existingPrompt) {
      return new Response("Prompt not found", { status: 404 });
    }

    // Delete prompt (cascading will handle related records)
    await db.transaction(async (tx) => {
      await tx.delete(prompts).where(eq(prompts.id, promptId));
      
      // Update user's prompt count
      const user = await tx.query.users.findFirst({
        where: eq(users.id, userId),
      });
      
      if (user) {
        await tx
          .update(users)
          .set({ 
            promptCount: Math.max(0, user.promptCount - 1),
            updatedAt: new Date(),
          })
          .where(eq(users.id, userId));
      }
    });

    return new Response("Prompt deleted", { status: 200 });
  } catch (error) {
    console.error("Error deleting prompt:", error);
    return new Response("Internal server error", { status: 500 });
  }
}