import { ParsedPrompt } from '@/lib/types/import';

export class ClaudeParser {
  async parse(content: string): Promise<ParsedPrompt[]> {
    const prompts: ParsedPrompt[] = [];
    
    try {
      // Try to parse as Claude app export (JSON)
      const data = JSON.parse(content);
      
      if (data.conversations) {
        // Claude app export format
        for (const conversation of data.conversations) {
          const humanMessages = conversation.messages?.filter((msg: any) => msg.sender === 'human') || [];
          
          for (const message of humanMessages) {
            if (message.text?.trim()) {
              prompts.push({
                id: `claude-${conversation.uuid}-${message.created_at}`,
                content: message.text,
                timestamp: new Date(message.created_at),
                metadata: {
                  conversationId: conversation.uuid,
                  conversationTitle: conversation.name
                },
                sourceContext: conversation.name
              });
            }
          }
        }
      }
    } catch {
      // Try to parse as Claude Code JSONL
      const lines = content.split('\n').filter(line => line.trim());
      
      for (const line of lines) {
        try {
          const message = JSON.parse(line);
          
          if (message.role === 'user') {
            const content = this.extractContent(message.content);
            if (content) {
              prompts.push({
                id: message.id || `claude-${Date.now()}-${prompts.length}`,
                content,
                timestamp: message.timestamp ? new Date(message.timestamp) : new Date(),
                metadata: {
                  type: message.type
                }
              });
            }
          }
        } catch {
          // Skip invalid lines
        }
      }
    }

    return prompts;
  }

  private extractContent(content: any): string {
    if (typeof content === 'string') {
      return content;
    }
    
    if (Array.isArray(content)) {
      return content
        .filter(item => item.type === 'text' && item.text)
        .map(item => item.text)
        .join('\n');
    }
    
    return '';
  }
}