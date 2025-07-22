import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { importSessions } from '@/lib/db/schema';
import { nanoid } from 'nanoid';
import { z } from 'zod';

const createSessionSchema = z.object({
  platform: z.enum(['chatgpt', 'claude', 'gemini', 'cline', 'cursor']),
  fileName: z.string(),
  fileSize: z.number(),
  fileType: z.string()
});

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const validatedData = createSessionSchema.parse(body);

    // Create import session
    const sessionId = nanoid();
    
    await db.insert(importSessions).values({
      id: sessionId,
      userId,
      platform: validatedData.platform,
      status: 'pending',
      fileName: validatedData.fileName,
      fileSize: validatedData.fileSize,
      fileType: validatedData.fileType,
      totalPrompts: 0,
      processedPrompts: 0,
      failedPrompts: 0,
      startedAt: new Date()
    });

    return NextResponse.json({ sessionId });
  } catch (error) {
    console.error('Failed to create import session:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create import session' }, { status: 500 });
  }
}