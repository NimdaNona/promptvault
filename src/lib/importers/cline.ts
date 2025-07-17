import type { ExtractedPrompt } from './index';
import { ClineMarkdownParser } from './cline-markdown-parser';

const parser = new ClineMarkdownParser();

export function parseClineExport(content: string): ExtractedPrompt[] {
  try {
    // Parse markdown format
    const tasks = parser.parseClineMarkdown(content);
    return parser.extractPromptsFromTasks(tasks);
  } catch (error) {
    console.error('Failed to parse Cline export:', error);
    return [];
  }
}

export function validateClineExport(content: string): boolean {
  try {
    // Check for Cline markdown patterns
    const hasTaskHeader = /^#\s*Task/im.test(content);
    const hasConversation = /^##\s*Conversation/im.test(content);
    const hasHumanMessages = /^###\s*(Human|User)/im.test(content);
    const hasAssistantMessages = /^###\s*(Assistant|Cline)/im.test(content);
    
    // Valid if it has task header or conversation structure
    return hasTaskHeader || (hasConversation && (hasHumanMessages || hasAssistantMessages));
  } catch {
    return false;
  }
}