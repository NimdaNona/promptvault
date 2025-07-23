import { db } from "@/lib/db";
import { importSessions, tags, promptTags, prompts } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";

export type ImportSource = 'chatgpt' | 'claude' | 'gemini' | 'cline' | 'cursor' | 'file';

export interface ImportOptions {
  skipDuplicates?: boolean;
  autoCategize?: boolean;
  targetFolder?: string;
  defaultTags?: string[];
  skipAI?: boolean;
  batchSize?: number;
  onProgress?: (progress: number) => void;
}

export interface ImportedPrompt {
  id: string;
  name: string;
  content: string;
  folder: string;
  tags: string[];
  metadata: any;
}

export interface ImportSession {
  id: string;
  userId: string;
  platform: ImportSource;
  processedPrompts: number;
  failedPrompts: number;
  metadata: any;
  startedAt: Date;
}

export interface ImportProgress {
  total: number;
  processed: number;
  imported: number;
  failed: number;
  errors: string[];
  status: 'processing' | 'complete' | 'error';
  summary?: ImportSummary;
}

export interface ImportSummary {
  duration: number;
  categories: Record<string, number>;
  folders: Record<string, number>;
  topTags: string[];
}

// Create a new import session
export async function createImportSession(
  userId: string,
  source: ImportSource,
  metadata: any
): Promise<ImportSession> {
  const sessionId = `import_${Date.now()}_${nanoid(6)}`;
  const [session] = await db.insert(importSessions).values({
    id: sessionId,
    userId,
    platform: source,
    status: 'pending',
    fileName: metadata.fileName || 'unknown.json',
    fileSize: metadata.fileSize || 0,
    fileType: metadata.fileType || 'application/json',
    totalPrompts: 0,
    processedPrompts: 0,
    failedPrompts: 0,
    metadata,
    startedAt: new Date()
  }).returning();
  
  return {
    id: session.id,
    userId: session.userId,
    platform: session.platform as ImportSource,
    processedPrompts: session.processedPrompts || 0,
    failedPrompts: session.failedPrompts || 0,
    metadata: session.metadata,
    startedAt: session.startedAt
  };
}

// Update import session with results
export async function updateImportSession(
  sessionId: string,
  update: {
    status?: 'pending' | 'processing' | 'completed' | 'failed';
    totalPrompts?: number;
    processedPrompts?: number;
    failedPrompts?: number;
    error?: string;
    metadata?: any;
    completedAt?: Date;
  }
): Promise<void> {
  const updateData: any = {};
  
  // Map the fields to match the database schema
  if (update.status !== undefined) updateData.status = update.status;
  if (update.totalPrompts !== undefined) updateData.totalPrompts = update.totalPrompts;
  if (update.processedPrompts !== undefined) updateData.processedPrompts = update.processedPrompts;
  if (update.failedPrompts !== undefined) updateData.failedPrompts = update.failedPrompts;
  if (update.error !== undefined) updateData.error = update.error;
  if (update.metadata !== undefined) updateData.metadata = update.metadata;
  if (update.completedAt !== undefined) updateData.completedAt = update.completedAt;
  
  await db.update(importSessions)
    .set(updateData)
    .where(eq(importSessions.id, sessionId));
}

