import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function SettingsPage() {
  const { userId } = await auth();
  
  if (!userId) {
    redirect("/");
  }

  // Redirect to profile as the default settings page
  redirect("/settings/profile");
}