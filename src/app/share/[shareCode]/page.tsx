import { db } from "@/lib/db";
import { shares, prompts, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import ShareView from "./share-view";

export default async function SharePage({
  params,
}: {
  params: Promise<{ shareCode: string }>;
}) {
  const { shareCode } = await params;

  // Find the share
  const share = await db.query.shares.findFirst({
    where: eq(shares.shareCode, shareCode),
    with: {
      prompt: {
        with: {
          user: true,
          tags: {
            with: {
              tag: true,
            },
          },
        },
      },
      sharedBy: true,
    },
  });

  if (!share) {
    redirect("/");
  }

  // Check if share is expired
  if (share.expiresAt && new Date(share.expiresAt) < new Date()) {
    redirect("/");
  }

  // Increment view count
  await db
    .update(shares)
    .set({ viewCount: share.viewCount + 1 })
    .where(eq(shares.id, share.id));

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <ShareView 
        prompt={{
          ...share.prompt,
          tags: share.prompt.tags.map(pt => pt.tag),
        }}
        sharedBy={share.sharedBy.name || share.sharedBy.email}
        shareDate={share.createdAt}
      />
    </div>
  );
}