import type { ExtractedPrompt } from './index';

export interface CursorChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string;
}

export interface CursorChatSession {
  id: string;
  title: string;
  messages: CursorChatMessage[];
  created_at?: string;
  updated_at?: string;
  workspace?: string;
}

export interface CursorExport {
  sessions: CursorChatSession[];
  version?: string;
}

export function parseCursorExport(jsonContent: string): ExtractedPrompt[] {
  try {
    // Handle both single session and multi-session exports
    let sessions: CursorChatSession[] = [];
    
    const data = JSON.parse(jsonContent);
    
    if (Array.isArray(data)) {
      // Array of sessions
      sessions = data;
    } else if (data.sessions && Array.isArray(data.sessions)) {
      // Export object with sessions array
      sessions = data.sessions;
    } else if (data.messages && Array.isArray(data.messages)) {
      // Single session
      sessions = [data as CursorChatSession];
    } else {
      throw new Error('Unrecognized Cursor export format');
    }

    const prompts: ExtractedPrompt[] = [];

    for (const session of sessions) {
      if (!session.messages) continue;
      
      // Extract user messages
      const userMessages = session.messages.filter(msg => msg.role === 'user');
      
      for (const message of userMessages) {
        if (message.content.trim()) {
          const firstLine = message.content.split('\n')[0];
          const name = firstLine.length > 50 
            ? firstLine.substring(0, 50) + '...' 
            : firstLine;

          prompts.push({
            title: name || session.title || 'Cursor Prompt',
            content: message.content,
            metadata: {
              source: 'cursor',
              conversationId: session.id || `cursor-${Date.now()}`,
              conversationTitle: session.title || 'Cursor Chat',
              timestamp: message.timestamp 
                ? new Date(message.timestamp).getTime() 
                : session.created_at 
                  ? new Date(session.created_at).getTime()
                  : Date.now(),
            },
          });
        }
      }
    }

    return prompts;
  } catch (error) {
    console.error('Failed to parse Cursor export:', error);
    throw new Error('Invalid Cursor export format');
  }
}

export function validateCursorExport(jsonContent: string): boolean {
  try {
    const data = JSON.parse(jsonContent);
    
    // Check various possible formats
    if (Array.isArray(data)) {
      return data.length === 0 || (data[0].messages && Array.isArray(data[0].messages));
    }
    
    if (data.sessions && Array.isArray(data.sessions)) {
      return true;
    }
    
    if (data.messages && Array.isArray(data.messages)) {
      return true;
    }
    
    return false;
  } catch {
    return false;
  }
}