import type { ExtractedPrompt } from './index';

// Claude app export interface
export interface ClaudeConversation {
  uuid: string;
  name: string;
  created_at: string;
  updated_at: string;
  messages: Array<{
    text: string;
    sender: 'human' | 'assistant';
    created_at: string;
  }>;
}

export interface ClaudeExport {
  conversations: ClaudeConversation[];
}

// Claude Code JSONL message types
export interface ClaudeCodeMessage {
  id: string;
  type: 'text' | 'tool_use' | 'tool_result';
  role: 'user' | 'assistant';
  content?: string | Array<{
    type: string;
    text?: string;
    name?: string;
    input?: any;
  }>;
  timestamp?: string;
}

export function parseClaudeExport(jsonContent: string): ExtractedPrompt[] {
  try {
    const data: ClaudeExport = JSON.parse(jsonContent);
    const prompts: ExtractedPrompt[] = [];

    for (const conversation of data.conversations) {
      // Extract only human messages
      const humanMessages = conversation.messages.filter(msg => msg.sender === 'human');
      
      for (const message of humanMessages) {
        if (message.text.trim()) {
          // Generate a name from the first line or conversation name
          const firstLine = message.text.split('\n')[0];
          const name = firstLine.length > 50 
            ? firstLine.substring(0, 50) + '...' 
            : firstLine;

          prompts.push({
            title: name || conversation.name || 'Untitled Prompt',
            content: message.text,
            metadata: {
              source: 'claude',
              conversationId: conversation.uuid,
              conversationTitle: conversation.name,
              timestamp: new Date(message.created_at).getTime(),
            },
          });
        }
      }
    }

    return prompts;
  } catch (error) {
    console.error('Failed to parse Claude export:', error);
    throw new Error('Invalid Claude export format');
  }
}

export function parseClaudeCodeJSONL(jsonlContent: string): ExtractedPrompt[] {
  const prompts: ExtractedPrompt[] = [];
  const lines = jsonlContent.split('\n').filter(line => line.trim());
  
  let sessionId = `claude-code-${Date.now()}`;
  let sessionTitle = 'Claude Code Session';
  
  for (const line of lines) {
    try {
      const message: ClaudeCodeMessage = JSON.parse(line);
      
      // Extract user messages only
      if (message.role === 'user') {
        let content = '';
        
        // Handle different content formats
        if (typeof message.content === 'string') {
          content = message.content;
        } else if (Array.isArray(message.content)) {
          // Extract text from content array
          content = message.content
            .filter(item => item.type === 'text' && item.text)
            .map(item => item.text)
            .join('\n');
        }
        
        if (content.trim()) {
          // Generate a name from the first line
          const firstLine = content.split('\n')[0];
          const name = firstLine.length > 50 
            ? firstLine.substring(0, 50) + '...' 
            : firstLine;

          prompts.push({
            title: name || 'Claude Code Prompt',
            content: content,
            metadata: {
              source: 'claude',
              conversationId: sessionId,
              conversationTitle: sessionTitle,
              timestamp: message.timestamp ? new Date(message.timestamp).getTime() : Date.now(),
              model: 'claude-3.5-sonnet', // Claude Code typically uses this
            },
          });
        }
      }
    } catch (error) {
      console.error('Failed to parse JSONL line:', error);
      // Skip invalid lines
    }
  }

  return prompts;
}

export function validateClaudeExport(jsonContent: string): boolean {
  try {
    const data = JSON.parse(jsonContent);
    return Array.isArray(data.conversations);
  } catch {
    return false;
  }
}

export function validateClaudeCodeJSONL(jsonlContent: string): boolean {
  const lines = jsonlContent.split('\n').filter(line => line.trim());
  if (lines.length === 0) return false;
  
  try {
    // Check if first line is valid JSON
    const firstLine = JSON.parse(lines[0]);
    return firstLine.type && firstLine.role;
  } catch {
    return false;
  }
}