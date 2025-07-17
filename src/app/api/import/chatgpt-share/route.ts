import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from 'zod';

export const runtime = 'edge';

const requestSchema = z.object({
  shareLink: z.string().optional(),
  conversationText: z.string().optional(),
}).refine(data => data.shareLink || data.conversationText, {
  message: "Either shareLink or conversationText must be provided"
});

interface ParsedPrompt {
  id: string;
  text: string;
  timestamp?: string;
  order: number;
}

function parseConversationText(text: string): ParsedPrompt[] {
  const prompts: ParsedPrompt[] = [];
  
  // Split conversation into sections
  const sections = text.split(/\n\n+/);
  let order = 0;
  
  for (let i = 0; i < sections.length; i++) {
    const section = sections[i].trim();
    if (!section) continue;
    
    // Check if this section starts with a user indicator
    if (section.startsWith('You:') || 
        section.startsWith('User:') || 
        section.startsWith('Human:')) {
      
      // Extract the prompt text
      const promptText = section.replace(/^(You:|User:|Human:)\s*/i, '').trim();
      
      if (promptText) {
        prompts.push({
          id: `chatgpt-${Date.now()}-${order}`,
          text: promptText,
          timestamp: new Date().toISOString(),
          order: order++
        });
      }
    }
  }
  
  return prompts;
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return new Response("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const validatedData = requestSchema.parse(body);

    // If conversation text is provided, parse it
    if (validatedData.conversationText) {
      const prompts = parseConversationText(validatedData.conversationText);
      
      return NextResponse.json({
        success: true,
        prompts: prompts,
        count: prompts.length
      });
    }

    // If only a share link is provided, return instructions
    if (validatedData.shareLink) {
      // Extract conversation ID
      const match = validatedData.shareLink.match(/share\/([a-zA-Z0-9-]+)/);
      const conversationId = match ? match[1] : null;
      
      return NextResponse.json({
        success: false,
        requiresManualCopy: true,
        conversationId,
        instructions: "Please visit the ChatGPT share link and copy the entire conversation text, then paste it here.",
        shareLink: validatedData.shareLink
      });
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  } catch (error) {
    console.error("ChatGPT share link error:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    
    return NextResponse.json(
      { error: "Failed to process share link" },
      { status: 500 }
    );
  }
}