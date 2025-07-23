import { ExtractedPrompt } from '@/lib/importers';

/**
 * Performance utilities for Cline imports
 */
export class ClinePerformanceUtils {
  /**
   * Calculate optimal batch size based on available memory and file sizes
   */
  static calculateOptimalBatchSize(
    files: Array<{ content: string }>,
    maxMemoryMB: number = 512
  ): number {
    const avgFileSize = files.reduce((sum, f) => sum + f.content.length, 0) / files.length;
    const estimatedMemoryPerFile = avgFileSize * 3; // Account for parsing overhead
    const maxFilesInMemory = Math.floor((maxMemoryMB * 1024 * 1024) / estimatedMemoryPerFile);
    
    // Return a reasonable batch size between 1 and 20
    return Math.max(1, Math.min(20, maxFilesInMemory));
  }

  /**
   * Create a content hash for deduplication
   */
  static createContentHash(content: string): string {
    // Simple hash function for client-side use
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Deduplicate prompts based on content similarity
   */
  static deduplicatePrompts(
    prompts: ExtractedPrompt[],
    threshold: number = 0.95
  ): ExtractedPrompt[] {
    const seen = new Map<string, ExtractedPrompt>();
    const unique: ExtractedPrompt[] = [];

    for (const prompt of prompts) {
      const hash = this.createContentHash(prompt.content);
      
      if (!seen.has(hash)) {
        seen.set(hash, prompt);
        unique.push(prompt);
      } else {
        // Check for near-duplicates
        const existing = seen.get(hash)!;
        const similarity = this.calculateSimilarity(existing.content, prompt.content);
        
        if (similarity < threshold) {
          unique.push(prompt);
        }
      }
    }

    return unique;
  }

  /**
   * Calculate similarity between two strings (simple implementation)
   */
  private static calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  /**
   * Simple Levenshtein distance implementation
   */
  private static levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Chunk large arrays for processing
   */
  static chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * Memory-efficient file reader for large files
   */
  static async* readLargeFileInChunks(
    content: string,
    chunkSize: number = 1024 * 1024 // 1MB chunks
  ): AsyncGenerator<string> {
    for (let i = 0; i < content.length; i += chunkSize) {
      yield content.slice(i, i + chunkSize);
    }
  }

  /**
   * Optimize prompt metadata for storage
   */
  static optimizeMetadata(metadata: any): any {
    // Remove null/undefined values
    const cleaned: any = {};
    
    for (const [key, value] of Object.entries(metadata || {})) {
      if (value !== null && value !== undefined && value !== '') {
        cleaned[key] = value;
      }
    }
    
    // Compress large string values
    if (cleaned.context && cleaned.context.length > 1000) {
      cleaned.context = cleaned.context.substring(0, 1000) + '...';
    }
    
    return cleaned;
  }

  /**
   * Estimate processing time based on file characteristics
   */
  static estimateProcessingTime(
    files: Array<{ content: string }>,
    averageTimePerPromptMs: number = 50
  ): {
    estimatedTimeMs: number;
    estimatedPrompts: number;
  } {
    // Rough estimate: 1 prompt per 500 chars on average
    const totalChars = files.reduce((sum, f) => sum + f.content.length, 0);
    const estimatedPrompts = Math.ceil(totalChars / 500);
    const estimatedTimeMs = estimatedPrompts * averageTimePerPromptMs;
    
    return {
      estimatedTimeMs,
      estimatedPrompts,
    };
  }

  /**
   * Create a performance report
   */
  static createPerformanceReport(
    startTime: number,
    endTime: number,
    processedCount: number,
    errorCount: number,
    totalSize: number
  ): {
    duration: number;
    throughput: number;
    successRate: number;
    averageTimePerPrompt: number;
    totalSizeMB: number;
  } {
    const duration = endTime - startTime;
    const totalCount = processedCount + errorCount;
    
    return {
      duration,
      throughput: totalCount / (duration / 1000), // prompts per second
      successRate: totalCount > 0 ? (processedCount / totalCount) * 100 : 0,
      averageTimePerPrompt: totalCount > 0 ? duration / totalCount : 0,
      totalSizeMB: totalSize / (1024 * 1024),
    };
  }
}