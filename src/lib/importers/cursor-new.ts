import { ParsedPrompt } from '@/lib/types/import';

export class CursorParser {
  async parse(content: string): Promise<ParsedPrompt[]> {
    const prompts: ParsedPrompt[] = [];
    
    try {
      // Try JSON format first
      const data = JSON.parse(content);
      
      if (Array.isArray(data)) {
        // Array of conversations or messages
        for (const item of data) {
          if (item.messages) {
            // Conversation with messages
            prompts.push(...this.extractMessagesFromConversation(item));
          } else if (item.role === 'user' || item.type === 'user') {
            // Direct message
            const content = item.content || item.text || item.message;
            if (content) {
              prompts.push({
                id: `cursor-${Date.now()}-${prompts.length}`,
                content: content.trim(),
                timestamp: item.timestamp ? new Date(item.timestamp) : new Date(),
                metadata: item.metadata || {}
              });
            }
          }
        }
      } else if (data.messages) {
        // Single conversation
        prompts.push(...this.extractMessagesFromConversation(data));
      }
    } catch {
      // Fallback to text parsing for composer format
      prompts.push(...this.parseComposerFormat(content));
    }

    return prompts;
  }

  private extractMessagesFromConversation(conversation: any): ParsedPrompt[] {
    const prompts: ParsedPrompt[] = [];
    const messages = conversation.messages || [];
    
    for (const message of messages) {
      if (message.role === 'user' || message.sender === 'user') {
        const content = message.content || message.text || '';
        if (content.trim()) {
          prompts.push({
            id: `cursor-${conversation.id || Date.now()}-${message.id || prompts.length}`,
            content: content.trim(),
            timestamp: message.timestamp ? new Date(message.timestamp) : new Date(),
            metadata: {
              conversationId: conversation.id,
              conversationTitle: conversation.title || conversation.name,
              model: message.model || conversation.model
            },
            sourceContext: conversation.title
          });
        }
      }
    }
    
    return prompts;
  }

  private parseComposerFormat(content: string): ParsedPrompt[] {
    const prompts: ParsedPrompt[] = [];
    
    // Cursor composer format uses markdown-like structure
    const sections = content.split(/^#{1,3}\s+(User|Human|You):/im);
    
    for (let i = 1; i < sections.length; i += 2) {
      const text = sections[i + 1]?.trim();
      
      if (text) {
        // Remove any assistant response that might be included
        const userContent = text.split(/^#{1,3}\s+(Assistant|Cursor|AI):/im)[0];
        
        if (userContent.trim()) {
          prompts.push({
            id: `cursor-composer-${Date.now()}-${prompts.length}`,
            content: userContent.trim(),
            timestamp: new Date(),
            metadata: {
              format: 'composer'
            }
          });
        }
      }
    }

    return prompts;
  }
}