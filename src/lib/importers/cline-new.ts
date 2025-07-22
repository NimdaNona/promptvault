import { ParsedPrompt } from '@/lib/types/import';

export class ClineParser {
  async parse(content: string): Promise<ParsedPrompt[]> {
    const prompts: ParsedPrompt[] = [];
    
    // Cline exports are in Markdown format
    // Format: ### Human\n[content]\n\n### Assistant\n[response]
    
    const sections = content.split(/### (Human|Assistant)/);
    
    for (let i = 1; i < sections.length; i += 2) {
      const role = sections[i];
      const text = sections[i + 1]?.trim();
      
      if (role === 'Human' && text) {
        prompts.push({
          id: `cline-${Date.now()}-${prompts.length}`,
          content: text.trim(),
          timestamp: new Date(),
          metadata: {
            format: 'markdown'
          }
        });
      }
    }

    // If no sections found, try alternative parsing
    if (prompts.length === 0) {
      const lines = content.split('\n');
      let currentPrompt = '';
      let inHumanSection = false;

      for (const line of lines) {
        if (line.includes('Human:') || line.includes('User:')) {
          if (currentPrompt) {
            prompts.push({
              id: `cline-${Date.now()}-${prompts.length}`,
              content: currentPrompt.trim(),
              timestamp: new Date()
            });
          }
          currentPrompt = line.replace(/^.*?(Human|User):\s*/, '');
          inHumanSection = true;
        } else if (line.includes('Assistant:') || line.includes('Cline:')) {
          inHumanSection = false;
        } else if (inHumanSection && line.trim()) {
          currentPrompt += '\n' + line;
        }
      }

      if (currentPrompt) {
        prompts.push({
          id: `cline-${Date.now()}-${prompts.length}`,
          content: currentPrompt.trim(),
          timestamp: new Date()
        });
      }
    }

    return prompts;
  }
}