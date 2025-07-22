import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { users, teamInvites } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { TIERS } from "@/lib/tiers";

// Force Node.js runtime
export const runtime = 'nodejs';

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(['viewer', 'editor']).default('viewer'),
});

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return new Response("Unauthorized", { status: 401 });
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      return new Response("User not found", { status: 404 });
    }

    // Check tier limits for team members
    const tierLimits = TIERS[user.tier as keyof typeof TIERS].limits;
    if (tierLimits.teamMembers === 1) {
      return Response.json({
        error: "Team features are not available in the free tier"
      }, { status: 403 });
    }

    const body = await req.json();
    const { email, role } = inviteSchema.parse(body);

    // Check if already invited
    const existingInvite = await db.query.teamInvites.findFirst({
      where: eq(teamInvites.invitedEmail, email),
    });

    if (existingInvite) {
      return Response.json({
        error: "User already invited"
      }, { status: 400 });
    }

    // Create invite
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiration

    const [invite] = await db.insert(teamInvites).values({
      invitedBy: userId,
      invitedEmail: email,
      role,
      expiresAt,
    }).returning();

    // TODO: Send invitation email via email service

    return Response.json({
      success: true,
      invite: {
        id: invite.id,
        email: invite.invitedEmail,
        role: invite.role,
        expiresAt: invite.expiresAt,
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: error.errors }, { status: 400 });
    }
    
    console.error("Team invite error:", error);
    return new Response("Internal server error", { status: 500 });
  }
}