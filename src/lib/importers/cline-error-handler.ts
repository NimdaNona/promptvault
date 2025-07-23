import { ImportError } from '@/lib/import/errors';

export interface ClineImportError extends ImportError {
  file?: string;
  line?: number;
  recoverable: boolean;
  suggestion?: string;
}

export class ClineErrorHandler {
  private static readonly ERROR_PATTERNS = {
    INVALID_FORMAT: /no conversation markers found|invalid markdown format/i,
    EMPTY_FILE: /empty file|no content/i,
    LARGE_FILE: /file too large|exceeds.*limit/i,
    PARSE_ERROR: /failed to parse|parsing error/i,
    MEMORY_ERROR: /out of memory|heap.*exhausted/i,
    PERMISSION_ERROR: /permission denied|access denied/i,
    NETWORK_ERROR: /network error|connection.*failed/i,
  };

  /**
   * Analyze error and provide recovery suggestions
   */
  static analyzeError(error: Error, context?: { file?: string; line?: number }): ClineImportError {
    const message = error.message.toLowerCase();
    let recoverable = false;
    let suggestion = '';
    let errorType = 'UNKNOWN';

    // Check error patterns
    for (const [type, pattern] of Object.entries(this.ERROR_PATTERNS)) {
      if (pattern.test(message)) {
        errorType = type;
        break;
      }
    }

    // Provide recovery suggestions based on error type
    switch (errorType) {
      case 'INVALID_FORMAT':
        recoverable = true;
        suggestion = 'Ensure the file contains valid Cline conversation markers (### Human/Assistant or User:/Cline:)';
        break;
      
      case 'EMPTY_FILE':
        recoverable = true;
        suggestion = 'Skip empty files or check if the file was properly saved';
        break;
      
      case 'LARGE_FILE':
        recoverable = true;
        suggestion = 'Split large files into smaller chunks (max 10MB per file) or use batch import';
        break;
      
      case 'PARSE_ERROR':
        recoverable = true;
        suggestion = 'Check markdown syntax or try importing other files first';
        break;
      
      case 'MEMORY_ERROR':
        recoverable = true;
        suggestion = 'Reduce batch size or import fewer files at once';
        break;
      
      case 'PERMISSION_ERROR':
        recoverable = false;
        suggestion = 'Check file permissions or try copying files to a different location';
        break;
      
      case 'NETWORK_ERROR':
        recoverable = true;
        suggestion = 'Check your internet connection and try again';
        break;
      
      default:
        recoverable = false;
        suggestion = 'Try importing other files or contact support if the issue persists';
    }

    return {
      type: errorType,
      message: error.message,
      recoverable,
      suggestion,
      file: context?.file,
      line: context?.line,
      timestamp: new Date(),
    };
  }

  /**
   * Attempt to recover from specific errors
   */
  static async attemptRecovery(
    error: ClineImportError,
    retryCallback: () => Promise<any>
  ): Promise<{ success: boolean; result?: any; error?: Error }> {
    if (!error.recoverable) {
      return { success: false, error: new Error('Error is not recoverable') };
    }

    switch (error.type) {
      case 'MEMORY_ERROR':
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
        // Wait a bit for memory to clear
        await new Promise(resolve => setTimeout(resolve, 1000));
        break;
      
      case 'NETWORK_ERROR':
        // Wait before retrying network request
        await new Promise(resolve => setTimeout(resolve, 2000));
        break;
      
      case 'PARSE_ERROR':
        // No automatic recovery, user needs to fix the file
        return { success: false, error: new Error(error.suggestion || 'Manual fix required') };
    }

    // Attempt retry
    try {
      const result = await retryCallback();
      return { success: true, result };
    } catch (retryError) {
      return { 
        success: false, 
        error: retryError instanceof Error ? retryError : new Error('Retry failed') 
      };
    }
  }

  /**
   * Create user-friendly error messages
   */
  static formatErrorForUser(error: ClineImportError): string {
    let message = `Import error: ${error.message}`;
    
    if (error.file) {
      message += `\nFile: ${error.file}`;
    }
    
    if (error.line) {
      message += ` (line ${error.line})`;
    }
    
    if (error.suggestion) {
      message += `\n\nSuggestion: ${error.suggestion}`;
    }
    
    if (error.recoverable) {
      message += '\n\nThis error may be recoverable. You can try again.';
    }
    
    return message;
  }

  /**
   * Log error for monitoring
   */
  static logError(error: ClineImportError, sessionId?: string): void {
    const errorLog = {
      timestamp: error.timestamp,
      sessionId,
      type: error.type,
      message: error.message,
      file: error.file,
      line: error.line,
      recoverable: error.recoverable,
    };

    // In production, this would send to monitoring service
    console.error('[Cline Import Error]', errorLog);
    
    // Track in analytics (if available)
    if (typeof window !== 'undefined' && (window as any).analytics) {
      (window as any).analytics.track('Import Error', {
        platform: 'cline',
        errorType: error.type,
        recoverable: error.recoverable,
      });
    }
  }

  /**
   * Create error recovery UI actions
   */
  static getRecoveryActions(error: ClineImportError): Array<{
    label: string;
    action: string;
    primary?: boolean;
  }> {
    const actions = [];

    if (error.recoverable) {
      actions.push({
        label: 'Retry Import',
        action: 'retry',
        primary: true,
      });
    }

    switch (error.type) {
      case 'LARGE_FILE':
        actions.push({
          label: 'Split File',
          action: 'split_file',
        });
        break;
      
      case 'INVALID_FORMAT':
        actions.push({
          label: 'View Format Guide',
          action: 'view_guide',
        });
        break;
      
      case 'PERMISSION_ERROR':
        actions.push({
          label: 'Copy Files',
          action: 'copy_files',
        });
        break;
    }

    actions.push({
      label: 'Skip File',
      action: 'skip',
    });

    if (!error.recoverable) {
      actions.push({
        label: 'Contact Support',
        action: 'support',
      });
    }

    return actions;
  }
}