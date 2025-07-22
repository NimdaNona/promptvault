import { ParsedPrompt } from '@/lib/types/import';

export class GeminiParser {
  async parse(content: string): Promise<ParsedPrompt[]> {
    const prompts: ParsedPrompt[] = [];
    
    try {
      const data = JSON.parse(content);
      
      // Handle array of conversations
      const conversations = Array.isArray(data) ? data : data.conversations || [data];
      
      for (const conversation of conversations) {
        const messages = conversation.messages || conversation.turns || [];
        
        for (const message of messages) {
          // Check for user messages in various formats
          if (
            message.role === 'user' || 
            message.author === 'user' || 
            message.sender === 'user' ||
            message.type === 'user'
          ) {
            const content = message.content || message.text || message.message || '';
            
            if (content.trim()) {
              prompts.push({
                id: `gemini-${Date.now()}-${prompts.length}`,
                content: content.trim(),
                timestamp: message.timestamp ? new Date(message.timestamp) : new Date(),
                metadata: {
                  conversationId: conversation.id || conversation.conversation_id,
                  conversationTitle: conversation.title || conversation.name
                },
                sourceContext: conversation.title || conversation.name
              });
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to parse Gemini export:', error);
      // Fallback to text parsing
      prompts.push(...this.parseAsText(content));
    }

    return prompts;
  }

  private parseAsText(content: string): ParsedPrompt[] {
    const prompts: ParsedPrompt[] = [];
    const lines = content.split('\n');
    let currentPrompt = '';
    let inUserSection = false;

    for (const line of lines) {
      if (line.match(/^(user|human|you):/i)) {
        if (currentPrompt) {
          prompts.push({
            id: `gemini-text-${Date.now()}-${prompts.length}`,
            content: currentPrompt.trim(),
            timestamp: new Date()
          });
        }
        currentPrompt = line.replace(/^[^:]+:/, '').trim();
        inUserSection = true;
      } else if (line.match(/^(assistant|gemini|model):/i)) {
        inUserSection = false;
      } else if (inUserSection && line.trim()) {
        currentPrompt += '\n' + line;
      }
    }

    if (currentPrompt) {
      prompts.push({
        id: `gemini-text-${Date.now()}-${prompts.length}`,
        content: currentPrompt.trim(),
        timestamp: new Date()
      });
    }

    return prompts;
  }
}