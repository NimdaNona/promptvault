import { NextRequest, NextResponse } from 'next/server';
import { verifySignatureAppRouter } from '@upstash/qstash/nextjs';
import { FileProcessingService } from '@/lib/services/file-processing';
import { ProgressTracker } from '@/lib/services/progress-tracker';
import { db } from '@/lib/db';
import { importSessions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const workerSchema = z.object({
  sessionId: z.string(),
  blobUrl: z.string().url(),
  platform: z.enum(['chatgpt', 'claude', 'gemini', 'cline', 'cursor']),
  userId: z.string()
});

async function handler(req: NextRequest) {
  try {
    const body = await req.json();
    const validatedData = workerSchema.parse(body);

    const progressTracker = new ProgressTracker(validatedData.sessionId);
    const fileProcessor = new FileProcessingService();

    try {
      // Update status to processing
      await progressTracker.updateProgress(0, 'Starting file processing...');

      // Process the file
      const result = await fileProcessor.processFile({
        blobUrl: validatedData.blobUrl,
        platform: validatedData.platform,
        userId: validatedData.userId,
        sessionId: validatedData.sessionId,
        onProgress: async (progress, message) => {
          await progressTracker.updateProgress(progress, message);
        }
      });

      // Update session with results
      await db
        .update(importSessions)
        .set({
          status: 'completed',
          totalPrompts: result.totalPrompts,
          processedPrompts: result.processedPrompts,
          failedPrompts: result.failedPrompts,
          completedAt: new Date(),
          metadata: result.metadata
        })
        .where(eq(importSessions.id, validatedData.sessionId));

      await progressTracker.updateProgress(100, 'Import completed successfully!');

      return NextResponse.json({ 
        success: true, 
        processedPrompts: result.processedPrompts,
        totalPrompts: result.totalPrompts
      });

    } catch (error) {
      console.error('Processing error:', error);
      
      // Update session with error
      await db
        .update(importSessions)
        .set({
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
          completedAt: new Date()
        })
        .where(eq(importSessions.id, validatedData.sessionId));

      await progressTracker.updateProgress(0, `Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);

      throw error;
    }
  } catch (error) {
    console.error('Worker error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Processing failed' },
      { status: 500 }
    );
  }
}

// Wrap with QStash signature verification
export const POST = verifySignatureAppRouter(handler);