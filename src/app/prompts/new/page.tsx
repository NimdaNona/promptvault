import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import PromptForm from "./prompt-form";

export default async function NewPromptPage() {
  const { userId } = await auth();
  
  if (!userId) {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <h1 className="text-3xl font-bold mb-8">Create New Prompt</h1>
        <PromptForm />
      </div>
    </div>
  );
}