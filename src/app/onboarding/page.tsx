import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import OnboardingForm from "./onboarding-form";

export default async function OnboardingPage() {
  const { userId } = await auth();
  const clerkUser = await currentUser();
  
  if (!userId || !clerkUser) {
    redirect("/");
  }

  // Check if user already exists
  const existingUser = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (existingUser) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
        <h1 className="text-2xl font-bold mb-2">Welcome to PromptVault!</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Let's get you set up with your first prompt.
        </p>
        
        <OnboardingForm 
          userId={userId} 
          email={clerkUser.emailAddresses[0]?.emailAddress || ""} 
          name={`${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim()}
        />
      </div>
    </div>
  );
}