import { z } from 'zod';
import type { ExtractedPrompt } from './index';

// Cline task structure from markdown
export interface ClineTask {
  id: string;
  title: string;
  timestamp: string;
  messages: ClineMessage[];
  metadata: {
    model?: string;
    totalTokens?: number;
    codeBlocks?: number;
    filesModified?: string[];
  };
}

export interface ClineMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

// Schema for validating parsed data
const ClineMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
  timestamp: z.string().optional(),
});

const ClineTaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  timestamp: z.string(),
  messages: z.array(ClineMessageSchema),
  metadata: z.object({
    model: z.string().optional(),
    totalTokens: z.number().optional(),
    codeBlocks: z.number().optional(),
    filesModified: z.array(z.string()).optional(),
  }),
});

export class ClineMarkdownParser {
  private extractCodeBlocks(content: string): { text: string; codeBlocks: string[] } {
    const codeBlocks: string[] = [];
    let text = content;
    
    // Extract code blocks and replace with placeholders
    const codeBlockRegex = /```[\s\S]*?```/g;
    const matches = content.match(codeBlockRegex) || [];
    
    matches.forEach((block, index) => {
      codeBlocks.push(block);
      text = text.replace(block, `[CODE_BLOCK_${index}]`);
    });
    
    return { text, codeBlocks };
  }

  private parseTaskHeader(line: string): { id: string; title: string; timestamp: string } | null {
    // Expected format: ## Task abc-123 - Implement feature X (2024-01-15 10:30)
    const headerRegex = /^##\s+Task\s+([a-zA-Z0-9-]+)\s+-\s+(.+?)\s*\((\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2})\)$/;
    const match = line.match(headerRegex);
    
    if (!match) return null;
    
    return {
      id: match[1],
      title: match[2].trim(),
      timestamp: match[3],
    };
  }

