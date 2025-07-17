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

    // Extract conversation ID
    const match = shareLink.match(/share\/([a-zA-Z0-9-]+)/);
    if (!match) {
      return NextResponse.json({ error: "Invalid ChatGPT share link format" }, { status: 400 });
    }

    const conversationId = match[1];

    // For now, we'll create a placeholder that tells users to export manually
    // In a production app, you'd use puppeteer or playwright to scrape the conversation
    // or use an unofficial API if available
    
    return NextResponse.json({
      success: false,
      message: "Share link import requires manual export for now. Please use the Export tab to upload your ChatGPT data.",
      conversationId,
      instructions: [
        "1. Open the ChatGPT share link in your browser",
        "2. Click on your profile picture in the bottom left",
        "3. Select 'Settings & Beta'",
        "4. Go to 'Data controls'",
        "5. Click 'Export data'",
        "6. Download and extract the ZIP file",
        "7. Upload the conversations.json file using the Export tab"
      ]
    });
  } catch (error) {
    console.error("ChatGPT share link error:", error);
    return NextResponse.json(
      { error: "Failed to process share link" },
      { status: 500 }
    );
  }
}