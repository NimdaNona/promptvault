import type { ExtractedPrompt } from './index';

export interface GeminiMessage {
  author: string;
  content: string;
  timestamp?: string;
}

export interface GeminiConversation {
  id: string;
  title: string;
  messages: GeminiMessage[];
  created_at?: string;
  updated_at?: string;
}

export interface GeminiExport {
  conversations: GeminiConversation[];
  version?: string;
}

// Google Docs export format (simplified text)
export function parseGeminiDocsExport(textContent: string): ExtractedPrompt[] {
  const prompts: ExtractedPrompt[] = [];
  
  // Split by common patterns in Google Docs exports
  // Usually formatted as "You:" or "User:" followed by the prompt
  const userPatterns = /^(You:|User:|Me:|Human:)\s*/gim;
  const assistantPatterns = /^(Gemini:|Assistant:|AI:)\s*/gim;
  
  // Split into sections
  const sections = textContent.split(/\n{2,}/);
  
  let conversationTitle = 'Gemini Chat';
  let currentPrompt = '';
  
  for (const section of sections) {
    const trimmedSection = section.trim();
    
    // Check if this is a user message
    if (userPatterns.test(trimmedSection)) {
      const content = trimmedSection.replace(userPatterns, '').trim();
      
      if (content) {
        const firstLine = content.split('\n')[0];
        const name = firstLine.length > 50 
          ? firstLine.substring(0, 50) + '...' 
          : firstLine;

        prompts.push({
          name: name || 'Gemini Prompt',
          content: content,
          metadata: {
            source: 'gemini',
            conversationId: `gemini-${Date.now()}-${prompts.length}`,
            conversationTitle: conversationTitle,
            timestamp: Date.now(),
          },
        });
      }
    }
  }
  
  return prompts;
}

export function parseGeminiExport(jsonContent: string): ExtractedPrompt[] {
  try {
    const data: GeminiExport = JSON.parse(jsonContent);
    const prompts: ExtractedPrompt[] = [];

    for (const conversation of data.conversations) {
      // Extract user messages
      const userMessages = conversation.messages.filter(
        msg => msg.author.toLowerCase() === 'user' || 
               msg.author.toLowerCase() === 'you' ||
               msg.author.toLowerCase() === 'human'
      );
      
      for (const message of userMessages) {
        if (message.content.trim()) {
          const firstLine = message.content.split('\n')[0];
          const name = firstLine.length > 50 
            ? firstLine.substring(0, 50) + '...' 
            : firstLine;

          prompts.push({
            name: name || conversation.title || 'Gemini Prompt',
            content: message.content,
            metadata: {
              source: 'gemini',
              conversationId: conversation.id,
              conversationTitle: conversation.title,
              timestamp: message.timestamp 
                ? new Date(message.timestamp).getTime()
                : conversation.created_at 
                  ? new Date(conversation.created_at).getTime()
                  : Date.now(),
            },
          });
        }
      }
    }

    return prompts;
  } catch (error) {
    // Try parsing as Google Docs export (plain text)
    if (typeof jsonContent === 'string' && !jsonContent.trim().startsWith('{')) {
      return parseGeminiDocsExport(jsonContent);
    }
    
    console.error('Failed to parse Gemini export:', error);
    throw new Error('Invalid Gemini export format');
  }
}

export function validateGeminiExport(content: string): boolean {
  try {
    // Check if it's JSON
    if (content.trim().startsWith('{') || content.trim().startsWith('[')) {
      const data = JSON.parse(content);
      return data.conversations && Array.isArray(data.conversations);
    }
    
    // Check if it looks like a Google Docs export
    const userPatterns = /(You:|User:|Me:|Human:)/i;
    return userPatterns.test(content);
  } catch {
    // Might be plain text export
    return true;
  }
}