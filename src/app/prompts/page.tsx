import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import PromptsView from "./prompts-view";

export default async function PromptsPage() {
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
      <PromptsView 
        userId={userId}
        userTier={user.tier}
        promptCount={user.promptCount}
      />
    </div>
  );
}