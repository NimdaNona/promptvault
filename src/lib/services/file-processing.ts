import { ParsedPrompt, ImportPlatform } from '@/lib/types/import';
import { ChatGPTParser } from '@/lib/importers/chatgpt';
import { ClaudeParser } from '@/lib/importers/claude-new';
import { GeminiParser } from '@/lib/importers/gemini-new';
import { ClineParser } from '@/lib/importers/cline-new';
import { CursorParser } from '@/lib/importers/cursor-new';
import { AICategorizer } from './ai-categorizer';
import { db } from '@/lib/db';
import { prompts, promptVersions, tags, promptTags, users } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';

interface ProcessFileOptions {
  blobUrl: string;
  platform: ImportPlatform;
  userId: string;
  sessionId: string;
  onProgress?: (progress: number, message: string) => Promise<void>;
}

interface ProcessResult {
  totalPrompts: number;
  processedPrompts: number;
  failedPrompts: number;
  metadata: Record<string, any>;
}

export class FileProcessingService {
  private categorizer: AICategorizer;
  private parsers: Record<ImportPlatform, any>;

  constructor() {
    this.categorizer = new AICategorizer();
    this.parsers = {
      chatgpt: new ChatGPTParser(),
      claude: new ClaudeParser(),
      gemini: new GeminiParser(),
      cline: new ClineParser(),
      cursor: new CursorParser()
    };
  }

  async processFile(options: ProcessFileOptions): Promise<ProcessResult> {
    const { blobUrl, platform, userId, sessionId, onProgress } = options;

    // Download file from blob storage
    await onProgress?.(10, 'Downloading file...');
    const response = await fetch(blobUrl);
    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.statusText}`);
    }

    const content = await response.text();
    await onProgress?.(20, 'Parsing file...');

    // Parse prompts using platform-specific parser
    const parser = this.parsers[platform];
    if (!parser) {
      throw new Error(`Unsupported platform: ${platform}`);
    }

    const parsedPrompts = await parser.parse(content);
    const totalPrompts = parsedPrompts.length;

    await onProgress?.(30, `Found ${totalPrompts} prompts. Starting processing...`);

    // Process prompts in batches
    const BATCH_SIZE = 10;
    let processedPrompts = 0;
    let failedPrompts = 0;
    const results = [];

    // Get user's prompt count for tier checking
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      throw new Error('User not found');
    }

    for (let i = 0; i < parsedPrompts.length; i += BATCH_SIZE) {
      const batch = parsedPrompts.slice(i, i + BATCH_SIZE);
      const progress = 30 + ((i / parsedPrompts.length) * 60);
      
      await onProgress?.(
        Math.round(progress),
        `Processing prompts ${i + 1}-${Math.min(i + BATCH_SIZE, parsedPrompts.length)} of ${totalPrompts}...`
      );

      try {
        // Categorize batch using AI
        const categorizedBatch = await this.categorizer.categorizeBatch(batch);

        // Save to database
        await db.transaction(async (tx) => {
          const now = new Date();
          
          for (const categorizedPrompt of categorizedBatch) {
            try {
              // Create prompt
              const promptId = crypto.randomUUID();

              await tx.insert(prompts).values({
                id: promptId,
                userId,
                name: categorizedPrompt.title || 'Imported Prompt',
                description: categorizedPrompt.description,
                content: categorizedPrompt.content,
                model: categorizedPrompt.metadata?.model || 'gpt-4',
                isPublic: false,
                folder: categorizedPrompt.category,
                metadata: {
                  ...categorizedPrompt.metadata,
                  importedFrom: platform,
                  importSessionId: sessionId,
                  originalTimestamp: categorizedPrompt.timestamp
                },
                createdAt: now,
                updatedAt: now
              });

              // Create initial version
              await tx.insert(promptVersions).values({
                promptId,
                version: 1,
                content: categorizedPrompt.content,
                metadata: categorizedPrompt.metadata,
                changeMessage: 'Initial import',
                createdAt: now,
                createdBy: userId
              });

              // Handle tags
              if (categorizedPrompt.tags && categorizedPrompt.tags.length > 0) {
                for (const tagName of categorizedPrompt.tags) {
                  // Check if tag exists
                  let [tag] = await tx
                    .select()
                    .from(tags)
                    .where(and(
                      eq(tags.userId, userId),
                      eq(tags.name, tagName)
                    ))
                    .limit(1);

                  // Create tag if it doesn't exist
                  if (!tag) {
                    const newTag = {
                      id: crypto.randomUUID(),
                      name: tagName,
                      userId,
                      color: '#3B82F6',
                      createdAt: now
                    };
                    await tx.insert(tags).values(newTag);
                    tag = newTag;
                  }

                  // Link prompt to tag
                  await tx.insert(promptTags).values({
                    promptId,
                    tagId: tag.id
                  });
                }
              }

              processedPrompts++;
            } catch (error) {
              console.error('Failed to save prompt:', error);
              failedPrompts++;
            }
          }

          // Update user prompt count
          await tx
            .update(users)
            .set({ 
              promptCount: user.promptCount + processedPrompts,
              updatedAt: now
            })
            .where(eq(users.id, userId));
        });

        results.push(...categorizedBatch);
      } catch (error) {
        console.error('Batch processing error:', error);
        failedPrompts += batch.length;
      }
    }

    await onProgress?.(95, 'Finalizing import...');

    return {
      totalPrompts,
      processedPrompts,
      failedPrompts,
      metadata: {
        platform,
        importDate: new Date().toISOString(),
        categories: [...new Set(results.map(r => r.category).filter(Boolean))],
        tags: [...new Set(results.flatMap(r => r.tags || []))]
      }
    };
  }
}