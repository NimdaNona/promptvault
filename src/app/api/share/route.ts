import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { shares, prompts } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { nanoid } from "nanoid";

const createShareSchema = z.object({
  promptId: z.string().uuid(),
  expiresIn: z.number().optional(), // hours
});

// POST /api/share - Create a share link
export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return new Response("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const { promptId, expiresIn } = createShareSchema.parse(body);

    // Check if prompt exists and belongs to user or is public
    const prompt = await db.query.prompts.findFirst({
      where: eq(prompts.id, promptId),
    });

    if (!prompt) {
      return new Response("Prompt not found", { status: 404 });
    }

    if (prompt.userId !== userId && !prompt.isPublic) {
      return new Response("Unauthorized to share this prompt", { status: 403 });
    }

    // Generate unique share code
    const shareCode = nanoid(10);
    
    // Calculate expiration date if provided
    const expiresAt = expiresIn 
      ? new Date(Date.now() + expiresIn * 60 * 60 * 1000)
      : null;

    // Create share record
    const [share] = await db
      .insert(shares)
      .values({
        promptId,
        sharedBy: userId,
        shareCode,
        expiresAt,
      })
      .returning();

    const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL}/share/${shareCode}`;

    return Response.json({
      shareUrl,
      shareCode,
      expiresAt,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response(JSON.stringify(error.errors), { status: 400 });
    }
    
    console.error("Share creation error:", error);
    return new Response("Failed to create share link", { status: 500 });
  }
}

// GET /api/share?promptId=xxx - Get share links for a prompt
export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const promptId = searchParams.get("promptId");

    if (!promptId) {
      return new Response("Prompt ID is required", { status: 400 });
    }

    // Verify ownership
    const prompt = await db.query.prompts.findFirst({
      where: and(
        eq(prompts.id, promptId),
        eq(prompts.userId, userId)
      ),
    });

    if (!prompt) {
      return new Response("Prompt not found", { status: 404 });
    }

    // Get all shares for this prompt
    const shareLinks = await db.query.shares.findMany({
      where: eq(shares.promptId, promptId),
      orderBy: (shares, { desc }) => [desc(shares.createdAt)],
    });

    return Response.json(shareLinks.map(share => ({
      ...share,
      shareUrl: `${process.env.NEXT_PUBLIC_APP_URL}/share/${share.shareCode}`,
      isExpired: share.expiresAt ? new Date(share.expiresAt) < new Date() : false,
    })));
  } catch (error) {
    console.error("Share retrieval error:", error);
    return new Response("Failed to retrieve share links", { status: 500 });
  }
}