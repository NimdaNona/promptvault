import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// Force Node.js runtime
export const runtime = 'nodejs';

export async function POST(req: Request) {
  let authUserId: string | null = null;
  
  try {
    const authResult = await auth();
    authUserId = authResult.userId;
    
    if (!authUserId) {
      return new Response("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const { userId, email, name } = body;

    // Verify the userId matches the authenticated user
    if (userId !== authUserId) {
      return new Response("Unauthorized", { status: 401 });
    }

    // Check if user already exists by ID or email
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

    // Also check by email to prevent duplicate email errors
    const existingUserByEmail = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (existingUserByEmail) {
      // User with this email already exists, return success
      return new Response(JSON.stringify({ message: "User already exists", userId: existingUserByEmail.id }), { 
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
    
    // If it's a duplicate key error, return success anyway
    if (error instanceof Error && error.message.includes('duplicate key')) {
      console.log("User already exists (caught in error), returning success");
      // Try to get userId from the error context or use the authUserId
      const responseUserId = authUserId || 'unknown';
      return new Response(JSON.stringify({ message: "User already exists", userId: responseUserId }), { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return new Response("Internal server error", { status: 500 });
  }
}