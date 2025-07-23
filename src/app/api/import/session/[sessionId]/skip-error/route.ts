import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { importProgress } from '@/lib/import/progress';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { sessionId } = await context.params;

    // Update progress to indicate error was skipped
    importProgress.updateProgress(sessionId, {
      message: 'Skipped error, continuing with remaining files...',
      metadata: {
        errorSkipped: true,
        skipTimestamp: new Date().toISOString(),
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error handling skip:', error);
    return NextResponse.json(
      { error: 'Failed to skip error' },
      { status: 500 }
    );
  }
}