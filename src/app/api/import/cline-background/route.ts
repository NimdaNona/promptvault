import { NextRequest, NextResponse } from 'next/server';

// Force Node.js runtime
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Extended timeout for background processing
export const maxDuration = 300; // 5 minutes

export async function POST(request: NextRequest) {
  try {
    // Dynamic imports for better serverless performance
    const { auth } = await import('@clerk/nextjs/server');
    const { z } = await import('zod');
    
    // Check authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    
    // Schema for background job request
    const BackgroundJobSchema = z.object({
      sessionId: z.string(),
      files: z.array(z.object({
        url: z.string().url(),
        filename: z.string(),
        content: z.string(),
      })).min(1).max(50),
      options: z.object({
        targetFolder: z.string().optional(),
        defaultTags: z.array(z.string()).optional(),
        skipAI: z.boolean().optional(),
      }).optional(),
    });
    
    const validation = BackgroundJobSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { sessionId, files, options = {} } = validation.data;

    // Start background processing
    processInBackground(userId, sessionId, files, options).catch((error) => {
      console.error('Background processing error:', error);
    });

    // Return immediately with job accepted response
    return NextResponse.json({
      success: true,
      message: 'Import job accepted',
      sessionId,
      status: 'processing',
    });

  } catch (error) {
    console.error('Background job error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to start import job', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

// Background processing function
async function processInBackground(
  userId: string,
  sessionId: string,
  files: any[],
  options: any
) {
  // Dynamic imports for heavy processing
  const [
    { db },
    { users },
    { eq },
    { ClineMarkdownParser },
    { updateImportSession },
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

  try {
    // Get user data
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Update progress - starting
    importProgress.updateProgress(sessionId, {
      status: 'processing',
      progress: 10,
      message: `Parsing ${files.length} Cline markdown file(s)...`,
    });

    // Parse files
    const fileInputs = files.map(f => ({
      name: f.filename,
      content: f.content,
    }));

    const clineParser = new ClineMarkdownParser();
    const extractedPrompts = await clineParser.parseMultipleFiles(fileInputs);

    importProgress.updateProgress(sessionId, {
      progress: 30,
      message: `Extracted ${extractedPrompts.length} prompts from Cline tasks`,
      metadata: {
        extractedCount: extractedPrompts.length,
      },
    });

    // Process prompts
    const processedPrompts = await processImportBatch(
      extractedPrompts,
      user.id,
      sessionId,
      {
        targetFolder: options.targetFolder,
        defaultTags: options.defaultTags,
        skipAI: options.skipAI,
        onProgress: (progress) => {
          importProgress.updateProgress(sessionId, {
            progress: 30 + (progress * 0.6),
            message: progress < 100 
              ? 'Processing and categorizing prompts...' 
              : 'Finalizing import...',
          });
        },
      }
    );

    // Update session - completed
    await updateImportSession(sessionId, {
      status: 'completed',
      totalPrompts: extractedPrompts.length,
      processedPrompts: processedPrompts.length,
      failedPrompts: extractedPrompts.length - processedPrompts.length,
      completedAt: new Date(),
    });

    importProgress.updateProgress(sessionId, {
      status: 'completed',
      progress: 100,
      message: `Successfully imported ${processedPrompts.length} prompts`,
      metadata: {
        imported: processedPrompts.length,
        skipped: extractedPrompts.length - processedPrompts.length,
      },
    });

  } catch (error) {
    // Update session - failed
    await updateImportSession(sessionId, {
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    importProgress.updateProgress(sessionId, {
      status: 'failed',
      progress: 100,
      message: `Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
  }
}