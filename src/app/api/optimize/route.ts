import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { optimizePrompt, evaluatePrompt, generatePromptVariants } from "@/lib/openai";
import { TIERS } from "@/lib/stripe";

const optimizeSchema = z.object({
  prompt: z.string().min(1),
  model: z.string().optional(),
  action: z.enum(['optimize', 'evaluate', 'variants']).default('optimize'),
  variantCount: z.number().min(1).max(5).optional(),
});

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return new Response("Unauthorized", { status: 401 });
    }

    // Check user tier for access to AI features
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      return new Response("User not found", { status: 404 });
    }

    // Check tier limits for AI optimization
    const tierLimits = TIERS[user.tier as keyof typeof TIERS].limits;
    if (tierLimits.aiOptimizations === 0) {
      return new Response(
        JSON.stringify({ 
          error: "Feature not available", 
          message: "AI optimization is available for Pro and Enterprise users. Please upgrade to access this feature." 
        }), 
        { 
          status: 403,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    const body = await req.json();
    const { prompt, model, action, variantCount } = optimizeSchema.parse(body);

    let result;

    switch (action) {
      case 'optimize':
        result = await optimizePrompt(prompt, model);
        break;
      
      case 'evaluate':
        result = await evaluatePrompt(prompt);
        break;
      
      case 'variants':
        const variants = await generatePromptVariants(prompt, variantCount || 3);
        result = { variants };
        break;
      
      default:
        return new Response("Invalid action", { status: 400 });
    }

    return Response.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response(JSON.stringify(error.errors), { status: 400 });
    }
    
    console.error('Optimization error:', error);
    return new Response("Failed to process optimization request", { status: 500 });
  }
}