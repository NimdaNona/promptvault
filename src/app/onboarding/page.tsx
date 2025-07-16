import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import OnboardingWizard from "./onboarding-wizard";

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
    <OnboardingWizard 
      userId={userId} 
      email={clerkUser.emailAddresses[0]?.emailAddress || ""} 
      name={`${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim()}
    />
  );
}