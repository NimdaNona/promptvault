import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { Client } from '@upstash/qstash';
import { db } from '@/lib/db';
import { importSessions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const processSchema = z.object({
  sessionId: z.string(),
  blobUrl: z.string().url(),
  platform: z.enum(['chatgpt', 'claude', 'gemini', 'cline', 'cursor'])
});

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const validatedData = processSchema.parse(body);

    // Verify session belongs to user
    const [session] = await db
      .select()
      .from(importSessions)
      .where(eq(importSessions.id, validatedData.sessionId))
      .limit(1);

    if (!session || session.userId !== userId) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 404 });
    }

    // Initialize QStash client
    const qstash = new Client({
      token: process.env.QSTASH_TOKEN!
    });

    // Get the base URL for the webhook
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://aipromptvault.app';

    // Publish message to QStash for background processing
    const response = await qstash.publishJSON({
      url: `${baseUrl}/api/import/worker`,
      body: {
        sessionId: validatedData.sessionId,
        blobUrl: validatedData.blobUrl,
        platform: validatedData.platform,
        userId
      },
      retries: 3,
      delay: 0,
      headers: {
        'Content-Type': 'application/json',
      }
    });

    // Update session status
    await db
      .update(importSessions)
      .set({ status: 'processing' })
      .where(eq(importSessions.id, validatedData.sessionId));

    return NextResponse.json({ 
      message: 'Processing started',
      messageId: response.messageId
    });
  } catch (error) {
    console.error('Failed to start processing:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to start processing' }, { status: 500 });
  }
}