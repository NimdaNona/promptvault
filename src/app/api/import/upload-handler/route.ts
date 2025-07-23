import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { importSessions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (
        pathname: string,
        clientPayload?: string | null,
        multipart?: boolean
      ) => {
        // Validate the upload request
        const payload = JSON.parse(clientPayload || '{}');
        
        if (!payload.sessionId) {
          throw new Error('Missing sessionId');
        }

        // Verify the session belongs to the user
        const [session] = await db
          .select()
          .from(importSessions)
          .where(eq(importSessions.id, payload.sessionId))
          .limit(1);

        if (!session || session.userId !== userId) {
          throw new Error('Invalid session');
        }

        return {
          allowedContentTypes: ['application/json', 'text/plain', 'text/markdown', 'text/csv'],
          maximumSizeInBytes: 500 * 1024 * 1024, // 500MB
          validUntil: Date.now() + 60 * 60 * 1000, // 1 hour from now (timestamp in milliseconds)
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        // Update the session with the blob URL
        const payload = JSON.parse(tokenPayload || '{}');
        
        await db
          .update(importSessions)
          .set({ 
            blobUrl: blob.url,
            status: 'processing' 
          })
          .where(eq(importSessions.id, payload.sessionId));
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    console.error('Upload handler error:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 }
    );
  }
}