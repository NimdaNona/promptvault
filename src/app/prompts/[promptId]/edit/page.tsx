import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { prompts } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import EditPromptForm from "./edit-prompt-form";

export default async function EditPromptPage({
  params,
}: {
  params: Promise<{ promptId: string }>;
}) {
  const { promptId } = await params;
  const { userId } = await auth();
  
  if (!userId) {
    redirect("/");
  }

  // Fetch the prompt
  const prompt = await db.query.prompts.findFirst({
    where: and(
      eq(prompts.id, promptId),
      eq(prompts.userId, userId)
    ),
    with: {
      versions: {
        orderBy: (versions, { desc }) => [desc(versions.version)],
        limit: 10,
      },
      tags: {
        with: {
          tag: true,
        },
      },
    },
  });

  if (!prompt) {
    redirect("/dashboard");
  }

  const formattedPrompt = {
    ...prompt,
    description: prompt.description || undefined,
    model: prompt.model || undefined,
    folder: prompt.folder || undefined,
    tags: prompt.tags.map(pt => pt.tag),
    versions: prompt.versions.map(v => ({
      ...v,
      changeMessage: v.changeMessage || undefined,
      createdAt: v.createdAt.toISOString(),
    })),
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-3xl font-bold mb-8">Edit Prompt</h1>
        <EditPromptForm prompt={formattedPrompt} />
      </div>
    </div>
  );
}