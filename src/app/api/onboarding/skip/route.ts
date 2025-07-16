import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// Force Node.js runtime
export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const { userId: authUserId } = await auth();
    
    if (!authUserId) {
      return new Response("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const { userId, email, name } = body;

    // Verify the userId matches the authenticated user
    if (userId !== authUserId) {
      return new Response("Unauthorized", { status: 401 });
    }

    // Check if user already exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (existingUser) {
      return new Response("User already exists", { status: 400 });
    }

    // Create user without initial prompt
    await db.insert(users).values({
      id: userId,
      email,
      name,
    });

    return new Response("User created successfully", { status: 200 });
  } catch (error) {
    console.error("Skip onboarding error:", error);
    return new Response("Internal server error", { status: 500 });
  }
}