// Generate a color for a tag based on its name
export function generateTagColor(tagName: string): string {
  const colors = [
    '#3B82F6', // blue
    '#10B981', // green
    '#F59E0B', // amber
    '#EF4444', // red
    '#8B5CF6', // purple
    '#EC4899', // pink
    '#14B8A6', // teal
    '#F97316', // orange
  ];
  
  // Use tag name to consistently pick a color
  let hash = 0;
  for (let i = 0; i < tagName.length; i++) {
    hash = tagName.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return colors[Math.abs(hash) % colors.length];
}

// Create or link tags to a prompt
export async function createTagsForPrompt(
  promptId: string,
  tagNames: string[],
  userId: string
): Promise<void> {
  for (const tagName of tagNames) {
    // Find or create tag
    let tag = await db.query.tags.findFirst({
      where: and(eq(tags.userId, userId), eq(tags.name, tagName))
    });
    
    if (!tag) {
      const [newTag] = await db.insert(tags).values({
        id: crypto.randomUUID(),
        name: tagName,
        userId,
        color: generateTagColor(tagName)
      }).returning();
      tag = newTag;
    }
    
    // Link tag to prompt (ignore if already exists)
    await db.insert(promptTags)
      .values({
        promptId,
        tagId: tag.id
      })
      .onConflictDoNothing();
  }
}

// Generate a unique folder name if needed
export function generateUniqueFolderName(baseName: string, existingFolders: string[]): string {
  let folderName = baseName;
  let counter = 1;
  
  while (existingFolders.includes(folderName)) {
    folderName = `${baseName} (${counter})`;
    counter++;
  }
  
  return folderName;
}

// Sanitize prompt name for storage
export function sanitizePromptName(name: string): string {
  // Remove any potentially problematic characters
  let sanitized = name
    .replace(/[<>:"/\\|?*]/g, '') // Remove file system unsafe chars
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
  
  // Ensure it's not too long
  if (sanitized.length > 255) {
    sanitized = sanitized.substring(0, 252) + '...';
  }
  
  // Ensure it's not empty
  if (!sanitized) {
    sanitized = 'Untitled Prompt';
  }
  
  return sanitized;
}

// Extract key information from prompt content for AI analysis
export function extractPromptContext(content: string): {
  firstLine: string;
  codeBlocks: string[];
  mentions: string[];
  length: number;
} {
  const lines = content.split('\n');
  const firstLine = lines[0]?.trim() || '';
  
  // Extract code blocks
  const codeBlockRegex = /```[\s\S]*?```/g;
  const codeBlocks = content.match(codeBlockRegex) || [];
  
  // Extract mentions of frameworks, languages, etc.
  const mentionRegex = /\b(react|vue|angular|typescript|javascript|python|java|c\+\+|rust|go|sql|graphql|rest|api|frontend|backend|database|aws|azure|gcp|docker|kubernetes)\b/gi;
  const mentionsSet = new Set(content.toLowerCase().match(mentionRegex) || []);
  const mentions = Array.from(mentionsSet);
  
  return {
    firstLine,
    codeBlocks,
    mentions,
    length: content.length
  };
}

// Batch process prompts to avoid overwhelming the database
export async function batchProcessPrompts<T, R>(
  items: T[],
  processor: (batch: T[]) => Promise<R[]>,
  batchSize: number = 10
): Promise<R[]> {
  const results: R[] = [];
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await processor(batch);
    results.push(...batchResults);
    
    // Add a small delay between batches to avoid rate limiting
    if (i + batchSize < items.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  return results;
}

// Check if a prompt already exists for a user
export async function checkDuplicatePrompt(
  userId: string,
  content: string
): Promise<boolean> {
  const existing = await db.query.prompts.findFirst({
    where: and(
      eq(prompts.userId, userId),
      eq(prompts.content, content)
    )
  });
  
  return !!existing;
}

// Generate import statistics
export async function generateImportStats(
  sessionId: string,
  importedPrompts: ImportedPrompt[]
): Promise<ImportSummary> {
  const startTime = Date.now();
  
  // Count by category
  const categories: Record<string, number> = {};
  const folders: Record<string, number> = {};
  const allTags: string[] = [];
  
  for (const prompt of importedPrompts) {
    // Count folders
    folders[prompt.folder] = (folders[prompt.folder] || 0) + 1;
    
    // Collect tags
    allTags.push(...prompt.tags);
    
    // Count categories from metadata
    const category = prompt.metadata?.aiAnalysis?.category || 'Uncategorized';
    categories[category] = (categories[category] || 0) + 1;
  }
  
  // Get top tags
  const tagCounts: Record<string, number> = {};
  for (const tag of allTags) {
    tagCounts[tag] = (tagCounts[tag] || 0) + 1;
  }
  
  const topTags = Object.entries(tagCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([tag]) => tag);
  
  return {
    duration: Date.now() - startTime,
    categories,
    folders,
    topTags
  };
}