import { ClineMarkdownParser } from './cline-markdown-parser';
import { ExtractedPrompt } from '@/lib/importers';
import { importProgress } from '@/lib/import/progress';
import { ClinePerformanceUtils } from './cline-performance-utils';
import { ClineErrorHandler } from './cline-error-handler';
import { ClineImportAnalytics } from '@/lib/analytics/cline-import-analytics';

interface BatchProcessOptions {
  maxConcurrency?: number;
  chunkSize?: number;
  sessionId?: string;
  enableRecovery?: boolean;
  maxRetries?: number;
}

interface BatchResult {
  successful: ExtractedPrompt[];
  failed: Array<{ file: string; error: string }>;
  totalProcessed: number;
  duration: number;
}

export class ClineBatchProcessor {
  private parser: ClineMarkdownParser;
  private defaultOptions: Required<BatchProcessOptions> = {
    maxConcurrency: 3,
    chunkSize: 10,
    sessionId: '',
    enableRecovery: true,
    maxRetries: 2,
  };

  constructor() {
    this.parser = new ClineMarkdownParser();
  }

  /**
   * Process multiple Cline files in parallel with optimized batching
   */
  async processBatch(
    files: Array<{ path: string; content: string }>,
    options: BatchProcessOptions = {}
  ): Promise<BatchResult> {
    const opts = { ...this.defaultOptions, ...options };
    const startTime = Date.now();
    
    // Dynamic import for p-limit
    const { default: pLimit } = await import('p-limit');
    const limit = pLimit(opts.maxConcurrency);
    
    const successful: ExtractedPrompt[] = [];
    const failed: Array<{ file: string; error: string }> = [];
    
    // Update initial progress
    if (opts.sessionId) {
      importProgress.updateProgress(opts.sessionId, {
        status: 'processing',
        message: `Processing ${files.length} Cline files...`,
        metadata: {
          totalFiles: files.length,
          processedFiles: 0,
        }
      });
    }

    // Process files in chunks for better memory management
    const chunks = this.createChunks(files, opts.chunkSize);
    let processedFiles = 0;
    const performanceStart = Date.now();

    for (const chunk of chunks) {
      const chunkPromises = chunk.map((file) =>
        limit(async () => {
          let retries = 0;
          const fileStartTime = Date.now();
          
          while (retries <= opts.maxRetries) {
            try {
              const prompts = await this.parseFile(file.content);
              successful.push(...prompts);
              processedFiles++;
              
              // Track file processing analytics
              if (opts.sessionId) {
                ClineImportAnalytics.trackFileProcessed(opts.sessionId, {
                  fileName: file.path,
                  fileSize: file.content.length,
                  processingTime: Date.now() - fileStartTime,
                  promptsExtracted: prompts.length,
                });
              }
              
              // Update progress after each file with performance metrics
              if (opts.sessionId) {
                const elapsed = Date.now() - performanceStart;
                const throughput = processedFiles / (elapsed / 1000);
                
                importProgress.updateProgress(opts.sessionId, {
                  progress: Math.round((processedFiles / files.length) * 100),
                  metadata: {
                    processedFiles,
                  },
                  performance: {
                    throughput,
                    memoryUsage: process.memoryUsage().heapUsed,
                    averageProcessingTime: elapsed / processedFiles,
                  }
                });
                
                // Track performance metrics
                ClineImportAnalytics.trackPerformance(opts.sessionId, {
                  throughput,
                  memoryUsage: process.memoryUsage().heapUsed,
                });
              }
              
              return { success: true, prompts };
            } catch (error) {
              const analyzedError = ClineErrorHandler.analyzeError(
                error instanceof Error ? error : new Error('Unknown error'),
                { file: file.path }
              );
              
              // Log the error
              ClineErrorHandler.logError(analyzedError, opts.sessionId);
              
              // Attempt recovery if enabled and error is recoverable
              if (opts.enableRecovery && analyzedError.recoverable && retries < opts.maxRetries) {
                retries++;
                
                if (opts.sessionId) {
                  importProgress.updateProgress(opts.sessionId, {
                    message: `Retrying ${file.path} (attempt ${retries + 1})...`,
                  });
                  
                  // Track retry action
                  ClineImportAnalytics.trackUserAction(opts.sessionId, 'retry');
                }
                
                const recovery = await ClineErrorHandler.attemptRecovery(
                  analyzedError,
                  async () => this.parseFile(file.content)
                );
                
                if (recovery.success && recovery.result) {
                  successful.push(...recovery.result);
                  processedFiles++;
                  
                  // Track successful recovery
                  if (opts.sessionId) {
                    ClineImportAnalytics.trackFileProcessed(opts.sessionId, {
                      fileName: file.path,
                      fileSize: file.content.length,
                      processingTime: Date.now() - fileStartTime,
                      promptsExtracted: recovery.result.length,
                    });
                  }
                  
                  return { success: true, prompts: recovery.result };
                }
              } else {
                // Max retries reached or error not recoverable
                failed.push({
                  file: file.path,
                  error: ClineErrorHandler.formatErrorForUser(analyzedError),
                });
                processedFiles++;
                
                // Track failed file
                if (opts.sessionId) {
                  ClineImportAnalytics.trackFileProcessed(opts.sessionId, {
                    fileName: file.path,
                    fileSize: file.content.length,
                    processingTime: Date.now() - fileStartTime,
                    promptsExtracted: 0,
                    error: analyzedError.message,
                  });
                }
                
                return { success: false, error: analyzedError };
              }
            }
          }
          
          // Should not reach here, but handle just in case
          failed.push({
            file: file.path,
            error: 'Max retries exceeded',
          });
          processedFiles++;
          
          // Track failed file
          if (opts.sessionId) {
            ClineImportAnalytics.trackFileProcessed(opts.sessionId, {
              fileName: file.path,
              fileSize: file.content.length,
              processingTime: Date.now() - fileStartTime,
              promptsExtracted: 0,
              error: 'Max retries exceeded',
            });
          }
          
          return { success: false, error: new Error('Max retries exceeded') };
        })
      );

      // Wait for chunk to complete before processing next chunk
      await Promise.all(chunkPromises);
      
      // Allow garbage collection between chunks
      if (global.gc) {
        global.gc();
      }
    }

    const duration = Date.now() - startTime;

    // Deduplicate prompts if we have any
    const deduplicatedPrompts = successful.length > 0 
      ? ClinePerformanceUtils.deduplicatePrompts(successful)
      : [];

    // Create performance report
    const totalSize = files.reduce((sum, f) => sum + f.content.length, 0);
    const performanceReport = ClinePerformanceUtils.createPerformanceReport(
      startTime,
      Date.now(),
      deduplicatedPrompts.length,
      failed.length,
      totalSize
    );

    // Update final progress with performance summary
    if (opts.sessionId) {
      importProgress.updateProgress(opts.sessionId, {
        status: 'completed',
        progress: 100,
        message: `Import completed. Processed ${deduplicatedPrompts.length} unique prompts.`,
        performance: {
          throughput: performanceReport.throughput,
          memoryUsage: process.memoryUsage().heapUsed,
          averageProcessingTime: performanceReport.averageTimePerPrompt,
        },
        metadata: {
          totalFiles: files.length,
          processedFiles: files.length,
          duplicatesRemoved: successful.length - deduplicatedPrompts.length,
          performanceReport,
        }
      });
    }

    return {
      successful: deduplicatedPrompts,
      failed,
      totalProcessed: files.length,
      duration,
    };
  }

