import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Dashboard</h1>
        <p className="text-gray-600 dark:text-gray-400">Welcome to your PromptVault dashboard!</p>
        {/* Dashboard content will be added here */}
      </div>
    </div>
  );
}