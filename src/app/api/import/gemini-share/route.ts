import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { shareLink } = await req.json();

    if (!shareLink || typeof shareLink !== 'string') {
      return NextResponse.json({ error: "Invalid share link" }, { status: 400 });
    }

    // Validate Gemini share link format
    if (!shareLink.includes('g.co/gemini/share/') && !shareLink.includes('gemini.google.com/share/')) {
      return NextResponse.json({ error: "Invalid Gemini share link format" }, { status: 400 });
    }

    // Extract share ID
    const match = shareLink.match(/share\/([a-zA-Z0-9-]+)/);
    if (!match) {
      return NextResponse.json({ error: "Could not extract share ID" }, { status: 400 });
    }

    const shareId = match[1];

    // For now, return instructions for manual export
    // In production, you could use Puppeteer/Playwright to scrape the conversation
    return NextResponse.json({
      success: false,
      message: "Gemini share link import requires manual export for now. Please follow the instructions below.",
      shareId,
      instructions: [
        "1. Open the Gemini share link in your browser",
        "2. Sign in to your Google account if needed",
        "3. Click the three dots menu in the top right",
        "4. Select 'Export to Docs' or 'Download'",
        "5. If exported to Docs, download as TXT or copy the content",
        "6. Upload the file using the Export tab"
      ]
    });
  } catch (error) {
    console.error("Gemini share link error:", error);
    return NextResponse.json(
      { error: "Failed to process share link" },
      { status: 500 }
    );
  }
}