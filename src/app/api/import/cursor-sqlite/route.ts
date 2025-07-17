import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export const runtime = 'nodejs'; // Need Node.js for SQLite processing

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

    // For now, return instructions for JSON export
    // In production, you'd use better-sqlite3 or similar to parse the SQLite file
    return NextResponse.json({
      success: false,
      message: "SQLite database parsing is complex. Please export your Cursor chats as JSON instead.",
      instructions: [
        "1. Open Cursor IDE",
        "2. Open the Command Palette (Cmd/Ctrl + Shift + P)",
        "3. Search for 'Export Chat History'",
        "4. Select 'Export as JSON'",
        "5. Upload the exported JSON file instead",
        "",
        "Alternative method:",
        "1. Navigate to your Cursor workspace folder",
        "2. Look for .cursor/chat-history/ folder",
        "3. Find JSON files containing your chat sessions",
        "4. Upload those JSON files directly"
      ]
    });
  } catch (error) {
    console.error("Cursor SQLite error:", error);
    return NextResponse.json(
      { error: "Failed to process SQLite file" },
      { status: 500 }
    );
  }
}