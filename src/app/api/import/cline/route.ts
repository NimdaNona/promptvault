import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import { ClineMarkdownParser } from '@/lib/importers/cline-markdown-parser';
import { createImportSession, updateImportSession } from '@/lib/import/utils';
import { processImportBatch } from '@/lib/import/batch-processor';
import { ImportProgressTracker } from '@/lib/import/progress';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// Schema for import request
const ClineImportSchema = z.object({
  files: z.array(z.object({
    url: z.string().url(),
    filename: z.string(),
    content: z.string(),
  })).min(1).max(50), // Limit to 50 files
  options: z.object({
    folderId: z.string().optional(),
    tags: z.array(z.string()).optional(),
    skipAI: z.boolean().optional(),
  }).optional(),
});

// Progress tracker instance
const progressTracker = new ImportProgressTracker();

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user data
    const user = await db.query.users.findFirst({
      where: eq(users.clerkId, userId),
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Parse request body
    const body = await request.json();
    const validation = ClineImportSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { files, options = {} } = validation.data;

    // Create import session
    const session = await createImportSession(
      user.id,
      'cline',
      {
        fileCount: files.length,
        totalSize: files.reduce((sum, f) => sum + f.content.length, 0),
        options,
      }
    );

    // Update progress
    progressTracker.updateProgress(session.id, {
      status: 'processing',
      progress: 0,
      message: 'Starting Cline import...',
    });

    try {
      // Parse all files
      progressTracker.updateProgress(session.id, {
        progress: 10,
        message: `Parsing ${files.length} Cline markdown file(s)...`,
      });

      const fileInputs = files.map(f => ({
        name: f.filename,
        content: f.content,
      }));

      const clineParser = new ClineMarkdownParser();
      const extractedPrompts = await clineParser.parseMultipleFiles(fileInputs);

      progressTracker.updateProgress(session.id, {
        progress: 30,
        message: `Extracted ${extractedPrompts.length} prompts from Cline tasks`,
        metadata: {
          extractedCount: extractedPrompts.length,
        },
      });

      // Process prompts in batches
      const processedPrompts = await processImportBatch(
        extractedPrompts,
        user.id,
        session.id,
        {
          folderId: options.folderId,
          defaultTags: options.tags,
          skipAI: options.skipAI,
          onProgress: (progress) => {
            progressTracker.updateProgress(session.id, {
              progress: 30 + (progress * 0.6), // 30-90% range
              message: progress < 100 
                ? 'Processing and categorizing prompts...' 
                : 'Finalizing import...',
            });
          },
        }
      );

      // Update import session with results
      await updateImportSession(session.id, {
        status: 'completed',
        processedCount: processedPrompts.length,
        results: {
          imported: processedPrompts.length,
          skipped: extractedPrompts.length - processedPrompts.length,
          errors: [],
        },
      });

      progressTracker.updateProgress(session.id, {
        status: 'completed',
        progress: 100,
        message: `Successfully imported ${processedPrompts.length} prompts`,
        metadata: {
          imported: processedPrompts.length,
          skipped: extractedPrompts.length - processedPrompts.length,
        },
      });

      return NextResponse.json({
        success: true,
        sessionId: session.id,
        imported: processedPrompts.length,
        total: extractedPrompts.length,
        prompts: processedPrompts.map(p => ({
          id: p.id,
          name: p.name,
          folder: p.folder,
          tags: p.tags,
        })),
      });

    } catch (error) {
      // Update session with error
      await updateImportSession(session.id, {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      progressTracker.updateProgress(session.id, {
        status: 'failed',
        progress: 100,
        message: `Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });

      throw error;
    }

  } catch (error) {
    console.error('Cline import error:', error);
    return NextResponse.json(
      { 
        error: 'Import failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

// Endpoint for progress streaming
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new Response('Unauthorized', { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return new Response('Missing sessionId', { status: 400 });
    }

    // Verify session belongs to user
    const user = await db.query.users.findFirst({
      where: eq(users.clerkId, userId),
    });

    if (!user) {
      return new Response('User not found', { status: 404 });
    }

    // Stream progress updates
    const stream = progressTracker.streamProgress(sessionId);

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('Progress stream error:', error);
    return new Response('Stream failed', { status: 500 });
  }
}