  /**
   * Parse a single file with error handling and memory optimization
   */
  private async parseFile(content: string): Promise<ExtractedPrompt[]> {
    // For very large files, parse in streaming fashion
    if (content.length > 1024 * 1024) { // 1MB threshold
      return this.parseFileStreaming(content);
    }
    
    const parsed = await this.parser.parseMultipleFiles([{ name: 'file.md', content }]);
    return parsed;
  }

  /**
   * Parse large files in a streaming fashion to avoid memory issues
   */
  private async parseFileStreaming(content: string): Promise<ExtractedPrompt[]> {
    const prompts: ExtractedPrompt[] = [];
    const tasks = content.split(/^# Task:/gm).filter(task => task.trim());
    
    // Process tasks one at a time for large files
    for (const task of tasks) {
      try {
        const taskContent = '# Task:' + task;
        const parsed = await this.parser.parseMultipleFiles([{ name: 'task.md', content: taskContent }]);
        prompts.push(...parsed);
      } catch (error) {
        console.error('Error parsing task:', error);
        // Continue processing other tasks
      }
    }
    
    return prompts;
  }

  /**
   * Create chunks from array for batch processing
   */
  private createChunks<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * Estimate memory usage for processing
   */
  estimateMemoryUsage(files: Array<{ content: string }>): number {
    const totalSize = files.reduce((sum, file) => sum + file.content.length, 0);
    // Rough estimate: 2x the file size for processing overhead
    return totalSize * 2;
  }

  /**
   * Validate files before processing
   */
  validateFiles(files: Array<{ path: string; content: string }>): {
    valid: Array<{ path: string; content: string }>;
    invalid: Array<{ path: string; reason: string }>;
  } {
    const valid: Array<{ path: string; content: string }> = [];
    const invalid: Array<{ path: string; reason: string }> = [];

    for (const file of files) {
      if (!file.content || file.content.trim() === '') {
        invalid.push({ path: file.path, reason: 'Empty file' });
      } else if (!file.content.includes('### Human') && !file.content.includes('User:')) {
        invalid.push({ path: file.path, reason: 'No conversation markers found' });
      } else if (file.content.length > 10 * 1024 * 1024) { // 10MB limit per file
        invalid.push({ path: file.path, reason: 'File too large (>10MB)' });
      } else {
        valid.push(file);
      }
    }

    return { valid, invalid };
  }
}