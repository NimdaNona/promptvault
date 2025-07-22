import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { prompts, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { TIERS } from "@/lib/tiers";
import OptimizePromptView from "./optimize-view";

export default async function OptimizePromptPage({
  params,
}: {
  params: Promise<{ promptId: string }>;
}) {
  const { promptId } = await params;
  const { userId } = await auth();
  
  if (!userId) {
    redirect("/");
  }

  // Get user and check tier
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user) {
    redirect("/onboarding");
  }

  // Check if user has access to AI features
  const tierLimits = TIERS[user.tier as keyof typeof TIERS].limits;
  if (tierLimits.aiOptimizations === 0) {
    redirect(`/prompts/${promptId}/edit?error=upgrade_required`);
  }

  // Get the prompt
  const prompt = await db.query.prompts.findFirst({
    where: and(
      eq(prompts.id, promptId),
      eq(prompts.userId, userId)
    ),
  });

  if (!prompt) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <OptimizePromptView prompt={prompt} />
      </div>
    </div>
  );
}