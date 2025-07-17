import { db } from "@/lib/db";
import { prompts, promptVersions, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { ExtractedPrompt } from "@/lib/importers";
import { ImportOptions, createTagsForPrompt, sanitizePromptName } from "./utils";
import { importProgress } from "./progress";
import { analyzeClinePrompt } from "@/lib/ai/prompt-analyzer";
import { TIERS } from "@/lib/tiers";

export interface ImportedPrompt {
  id: string;
  name: string;
  content: string;
  folder: string;
  tags: string[];
  metadata: any;
}

export interface ProcessedPrompt extends ImportedPrompt {
  originalIndex: number;
  error?: string;
}

export async function processImportBatch(
  extractedPrompts: ExtractedPrompt[],
  userId: string,
  sessionId: string,
  options: ImportOptions = {}
): Promise<ProcessedPrompt[]> {
  const processed: ProcessedPrompt[] = [];
  const batchSize = options.batchSize || 5;
  
  // Get user for tier checking
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId)
  });
  
  if (!user) {
    throw new Error("User not found");
  }
  
  // Check tier limits
  const tierLimits = TIERS[user.tier as keyof typeof TIERS]?.limits || TIERS.free.limits;
  const remainingSlots = tierLimits.prompts === -1 
    ? Infinity 
    : Math.max(0, tierLimits.prompts - user.promptCount);
  
  if (remainingSlots === 0) {
    importProgress.errorSession(
      sessionId, 
      `You've reached the ${tierLimits.prompts} prompt limit for the ${user.tier} tier. Please upgrade to import more prompts.`
    );
    return [];
  }
  
  // Limit prompts to available slots
  const promptsToProcess = extractedPrompts.slice(0, remainingSlots);
  
  if (promptsToProcess.length < extractedPrompts.length) {
    importProgress.addError(
      sessionId,
      `Only importing first ${promptsToProcess.length} prompts due to tier limit`
    );
  }
  
  // Get existing prompts for duplicate detection and AI analysis
  const existingPrompts = options.skipDuplicates === false ? [] : 
    await db.query.prompts.findMany({
      where: eq(prompts.userId, userId),
      limit: 100
    });
  
  // Process in batches
  for (let i = 0; i < promptsToProcess.length; i += batchSize) {
    const batch = promptsToProcess.slice(i, i + batchSize);
    
    importProgress.setStatus(
      sessionId, 
      'processing',
      `Processing prompts ${i + 1} to ${Math.min(i + batchSize, promptsToProcess.length)}...`
    );
    
    const batchResults = await Promise.all(
      batch.map(async (prompt, batchIndex) => {
        const originalIndex = i + batchIndex;
        
        try {
          // Check for duplicates
          if (options.skipDuplicates !== false) {
            const isDuplicate = existingPrompts.some(
              existing => existing.content.trim() === prompt.content.trim()
            );
            
            if (isDuplicate) {
              importProgress.incrementProcessed(sessionId, false);
              return {
                ...createEmptyProcessedPrompt(prompt, originalIndex),
                error: 'Duplicate prompt skipped'
              };
            }
          }
          
          // AI categorization if enabled
          let aiAnalysis = null;
          if (options.autoCategize !== false && tierLimits.aiOptimizations !== 0) {
            importProgress.setStatus(
              sessionId,
              'categorizing',
              `Analyzing prompt ${originalIndex + 1}...`
            );
            
            try {
              aiAnalysis = await analyzeClinePrompt(prompt, existingPrompts);
            } catch (error) {
              console.error('AI analysis failed:', error);
              // Continue without AI analysis
            }
          }
          
          // Store prompt in database
          importProgress.setStatus(
            sessionId,
            'storing',
            `Saving prompt ${originalIndex + 1}...`
          );
          
          const promptName = sanitizePromptName(
            aiAnalysis?.suggestedName || prompt.title
          );
          
          const promptFolder = options.targetFolder || 
            aiAnalysis?.suggestedFolder || 
            'Cline Imports';
          
          // Create prompt
          const [newPrompt] = await db.insert(prompts).values({
            userId,
            name: promptName,
            content: prompt.content,
            folder: promptFolder,
            metadata: {
              ...prompt.metadata,
              importSessionId: sessionId,
              aiAnalysis
            }
          }).returning();
          
          // Create initial version
          await db.insert(promptVersions).values({
            promptId: newPrompt.id,
            version: 1,
            content: prompt.content,
            metadata: prompt.metadata,
            changeMessage: 'Initial import from Cline',
            createdBy: userId
          });
          
          // Create tags if AI suggested any
          const tagNames = aiAnalysis?.tags || [];
          if (tagNames.length > 0) {
            await createTagsForPrompt(newPrompt.id, tagNames, userId);
          }
          
          importProgress.incrementProcessed(sessionId, true);
          
          return {
            id: newPrompt.id,
            name: newPrompt.name,
            content: newPrompt.content,
            folder: newPrompt.folder || '',
            tags: tagNames,
            metadata: newPrompt.metadata,
            originalIndex,
          } as ProcessedPrompt;
          
        } catch (error) {
          console.error(`Failed to import prompt ${originalIndex}:`, error);
          importProgress.incrementProcessed(sessionId, false);
          importProgress.addError(
            sessionId,
            `Failed to import prompt "${prompt.title}": ${error instanceof Error ? error.message : 'Unknown error'}`
          );
          
          return {
            ...createEmptyProcessedPrompt(prompt, originalIndex),
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      })
    );
    
    processed.push(...batchResults);
    
    // Rate limiting pause between batches
    if (i + batchSize < promptsToProcess.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  // Update user's prompt count
  const successfulImports = processed.filter(p => !p.error).length;
  if (successfulImports > 0) {
    await db.update(users)
      .set({ 
        promptCount: user.promptCount + successfulImports,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));
  }
  
  return processed;
}

function createEmptyProcessedPrompt(
  prompt: ExtractedPrompt, 
  originalIndex: number
): ProcessedPrompt {
  return {
    id: '',
    name: prompt.title,
    content: prompt.content,
    folder: '',
    tags: [],
    metadata: prompt.metadata,
    originalIndex
  };
}