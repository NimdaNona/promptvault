import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import ProfileForm from "./profile-form";

export default async function ProfilePage() {
  const { userId } = await auth();
  const clerkUser = await currentUser();
  
  if (!userId || !clerkUser) {
    redirect("/");
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user) {
    redirect("/onboarding");
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Profile</h3>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Manage your public profile information
        </p>
      </div>
      
      <ProfileForm 
        user={{
          id: user.id,
          email: user.email,
          name: user.name || "",
          imageUrl: clerkUser.imageUrl,
        }}
      />
    </div>
  );
}