import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { createCheckoutSession, createBillingPortalSession } from "@/lib/stripe";
import { z } from "zod";

const checkoutSchema = z.object({
  tier: z.enum(['pro', 'enterprise']),
});

// POST /api/billing - Create checkout session
export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return new Response("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const { tier } = checkoutSchema.parse(body);

    // Get user details
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      return new Response("User not found", { status: 404 });
    }

    // Create Stripe checkout session
    const session = await createCheckoutSession(userId, user.email, tier);

    return Response.json({ url: session.url });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response(JSON.stringify(error.errors), { status: 400 });
    }
    
    console.error("Billing error:", error);
    return new Response("Failed to create checkout session", { status: 500 });
  }
}

// GET /api/billing - Get billing portal URL
export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return new Response("Unauthorized", { status: 401 });
    }

    // Get user's Stripe customer ID
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user || !user.stripeCustomerId) {
      return new Response("No billing account found", { status: 404 });
    }

    // Create billing portal session
    const session = await createBillingPortalSession(user.stripeCustomerId);

    return Response.json({ url: session.url });
  } catch (error) {
    console.error("Billing portal error:", error);
    return new Response("Failed to create billing portal session", { status: 500 });
  }
}