  private parseMessage(lines: string[]): ClineMessage | null {
    if (lines.length === 0) return null;
    
    const firstLine = lines[0].trim();
    let role: 'user' | 'assistant' | null = null;
    let timestamp: string | undefined;
    
    // Check for user message (more flexible matching)
    if (firstLine.match(/^(\*\*|###?\s*)(Human|User)/i)) {
      role = 'user';
    }
    // Check for assistant message
    else if (firstLine.match(/^(\*\*|###?\s*)(Assistant|Cline|AI|Bot)/i)) {
      role = 'assistant';
    }
    
    if (!role) return null;
    
    // Extract timestamp if present
    const timestampMatch = firstLine.match(/\((\d{2}:\d{2})\):/);
    if (timestampMatch) {
      timestamp = timestampMatch[1];
    }
    
    // Extract content (skip the first line with role indicator)
    const content = lines.slice(1).join('\n').trim();
    
    if (!content) return null;
    
    return {
      role,
      content,
      timestamp,
    };
  }

  private extractMetadata(task: ClineTask): ClineTask['metadata'] {
    const metadata: ClineTask['metadata'] = {};
    
    // Count code blocks across all messages
    let codeBlockCount = 0;
    const filesModified = new Set<string>();
    
    for (const message of task.messages) {
      // Count code blocks
      const codeBlocks = message.content.match(/```[\s\S]*?```/g) || [];
      codeBlockCount += codeBlocks.length;
      
      // Extract file paths from code blocks
      for (const block of codeBlocks) {
        const fileMatch = block.match(/```(?:typescript|javascript|python|jsx?|tsx?|py|rb|go|rust|java|cpp|c|h|css|scss|html|xml|json|yaml|yml|toml|md|sh|bash)\s+(?:\/\/|#|<!--)?\s*(.+?)\n/);
        if (fileMatch && fileMatch[1]) {
          filesModified.add(fileMatch[1].trim());
        }
      }
      
      // Look for model mentions
      if (!metadata.model && message.role === 'assistant') {
        const modelMatch = message.content.match(/(?:using|model:|powered by)\s*(gpt-4|claude-3|gemini|llama|mixtral|anthropic)/i);
        if (modelMatch) {
          metadata.model = modelMatch[1];
        }
      }
    }
    
    metadata.codeBlocks = codeBlockCount;
    if (filesModified.size > 0) {
      metadata.filesModified = Array.from(filesModified);
    }
    
    return metadata;
  }

  private generateTaskId(title: string, timestamp: string): string {
    const cleanTitle = title.toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 20);
    const timestampPart = timestamp ? timestamp.replace(/[^0-9]/g, '').substring(0, 8) : Date.now().toString();
    return `${cleanTitle}-${timestampPart}`;
  }

  private parseSingleTask(lines: string[]): ClineTask | null {
    const messages: ClineMessage[] = [];
    let title = '';
    let timestamp = '';
    let summary = '';
    let inConversation = false;
    let messageBuffer: string[] = [];
    let currentRole: 'user' | 'assistant' | null = null;
    let metadata: Record<string, any> = {};
    let inMetadata = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();
      
      // Extract title from # header (more flexible)
      if (trimmedLine.startsWith('# ') && !title) {
        title = trimmedLine.replace(/^#\s*/, '').replace(/^Task\s*/i, '').trim() || 'Cline Task';
        continue;
      }
      
      // Handle metadata section (YAML-like format)
      if (trimmedLine === '---') {
        if (!inMetadata) {
          inMetadata = true;
          continue;
        } else {
          inMetadata = false;
          continue;
        }
      }
      
      if (inMetadata) {
        const [key, value] = trimmedLine.split(':').map(s => s.trim());
        if (key && value) {
          if (key === 'model') metadata.model = value;
          else if (key === 'totalTokens') metadata.totalTokens = parseInt(value);
          else if (key === 'cost') metadata.cost = parseFloat(value);
          else if (key === 'duration') metadata.duration = parseInt(value);
        }
        continue;
      }
      
      // Extract created timestamp
      if (trimmedLine.startsWith('Created:')) {
        timestamp = trimmedLine.replace('Created:', '').trim();
        continue;
      }
      
      // Extract summary
      if (trimmedLine === '## Summary') {
        // Read until next section
        let j = i + 1;
        while (j < lines.length && !lines[j].trim().startsWith('##')) {
          if (lines[j].trim()) {
            summary += lines[j].trim() + ' ';
          }
          j++;
        }
        i = j - 1;
        continue;
      }
      
      // Check if we're in conversation section
      if (trimmedLine === '## Conversation') {
        inConversation = true;
        continue;
      }
      
      // Also start conversation if we see message markers without explicit section
      if (!inConversation && (trimmedLine === '### Human' || trimmedLine === '### User' || 
          trimmedLine === '### Assistant' || trimmedLine === '### Cline')) {
        inConversation = true;
      }
      
      // Stop parsing at Additional Context or other sections
      if (trimmedLine === '## Additional Context' || 
          (trimmedLine.startsWith('## ') && trimmedLine !== '## Conversation' && inConversation)) {
        break;
      }
      
      // Parse messages in conversation
      if (inConversation) {
        if (trimmedLine === '### Human' || trimmedLine === '### User') {
          // Save previous message if exists
          if (messageBuffer.length > 0 && currentRole) {
            const content = messageBuffer.join('\n').trim();
            if (content) {
              messages.push({ role: currentRole, content });
            }
          }
          
          currentRole = 'user';
          messageBuffer = [];
        }
        else if (trimmedLine === '### Assistant' || trimmedLine === '### Cline') {
          // Save previous message if exists
          if (messageBuffer.length > 0 && currentRole) {
            const content = messageBuffer.join('\n').trim();
            if (content) {
              messages.push({ role: currentRole, content });
            }
          }
          
          currentRole = 'assistant';
          messageBuffer = [];
        }
        else if (currentRole) {
          // Collect message content
          messageBuffer.push(line);
        }
      }
    }
    
    // Save last message
    if (messageBuffer.length > 0 && currentRole) {
      const content = messageBuffer.join('\n').trim();
      if (content) {
        messages.push({ role: currentRole, content });
      }
    }
    
    // Only return task if we have messages
    if (messages.length === 0) {
      return null;
    }
    
    // Generate ID from title and timestamp
    const id = this.generateTaskId(title || summary || 'task', timestamp);
    
    const task: ClineTask = {
      id,
      title: title || summary || 'Cline Task',
      timestamp: timestamp || new Date().toISOString(),
      messages,
      metadata: { ...this.extractMetadata({ id, title, timestamp, messages, metadata: {} }), ...metadata }
    };
    
    try {
      return ClineTaskSchema.parse(task);
    } catch (error) {
      console.error('Invalid task structure:', error);
      return null;
    }
  }

  public parseClineMarkdown(markdown: string): ClineTask[] {
    const tasks: ClineTask[] = [];
    const lines = markdown.split('\n');
    
    // First, try to parse as a single task (common Cline export format)
    const singleTask = this.parseSingleTask(lines);
    if (singleTask) {
      return [singleTask];
    }
    
    // Otherwise, try to parse multiple tasks format
    let currentTask: Partial<ClineTask> | null = null;
    let messageLines: string[] = [];
    let inMessage = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Check for task header
      if (line.startsWith('## Task')) {
        // Save previous task if exists
        if (currentTask && currentTask.messages && currentTask.messages.length > 0) {
          // Process last message if any
          if (messageLines.length > 0) {
            const message = this.parseMessage(messageLines);
            if (message) {
              currentTask.messages.push(message);
            }
          }
          
          // Extract metadata and validate
          const taskWithMetadata = {
            ...currentTask,
            metadata: this.extractMetadata(currentTask as ClineTask),
          } as ClineTask;
          
          try {
            const validated = ClineTaskSchema.parse(taskWithMetadata);
            tasks.push(validated);
          } catch (error) {
            console.error('Invalid task structure:', error);
          }
        }
        
        // Start new task
        const header = this.parseTaskHeader(line);
        if (header) {
          currentTask = {
            ...header,
            messages: [],
          };
          messageLines = [];
          inMessage = false;
        }
      }
      // Check for message start (flexible matching)
      else if (line.trim().match(/^(\*\*|###?\s*)(Human|User|Assistant|Cline|AI|Bot)/i)) {
        // Process previous message if any
        if (messageLines.length > 0) {
          const message = this.parseMessage(messageLines);
          if (message && currentTask) {
            currentTask.messages = currentTask.messages || [];
            currentTask.messages.push(message);
          }
        }
        
        // Start new message
        messageLines = [line];
        inMessage = true;
      }
      // Continue collecting message lines
      else if (inMessage && currentTask) {
        messageLines.push(line);
      }
    }
    
    // Process last task and message
    if (currentTask) {
      if (messageLines.length > 0) {
        const message = this.parseMessage(messageLines);
        if (message) {
          currentTask.messages = currentTask.messages || [];
          currentTask.messages.push(message);
        }
      }
      
      if (currentTask.messages && currentTask.messages.length > 0) {
        const taskWithMetadata = {
          ...currentTask,
          metadata: this.extractMetadata(currentTask as ClineTask),
        } as ClineTask;
        
        try {
          const validated = ClineTaskSchema.parse(taskWithMetadata);
          tasks.push(validated);
        } catch (error) {
          console.error('Invalid task structure:', error);
        }
      }
    }
    
    return tasks;
  }

  public extractPromptsFromTasks(tasks: ClineTask[]): ExtractedPrompt[] {
    const prompts: ExtractedPrompt[] = [];
    
    for (const task of tasks) {
      // Extract only user messages as prompts
      const userMessages = task.messages.filter(m => m.role === 'user');
      
      userMessages.forEach((message, index) => {
        // Find the corresponding assistant response
        const nextAssistantIndex = task.messages.findIndex(
          (m, i) => i > task.messages.indexOf(message) && m.role === 'assistant'
        );
        
        const assistantResponse = nextAssistantIndex !== -1 
          ? task.messages[nextAssistantIndex].content 
          : null;
        
        const prompt: ExtractedPrompt = {
          title: task.title || `Cline Prompt ${index + 1}`,
          content: message.content,
          metadata: {
            source: 'cline',
            conversationId: task.id,
            conversationTitle: task.title,
            timestamp: new Date(task.timestamp).getTime(),
            model: task.metadata.model,
            messageIndex: index,
            messageTimestamp: message.timestamp,
            response: assistantResponse,
            codeBlocks: this.extractCodeBlocks(message.content).codeBlocks,
            filesModified: task.metadata.filesModified,
          },
        };
        
        prompts.push(prompt);
      });
    }
    
    return prompts;
  }

  public async parseFile(content: string): Promise<ClineTask[]> {
    const tasks = this.parseClineMarkdown(content);
    
    if (tasks.length === 0) {
      throw new Error('No valid Cline tasks found in the markdown file');
    }
    
    return tasks;
  }

  public async parseMultipleFiles(files: { name: string; content: string }[]): Promise<ExtractedPrompt[]> {
    const allPrompts: ExtractedPrompt[] = [];
    const errors: string[] = [];
    
    for (const file of files) {
      try {
        const tasks = await this.parseFile(file.content);
        const prompts = this.extractPromptsFromTasks(tasks);
        
        // Add file name to metadata
        prompts.forEach(prompt => {
          prompt.metadata.fileName = file.name;
        });
        
        allPrompts.push(...prompts);
      } catch (error) {
        console.error(`Error parsing Cline markdown: ${error}`);
        errors.push(`${file.name}: Failed to parse Cline export: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    if (allPrompts.length === 0 && errors.length > 0) {
      throw new Error(`Failed to parse any files:\n${errors.join('\n')}`);
    }
    
    return allPrompts;
  }
}