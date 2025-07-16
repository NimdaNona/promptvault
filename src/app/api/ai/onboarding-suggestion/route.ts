import { auth } from "@clerk/nextjs/server";
import { openai } from "@/lib/openai";

// Force Node.js runtime
export const runtime = 'nodejs';

const USER_TYPE_SUGGESTIONS = {
  developer: "As a developer, you'll love importing your coding prompts from Cursor or Cline. These often contain valuable debugging patterns and code generation templates.",
  marketer: "Marketing professionals often have great prompts in ChatGPT for content creation. Consider importing your campaign ideas and social media templates.",
  researcher: "Researchers typically have prompts for analysis and summarization. Import from Claude or Gemini to bring your research methodology prompts.",
  writer: "Writers often have creative prompts scattered across platforms. Import your character development and story structure prompts to organize them better.",
  other: "Start by importing your most frequently used prompts. PromptVault will help you organize and optimize them with AI assistance.",
};

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { userType } = await req.json();

    // Get base suggestion
    const baseSuggestion = USER_TYPE_SUGGESTIONS[userType as keyof typeof USER_TYPE_SUGGESTIONS] || USER_TYPE_SUGGESTIONS.other;

    try {
      // Try to get AI-enhanced suggestion
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant for PromptVault, an AI prompt management platform. Provide a brief, encouraging tip for new users based on their profession."
          },
          {
            role: "user",
            content: `Give a short, specific tip (max 2 sentences) for a ${userType} who is starting to use a prompt management tool. Focus on what makes their prompts valuable and worth organizing.`
          }
        ],
        temperature: 0.7,
        max_tokens: 100,
      });

      const aiSuggestion = completion.choices[0]?.message?.content || baseSuggestion;

      return Response.json({ suggestion: aiSuggestion });
    } catch (error) {
      // If AI fails, return base suggestion
      console.error("AI suggestion error:", error);
      return Response.json({ suggestion: baseSuggestion });
    }
  } catch (error) {
    console.error("Onboarding suggestion error:", error);
    return new Response("Internal server error", { status: 500 });
  }
}