import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import BillingClient from "./billing-client";

export default async function BillingPage() {
  const { userId } = await auth();
  
  if (!userId) {
    redirect("/");
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user) {
    redirect("/onboarding");
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-3xl font-bold mb-8">Billing & Subscription</h1>
        <BillingClient 
          currentTier={user.tier}
          hasSubscription={!!user.stripeSubscriptionId}
          promptCount={user.promptCount}
        />
      </div>
    </div>
  );
}