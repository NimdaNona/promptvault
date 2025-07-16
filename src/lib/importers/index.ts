import { parseChatGPTExport, validateChatGPTExport } from './chatgpt';
import { parseClaudeExport, parseClaudeCodeJSONL, validateClaudeExport, validateClaudeCodeJSONL } from './claude';
import { parseGeminiExport, validateGeminiExport } from './gemini';
import { parseClineExport, validateClineExport } from './cline';
import { parseCursorExport, validateCursorExport } from './cursor';

export type ImportSource = 'chatgpt' | 'claude' | 'gemini' | 'cline' | 'cursor' | 'file';

export interface ExtractedPrompt {
  name: string;
  content: string;
  metadata: {
    source: ImportSource;
    conversationId: string;
    conversationTitle: string;
    timestamp: number;
    model?: string;
  };
}

export interface ImportResult {
  prompts: ExtractedPrompt[];
  errors: string[];
  warnings: string[];
}

export class PromptImporter {
  static async importFromFile(file: File, source: ImportSource): Promise<ImportResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    let prompts: ExtractedPrompt[] = [];

    try {
      const content = await file.text();

      switch (source) {
        case 'chatgpt':
          if (!validateChatGPTExport(content)) {
            errors.push('Invalid ChatGPT export format. Please export your data from ChatGPT settings.');
            break;
          }
          prompts = parseChatGPTExport(content);
          if (prompts.length === 0) {
            warnings.push('No user prompts found in the ChatGPT export.');
          }
          break;

        case 'claude':
          // Check if it's JSONL (Claude Code) or JSON (Claude app)
          if (file.name.endsWith('.jsonl')) {
            if (!validateClaudeCodeJSONL(content)) {
              errors.push('Invalid Claude Code JSONL format. Please check the file.');
              break;
            }
            prompts = parseClaudeCodeJSONL(content);
          } else {
            if (!validateClaudeExport(content)) {
              errors.push('Invalid Claude export format. Please export your data from Claude settings.');
              break;
            }
            prompts = parseClaudeExport(content);
          }
          if (prompts.length === 0) {
            warnings.push('No user prompts found in the Claude export.');
          }
          break;

        case 'gemini':
          if (!validateGeminiExport(content)) {
            errors.push('Invalid Gemini export format.');
            break;
          }
          prompts = parseGeminiExport(content);
          if (prompts.length === 0) {
            warnings.push('No user prompts found in the Gemini export.');
          }
          break;

        case 'cline':
          if (!validateClineExport(content)) {
            errors.push('Invalid Cline chat log format. Please check the file.');
            break;
          }
          prompts = parseClineExport(content);
          if (prompts.length === 0) {
            warnings.push('No user prompts found in the Cline chat log.');
          }
          break;

        case 'cursor':
          if (!validateCursorExport(content)) {
            errors.push('Invalid Cursor export format. Please check the file.');
            break;
          }
          prompts = parseCursorExport(content);
          if (prompts.length === 0) {
            warnings.push('No user prompts found in the Cursor export.');
          }
          break;

        case 'file':
          // Try to parse as JSON first
          try {
            const jsonData = JSON.parse(content);
            if (Array.isArray(jsonData)) {
              prompts = jsonData.map((item, index) => ({
                name: item.name || item.title || `Prompt ${index + 1}`,
                content: item.content || item.prompt || item.text || JSON.stringify(item),
                metadata: {
                  source: 'file' as const,
                  conversationId: `file-${Date.now()}-${index}`,
                  conversationTitle: file.name,
                  timestamp: Date.now(),
                },
              }));
            } else if (typeof jsonData === 'object') {
              // Single prompt object
              prompts = [{
                name: jsonData.name || jsonData.title || file.name.replace(/\.[^/.]+$/, ''),
                content: jsonData.content || jsonData.prompt || jsonData.text || JSON.stringify(jsonData),
                metadata: {
                  source: 'file' as const,
                  conversationId: `file-${Date.now()}`,
                  conversationTitle: file.name,
                  timestamp: Date.now(),
                },
              }];
            }
          } catch {
            // Not JSON, treat as plain text
            const lines = content.split('\n').filter(line => line.trim());
            if (lines.length > 0) {
              // Split by double newlines to separate prompts
              const promptTexts = content.split(/\n\s*\n/).filter(text => text.trim());
              
              prompts = promptTexts.map((text, index) => {
                const firstLine = text.trim().split('\n')[0];
                const name = firstLine.length > 50 
                  ? firstLine.substring(0, 50) + '...' 
                  : firstLine;
                
                return {
                  name: name || `Prompt ${index + 1}`,
                  content: text.trim(),
                  metadata: {
                    source: 'file' as const,
                    conversationId: `file-${Date.now()}-${index}`,
                    conversationTitle: file.name,
                    timestamp: Date.now(),
                  },
                };
              });
            }
          }
          
          if (prompts.length === 0) {
            errors.push('No valid prompts found in the file.');
          }
          break;

        default:
          errors.push(`Unsupported import source: ${source}`);
      }
    } catch (error) {
      errors.push(`Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return { prompts, errors, warnings };
  }

  static detectDuplicates(newPrompts: ExtractedPrompt[], existingPrompts: any[]): {
    unique: ExtractedPrompt[];
    duplicates: ExtractedPrompt[];
  } {
    const unique: ExtractedPrompt[] = [];
    const duplicates: ExtractedPrompt[] = [];

    for (const newPrompt of newPrompts) {
      const isDuplicate = existingPrompts.some(existing => 
        existing.content.trim() === newPrompt.content.trim()
      );

      if (isDuplicate) {
        duplicates.push(newPrompt);
      } else {
        unique.push(newPrompt);
      }
    }

    return { unique, duplicates };
  }
}