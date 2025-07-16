import type { ExtractedPrompt } from './index';

export interface ClineMessage {
  ts: number;
  type: 'ask' | 'say' | 'command' | 'completion';
  say?: string;
  ask?: string;
  text?: string;
  persona?: 'user' | 'assistant';
}

export interface ClineTask {
  id: string;
  timestamp: number;
  messages: ClineMessage[];
  conversationHistory?: Array<{
    role: string;
    content: string | { type: string; text?: string }[];
  }>;
}

export function parseClineExport(jsonContent: string): ExtractedPrompt[] {
  try {
    const task: ClineTask = JSON.parse(jsonContent);
    const prompts: ExtractedPrompt[] = [];
    
    // Extract from messages array
    if (task.messages) {
      for (const message of task.messages) {
        let content = '';
        
        // Extract user messages
        if (message.type === 'ask' && message.ask) {
          content = message.ask;
        } else if (message.type === 'say' && message.persona === 'user' && message.say) {
          content = message.say;
        }
        
        if (content.trim()) {
          const firstLine = content.split('\n')[0];
          const name = firstLine.length > 50 
            ? firstLine.substring(0, 50) + '...' 
            : firstLine;

          prompts.push({
            name: name || 'Cline Prompt',
            content: content,
            metadata: {
              source: 'cline',
              conversationId: task.id || `cline-${Date.now()}`,
              conversationTitle: 'Cline Task',
              timestamp: message.ts || task.timestamp || Date.now(),
            },
          });
        }
      }
    }
    
    // Also check conversationHistory if available
    if (task.conversationHistory) {
      for (const msg of task.conversationHistory) {
        if (msg.role === 'user') {
          let content = '';
          
          if (typeof msg.content === 'string') {
            content = msg.content;
          } else if (Array.isArray(msg.content)) {
            content = msg.content
              .filter(item => item.type === 'text' && item.text)
              .map(item => item.text)
              .join('\n');
          }
          
          if (content.trim()) {
            const firstLine = content.split('\n')[0];
            const name = firstLine.length > 50 
              ? firstLine.substring(0, 50) + '...' 
              : firstLine;

            prompts.push({
              name: name || 'Cline Prompt',
              content: content,
              metadata: {
                source: 'cline',
                conversationId: task.id || `cline-${Date.now()}`,
                conversationTitle: 'Cline Task',
                timestamp: task.timestamp || Date.now(),
              },
            });
          }
        }
      }
    }

    return prompts;
  } catch (error) {
    console.error('Failed to parse Cline export:', error);
    throw new Error('Invalid Cline task format');
  }
}

export function validateClineExport(jsonContent: string): boolean {
  try {
    const data = JSON.parse(jsonContent);
    return data.messages || data.conversationHistory;
  } catch {
    return false;
  }
}