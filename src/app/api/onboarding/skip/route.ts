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
      // User already exists, just return success
      return new Response(JSON.stringify({ message: "User already exists", userId }), { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Create user without initial prompt
    await db.insert(users).values({
      id: userId,
      email,
      name,
    });

    return new Response(JSON.stringify({ message: "User created successfully", userId }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error("Skip onboarding error:", error);
    return new Response("Internal server error", { status: 500 });
  }
}