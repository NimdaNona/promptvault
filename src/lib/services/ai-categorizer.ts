import OpenAI from 'openai';
import { ParsedPrompt } from '@/lib/types/import';
import { Redis } from '@upstash/redis';

interface CategorizedPrompt extends ParsedPrompt {
  title: string;
  description: string;
  category: string;
  tags: string[];
}

export class AICategorizer {
  private openai: OpenAI;
  private redis: Redis;
  private cache = new Map<string, CategorizedPrompt>();

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!
    });
    this.redis = new Redis({
      url: process.env.KV_REST_API_URL!,
      token: process.env.KV_REST_API_TOKEN!
    });
  }

  async categorizeBatch(prompts: ParsedPrompt[]): Promise<CategorizedPrompt[]> {
    const results: CategorizedPrompt[] = [];
    
    // Check cache first
    const uncachedPrompts: ParsedPrompt[] = [];
    for (const prompt of prompts) {
      const cacheKey = this.getCacheKey(prompt.content);
      
      // Check memory cache
      if (this.cache.has(cacheKey)) {
        results.push(this.cache.get(cacheKey)!);
        continue;
      }

      // Check Redis cache
      const cached = await this.redis.get<CategorizedPrompt>(cacheKey);
      if (cached) {
        this.cache.set(cacheKey, cached);
        results.push(cached);
        continue;
      }

      uncachedPrompts.push(prompt);
    }

    // Process uncached prompts
    if (uncachedPrompts.length > 0) {
      const categorized = await this.categorizeWithAI(uncachedPrompts);
      
      // Cache results
      for (let i = 0; i < uncachedPrompts.length; i++) {
        const prompt = uncachedPrompts[i];
        const result = categorized[i];
        const cacheKey = this.getCacheKey(prompt.content);
        
        // Store in both memory and Redis cache
        this.cache.set(cacheKey, result);
        await this.redis.setex(cacheKey, 86400, JSON.stringify(result)); // 24 hour cache
        
        results.push(result);
      }
    }

    return results;
  }

  private async categorizeWithAI(prompts: ParsedPrompt[]): Promise<CategorizedPrompt[]> {
    const systemPrompt = `You are an AI assistant that analyzes prompts and provides structured metadata.
For each prompt, you need to:
1. Generate a concise, descriptive title (max 100 chars)
2. Write a brief description explaining what the prompt does (max 200 chars)
3. Assign a category from: marketing, development, writing, analysis, creative, business, education, other
4. Generate 1-3 relevant tags (lowercase, single words)

Respond with a JSON array where each object has: title, description, category, tags`;

    const userPrompt = `Analyze these ${prompts.length} prompts and provide metadata for each:\n\n${
      prompts.map((p, i) => `Prompt ${i + 1}:\n${p.content.substring(0, 500)}${p.content.length > 500 ? '...' : ''}`).join('\n\n')
    }`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' }
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        throw new Error('No response from OpenAI');
      }

      const parsed = JSON.parse(response);
      const metadata = Array.isArray(parsed) ? parsed : parsed.prompts || [];

      return prompts.map((prompt, index) => {
        const meta = metadata[index] || {};
        return {
          ...prompt,
          title: meta.title || prompt.metadata?.title || 'Untitled Prompt',
          description: meta.description || '',
          category: this.validateCategory(meta.category),
          tags: this.validateTags(meta.tags || [])
        };
      });
    } catch (error) {
      console.error('AI categorization error:', error);
      
      // Fallback to basic categorization
      return prompts.map(prompt => ({
        ...prompt,
        title: prompt.metadata?.title || this.generateBasicTitle(prompt.content),
        description: 'Imported prompt',
        category: 'other',
        tags: []
      }));
    }
  }

  private getCacheKey(content: string): string {
    // Create a stable cache key from content
    const normalized = content.toLowerCase().trim().substring(0, 200);
    return `prompt:category:${this.hashString(normalized)}`;
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  private validateCategory(category: string | undefined): string {
    const validCategories = ['marketing', 'development', 'writing', 'analysis', 'creative', 'business', 'education', 'other'];
    return validCategories.includes(category || '') ? category! : 'other';
  }

  private validateTags(tags: any[]): string[] {
    if (!Array.isArray(tags)) return [];
    return tags
      .filter(tag => typeof tag === 'string')
      .map(tag => tag.toLowerCase().replace(/[^a-z0-9]/g, ''))
      .filter(tag => tag.length > 0 && tag.length < 20)
      .slice(0, 3);
  }

  private generateBasicTitle(content: string): string {
    // Extract first meaningful line or sentence
    const lines = content.split('\n').filter(line => line.trim().length > 0);
    const firstLine = lines[0] || 'Untitled';
    
    // Clean and truncate
    const title = firstLine
      .replace(/^(prompt|system|user|assistant):/i, '')
      .trim()
      .substring(0, 100);
    
    return title || 'Untitled Prompt';
  }
}