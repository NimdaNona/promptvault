import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { users, prompts, promptVersions, shares } from "@/lib/db/schema";
import { eq, desc, and, gte, sql } from "drizzle-orm";
import DashboardClient from "./dashboard-client";
import { Toaster } from "sonner";

export default async function DashboardPage() {
  const { userId } = await auth();
  
  if (!userId) {
    redirect("/");
  }

  // Check if user exists in database
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  // If user doesn't exist in our database, redirect to onboarding
  if (!user) {
    redirect("/onboarding");
  }

  // Get analytics data
  const [userPrompts, recentVersions, activeShares] = await Promise.all([
    // Get all user prompts for analytics
    db.query.prompts.findMany({
      where: eq(prompts.userId, userId),
      with: {
        versions: true,
        tags: true,
      },
    }),
    // Get recent versions (last 7 days)
    db.query.promptVersions.findMany({
      where: and(
        eq(promptVersions.createdBy, userId),
        gte(promptVersions.createdAt, new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
      ),
      orderBy: desc(promptVersions.createdAt),
      limit: 10,
    }),
    // Get active shares
    db.query.shares.findMany({
      where: and(
        eq(shares.sharedBy, userId),
        gte(shares.expiresAt, new Date())
      ),
    }),
  ]);

  // Calculate analytics
  const analytics = {
    totalPrompts: userPrompts.length,
    totalVersions: userPrompts.reduce((acc, p) => acc + (p.versions?.length || 0), 0),
    publicPrompts: userPrompts.filter(p => p.isPublic).length,
    activeShares: activeShares.length,
    recentActivity: recentVersions.length,
    promptsByFolder: userPrompts.reduce((acc, p) => {
      const folder = p.folder || 'Uncategorized';
      acc[folder] = (acc[folder] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    tier: user.tier,
    promptCount: user.promptCount,
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <DashboardClient analytics={analytics} />
      </div>
      <Toaster position="bottom-right" />
    </div>
  );
}