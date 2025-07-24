import { NextRequest, NextResponse } from 'next/server';

// Force this API route to run in a Node.js serverless function
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Standard function timeout (10 seconds)
export const maxDuration = 10;

export async function POST(request: NextRequest) {
  console.log('[Cline Import API] POST request received');
  
  try {
    // Dynamic imports to reduce bundle size and improve serverless performance
    const { auth } = await import('@clerk/nextjs/server');
    const { z } = await import('zod');
    
    // Check authentication
    const { userId } = await auth();
    console.log('[Cline Import API] User ID:', userId);
    
    if (!userId) {
      console.error('[Cline Import API] No user ID - unauthorized');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    console.log('[Cline Import API] Request body:', JSON.stringify(body, null, 2));
    
    // Schema for import request
    const ClineImportSchema = z.object({
      files: z.array(z.object({
        url: z.string(), // Allow any string for URL (including data URLs and local refs)
        filename: z.string(),
        content: z.string(),
      })).min(1).max(50),
      options: z.object({
        targetFolder: z.string().optional(),
        defaultTags: z.array(z.string()).optional(),
        skipAI: z.boolean().optional(),
        useBackground: z.boolean().optional(), // Option to use background processing
      }).optional(),
    });
    
    const validation = ClineImportSchema.safeParse(body);
    if (!validation.success) {
      console.error('[Cline Import API] Validation failed:', validation.error.errors);
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.errors },
        { status: 400 }
      );
    }
    
    console.log('[Cline Import API] Validation passed');

    const { files, options = {} } = validation.data;

    // Check if we should use background processing for large imports
    const totalSize = files.reduce((sum, f) => sum + f.content.length, 0);
    const totalFiles = files.length;
    // Use background for large imports or many files
    const shouldUseBackground = options.useBackground || totalSize > 500000 || totalFiles > 10; // 500KB or 10+ files

    if (shouldUseBackground) {
      // Create session and redirect to background processor
      const { createImportSession } = await import('@/lib/import/utils');
      const { db } = await import('@/lib/db');
      const { users } = await import('@/lib/db/schema');
      const { eq } = await import('drizzle-orm');
      
      // Get user
      const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
      });

      if (!user) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

      // Create import session
      const session = await createImportSession(
        user.id,
        'cline',
        {
          fileCount: files.length,
          totalSize,
          options,
          background: true,
        }
      );

      // Call background endpoint
      const backgroundResponse = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL || 'https://aipromptvault.app'}/api/import/cline-background`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': request.headers.get('Authorization') || '',
          },
          body: JSON.stringify({
            sessionId: session.id,
            files,
            options,
          }),
        }
      );

      if (!backgroundResponse.ok) {
        throw new Error('Failed to start background import');
      }

      return NextResponse.json({
        success: true,
        sessionId: session.id,
        background: true,
        message: 'Import started in background',
      });
    }

    // For small imports, process immediately
    const [
      { db },
      { users },
      { eq },
      { ClineMarkdownParser },
      { createImportSession, updateImportSession },
      { processImportBatch },
      { importProgress }
    ] = await Promise.all([
      import('@/lib/db'),
      import('@/lib/db/schema'),
      import('drizzle-orm'),
      import('@/lib/importers/cline-markdown-parser'),
      import('@/lib/import/utils'),
      import('@/lib/import/batch-processor'),
      import('@/lib/import/progress')
    ]);

    // Get user data
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Create import session
    const session = await createImportSession(
      user.id,
      'cline',
      {
        fileCount: files.length,
        totalSize,
        options,
      }
    );

    // Import analytics
    const { ClineImportAnalytics } = await import('@/lib/analytics/cline-import-analytics');
    
    // Initialize analytics session
    ClineImportAnalytics.startSession(session.id, user.id, 'file');

    // Update progress
    importProgress.updateProgress(session.id, {
      status: 'processing',
      progress: 0,
      message: 'Starting Cline import...',
    });

    try {
      // Parse all files
      importProgress.updateProgress(session.id, {
        progress: 10,
        message: `Parsing ${files.length} Cline markdown file(s)...`,
      });

      const fileInputs = files.map(f => ({
        name: f.filename,
        content: f.content,
      }));

      const clineParser = new ClineMarkdownParser();
      const extractedPrompts = await clineParser.parseMultipleFiles(fileInputs);

      importProgress.updateProgress(session.id, {
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
          targetFolder: options.targetFolder,
          defaultTags: options.defaultTags,
          skipAI: options.skipAI,
          onProgress: (progress) => {
            importProgress.updateProgress(session.id, {
              progress: 30 + (progress * 0.6),
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
        processedPrompts: processedPrompts.length,
        totalPrompts: extractedPrompts.length,
        failedPrompts: extractedPrompts.length - processedPrompts.length,
      });

      // Complete analytics session
      ClineImportAnalytics.updateSession(session.id, {
        filesProcessed: files.length,
        promptsImported: processedPrompts.length,
        duplicatesRemoved: extractedPrompts.length - processedPrompts.length,
      });
      ClineImportAnalytics.completeSession(session.id, true);

      importProgress.updateProgress(session.id, {
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

      // Complete analytics session with failure
      ClineImportAnalytics.updateSession(session.id, {
        errorsEncountered: 1,
      });
      ClineImportAnalytics.completeSession(session.id, false);

      importProgress.updateProgress(session.id, {
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

// Endpoint for progress streaming with dynamic imports
export async function GET(request: NextRequest) {
  try {
    const { auth } = await import('@clerk/nextjs/server');
    const { userId } = await auth();
    
    if (!userId) {
      return new Response('Unauthorized', { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return new Response('Missing sessionId', { status: 400 });
    }

    // Dynamic imports
    const [{ db }, { users }, { eq }, { importProgress }] = await Promise.all([
      import('@/lib/db'),
      import('@/lib/db/schema'),
      import('drizzle-orm'),
      import('@/lib/import/progress')
    ]);

    // Verify session belongs to user
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      return new Response('User not found', { status: 404 });
    }

    // Create a manual SSE stream that works with Edge Runtime
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        // Send initial progress
        const initialProgress = importProgress.getProgress(sessionId);
        if (initialProgress) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(initialProgress)}\n\n`)
          );
        }

        // Set up polling for progress updates
        const pollInterval = setInterval(() => {
          const progress = importProgress.getProgress(sessionId);
          if (progress) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(progress)}\n\n`)
            );
            
            // Close stream when complete
            if (progress.status === 'completed' || progress.status === 'failed') {
              clearInterval(pollInterval);
              controller.close();
            }
          }
        }, 1000); // Poll every second

        // Clean up after 60 seconds max
        setTimeout(() => {
          clearInterval(pollInterval);
          controller.close();
        }, 60000);
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no', // Disable Nginx buffering
      },
    });

  } catch (error) {
    console.error('Progress stream error:', error);
    return new Response('Stream failed', { status: 500 });
  }
}