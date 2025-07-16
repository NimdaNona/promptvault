import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <DashboardClient />
      </div>
      <Toaster position="bottom-right" />
    </div>
  );
}