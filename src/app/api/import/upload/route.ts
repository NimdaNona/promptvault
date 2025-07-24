import { auth } from "@clerk/nextjs/server";
import { put } from "@vercel/blob";
import { NextResponse } from "next/server";

export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return new Response("Unauthorized", { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Read file content for processing
    const content = await file.text();
    
    // Check if we have Vercel Blob token
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      console.warn('BLOB_READ_WRITE_TOKEN not configured, using in-memory storage');
      // Return without blob URL - content is what matters for processing
      return NextResponse.json({
        success: true,
        url: `data:${file.type};base64,${btoa(content)}`,
        filename: file.name,
        size: file.size,
        content: content,
      });
    }

    try {
      // Store file temporarily in Vercel Blob
      const blob = await put(`imports/${userId}/${Date.now()}-${file.name}`, file, {
        access: 'public',
        addRandomSuffix: true,
        token: process.env.BLOB_READ_WRITE_TOKEN,
      });

      return NextResponse.json({
        success: true,
        url: blob.url,
        filename: file.name,
        size: file.size,
        content: content,
      });
    } catch (blobError) {
      console.error('Vercel Blob storage error:', blobError);
      // Fallback to data URL if blob storage fails
      return NextResponse.json({
        success: true,
        url: `data:${file.type};base64,${btoa(content)}`,
        filename: file.name,
        size: file.size,
        content: content,
      });
    }
  } catch (error) {
    console.error("File upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}