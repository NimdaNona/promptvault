import { openai } from "@/lib/openai";
import { ExtractedPrompt } from "@/lib/importers";
import { extractPromptContext } from "@/lib/import/utils";

export interface PromptAnalysis {
  category: string;
  tags: string[];
  complexity: 'simple' | 'moderate' | 'complex';
  suggestedFolder: string;
  suggestedName: string;
  relatedPrompts: string[];
}

const PROMPT_CATEGORIES = [
  'Code Generation',
  'Debugging',
  'Refactoring',
  'Documentation',
  'Testing',
  'Architecture',
  'DevOps',
  'Data Processing',
  'UI/UX',
  'API Development',
  'Database',
  'Security',
  'Performance',
  'Learning',
  'Other'
];

export async function analyzeClinePrompt(
  prompt: ExtractedPrompt,
  existingPrompts: any[] = []
): Promise<PromptAnalysis> {
  const context = extractPromptContext(prompt.content);
  
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are analyzing a prompt extracted from Cline (VSCode AI assistant).
Analyze the prompt and provide categorization and metadata.

Categories to consider: ${PROMPT_CATEGORIES.join(', ')}

Consider these aspects:
1. The main purpose of the prompt
2. Technologies mentioned: ${context.mentions.join(', ') || 'none detected'}
3. Presence of code blocks: ${context.codeBlocks.length > 0 ? 'yes' : 'no'}
4. Complexity based on prompt length and requirements

Return JSON with this structure:
{
  "category": "primary category from the list",
  "tags": ["tag1", "tag2", "tag3"], // 3-5 relevant tags
  "complexity": "simple|moderate|complex",
  "suggestedFolder": "folder/path", // based on category
  "suggestedName": "descriptive name for the prompt",
  "relatedPrompts": [] // IDs of similar existing prompts
}`
        },
        {
          role: 'user',
          content: `Analyze this prompt:

Content: ${prompt.content.substring(0, 1000)}${prompt.content.length > 1000 ? '...' : ''}

Task context: ${prompt.metadata.conversationTitle}
First line: ${context.firstLine}
Content length: ${context.length} characters
Has code blocks: ${context.codeBlocks.length > 0}

${existingPrompts.length > 0 ? `
Existing user prompts for similarity check (return IDs of similar ones):
${existingPrompts.slice(0, 10).map(p => `- ${p.id}: ${p.name}`).join('\n')}
` : ''}`
        }
      ],
      temperature: 0.3,
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    
    // Validate and sanitize the response
    return {
      category: PROMPT_CATEGORIES.includes(result.category) ? result.category : 'Other',
      tags: Array.isArray(result.tags) ? result.tags.slice(0, 5) : [],
      complexity: ['simple', 'moderate', 'complex'].includes(result.complexity) 
        ? result.complexity 
        : determineComplexity(prompt.content),
      suggestedFolder: sanitizeFolder(result.suggestedFolder || result.category),
      suggestedName: result.suggestedName || generateDefaultName(prompt, context),
      relatedPrompts: Array.isArray(result.relatedPrompts) ? result.relatedPrompts : []
    };
    
  } catch (error) {
    console.error('AI analysis error:', error);
    
    // Fallback analysis without AI
    return {
      category: determineCategory(context),
      tags: generateTags(context),
      complexity: determineComplexity(prompt.content),
      suggestedFolder: 'Cline Imports',
      suggestedName: generateDefaultName(prompt, context),
      relatedPrompts: []
    };
  }
}

// Fallback functions for when AI is unavailable
function determineCategory(context: ReturnType<typeof extractPromptContext>): string {
  const mentions = context.mentions.join(' ').toLowerCase();
  
  if (mentions.includes('debug') || mentions.includes('error') || mentions.includes('fix')) {
    return 'Debugging';
  }
  if (mentions.includes('test') || mentions.includes('spec')) {
    return 'Testing';
  }
  if (mentions.includes('refactor') || mentions.includes('improve')) {
    return 'Refactoring';
  }
  if (mentions.includes('api') || mentions.includes('endpoint')) {
    return 'API Development';
  }
  if (mentions.includes('database') || mentions.includes('sql')) {
    return 'Database';
  }
  if (context.codeBlocks.length > 0) {
    return 'Code Generation';
  }
  
  return 'Other';
}

function generateTags(context: ReturnType<typeof extractPromptContext>): string[] {
  const tags: string[] = [];
  
  // Add technology tags
  const techMap: Record<string, string> = {
    'react': 'React',
    'vue': 'Vue',
    'angular': 'Angular',
    'typescript': 'TypeScript',
    'javascript': 'JavaScript',
    'python': 'Python',
    'java': 'Java',
    'rust': 'Rust',
    'go': 'Go',
    'sql': 'SQL',
    'docker': 'Docker',
    'kubernetes': 'Kubernetes',
    'aws': 'AWS',
    'azure': 'Azure',
    'gcp': 'GCP'
  };
  
  for (const mention of context.mentions) {
    const tag = techMap[mention.toLowerCase()];
    if (tag && !tags.includes(tag)) {
      tags.push(tag);
    }
  }
  
  // Add type tags
  if (context.codeBlocks.length > 0) {
    tags.push('Code');
  }
  
  if (context.firstLine.includes('?')) {
    tags.push('Question');
  }
  
  return tags.slice(0, 5);
}

function determineComplexity(content: string): 'simple' | 'moderate' | 'complex' {
  const lines = content.split('\n').length;
  const words = content.split(/\s+/).length;
  
  if (lines < 10 && words < 100) {
    return 'simple';
  }
  if (lines < 50 && words < 500) {
    return 'moderate';
  }
  return 'complex';
}

function sanitizeFolder(folder: string): string {
  return folder
    .replace(/[^a-zA-Z0-9\s\-_/]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .split('/')
    .filter(Boolean)
    .join('/');
}

function generateDefaultName(
  prompt: ExtractedPrompt, 
  context: ReturnType<typeof extractPromptContext>
): string {
  // Try to use the first line if it's meaningful
  if (context.firstLine && context.firstLine.length > 10 && context.firstLine.length < 100) {
    return context.firstLine;
  }
  
  // Fall back to task name + index
  const taskName = prompt.metadata.conversationTitle || 'Cline Task';
  const index = prompt.metadata.messageIndex || 0;
  
  return `${taskName} - Prompt ${index + 1}`;
}