import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { ProgressTracker } from '@/lib/services/progress-tracker';
import { db } from '@/lib/db';
import { importSessions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  const { userId } = await auth();
  
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { sessionId } = params;

  // Verify session belongs to user
  const [session] = await db
    .select()
    .from(importSessions)
    .where(eq(importSessions.id, sessionId))
    .limit(1);

  if (!session || session.userId !== userId) {
    return NextResponse.json({ error: 'Invalid session' }, { status: 404 });
  }

  // Set up SSE headers
  const headers = new Headers({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no', // Disable Nginx buffering
  });

  // Create a readable stream for SSE
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const progressTracker = new ProgressTracker(sessionId);

      // Send initial progress
      const initialProgress = await progressTracker.getProgress();
      if (initialProgress) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(initialProgress)}\n\n`)
        );
      }

      // Poll for updates (since we can't use Redis pub/sub in edge runtime)
      const intervalId = setInterval(async () => {
        try {
          const progress = await progressTracker.getProgress();
          
          if (progress) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(progress)}\n\n`)
            );

            // Close stream when processing is complete or failed
            if (progress.status === 'completed' || progress.status === 'failed') {
              clearInterval(intervalId);
              controller.close();
            }
          }
        } catch (error) {
          console.error('Progress polling error:', error);
          clearInterval(intervalId);
          controller.error(error);
        }
      }, 1000); // Poll every second

      // Clean up on client disconnect
      req.signal.addEventListener('abort', () => {
        clearInterval(intervalId);
        controller.close();
      });
    },
  });

  return new Response(stream, { headers });
}