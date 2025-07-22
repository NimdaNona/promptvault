import { ParsedPrompt } from '@/lib/types/import';

export interface ChatGPTMessage {
  author: {
    role: string;
    name?: string;
    metadata?: any;
  };
  content: {
    content_type: string;
    parts?: string[];
  };
  status: string;
  end_turn?: boolean;
  weight: number;
  metadata: any;
  recipient: string;
}

export interface ChatGPTConversation {
  id: string;
  title: string;
  create_time: number;
  update_time: number;
  mapping: Record<string, any>;
  moderation_results: any[];
  current_node: string;
  conversation_template_id?: string;
  conversation_id: string;
  messages?: ChatGPTMessage[];
}

export interface ChatGPTExport {
  conversations: ChatGPTConversation[];
  user?: any;
}

export class ChatGPTParser {
  async parse(content: string): Promise<ParsedPrompt[]> {
    try {
      const data: ChatGPTExport = JSON.parse(content);
      const prompts: ParsedPrompt[] = [];

      for (const conversation of data.conversations) {
        // Extract messages from the mapping structure
        const messages: ChatGPTMessage[] = [];
        
        if (conversation.mapping) {
          // ChatGPT uses a tree structure, we need to traverse it
          const nodes = Object.values(conversation.mapping);
          
          // Find root nodes and traverse
          for (const node of nodes) {
            if (node.message && node.message.author?.role === 'user') {
              const userMessage = node.message as ChatGPTMessage;
              
              // Extract the prompt content
              const content = userMessage.content?.parts?.join('\n') || '';
              
              if (content.trim()) {
                prompts.push({
                  id: `chatgpt-${conversation.id}-${node.id}`,
                  content: content,
                  timestamp: new Date(conversation.create_time * 1000),
                  metadata: {
                    conversationId: conversation.id,
                    conversationTitle: conversation.title,
                    model: this.detectModel(conversation, node),
                  },
                  sourceContext: conversation.title
                });
              }
            }
          }
        }
      }

      return prompts;
    } catch (error) {
      console.error('Failed to parse ChatGPT export:', error);
      throw new Error('Invalid ChatGPT export format');
    }
  }

  private detectModel(conversation: ChatGPTConversation, node: any): string | undefined {
    // Try to detect model from conversation metadata or node info
    if (node.message?.metadata?.model_slug) {
      return node.message.metadata.model_slug;
    }
    
    // Default models based on conversation template
    if (conversation.conversation_template_id) {
      if (conversation.conversation_template_id.includes('gpt-4')) return 'gpt-4';
      if (conversation.conversation_template_id.includes('gpt-3.5')) return 'gpt-3.5-turbo';
    }
    
    return undefined;
  }
}