import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { users, prompts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// Force Node.js runtime for transaction support
export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const { userId: authUserId } = await auth();
    
    if (!authUserId) {
      return new Response("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const { userId, email, name, prompt } = body;

    // Verify the userId matches the authenticated user
    if (userId !== authUserId) {
      return new Response("Unauthorized", { status: 401 });
    }

    // Check if user already exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (existingUser) {
      return new Response("User already onboarded", { status: 400 });
    }

    // Create user and first prompt in a transaction
    await db.transaction(async (tx) => {
      // Create user
      await tx.insert(users).values({
        id: userId,
        email,
        name,
      });

      // Create first prompt
      await tx.insert(prompts).values({
        userId,
        name: prompt.name,
        content: prompt.content,
        folder: prompt.folder,
      });
    });

    return new Response("Onboarding completed", { status: 200 });
  } catch (error) {
    console.error("Onboarding error:", error);
    return new Response("Internal server error", { status: 500 });
  }
}