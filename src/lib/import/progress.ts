import { EventEmitter } from 'events';

export interface ProgressUpdate {
  sessionId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number; // 0-100
  message: string;
  metadata?: {
    total?: number;
    processed?: number;
    imported?: number;
    skipped?: number;
    extractedCount?: number;
    errors?: string[];
    currentFile?: string;
    [key: string]: any;
  };
  performance?: {
    throughput: number;
    memoryUsage?: number;
    averageProcessingTime?: number;
  };
}

export class ImportProgressTracker extends EventEmitter {
  private static instance: ImportProgressTracker;
  private progress: Map<string, ProgressUpdate> = new Map();
  
  private constructor() {
    super();
  }
  
  static getInstance(): ImportProgressTracker {
    if (!ImportProgressTracker.instance) {
      ImportProgressTracker.instance = new ImportProgressTracker();
    }
    return ImportProgressTracker.instance;
  }
  
  startSession(sessionId: string, total: number): void {
    const update: ProgressUpdate = {
      sessionId,
      status: 'pending',
      progress: 0,
      message: 'Starting import...',
      metadata: {
        total,
        processed: 0,
        imported: 0,
        skipped: 0,
        errors: []
      }
    };
    
    this.progress.set(sessionId, update);
    this.emit('progress', update);
  }
  
  updateProgress(
    sessionId: string, 
    update: Partial<ProgressUpdate>
  ): void {
    const current = this.progress.get(sessionId);
    if (!current) return;
    
    const newProgress = { ...current, ...update };
    this.progress.set(sessionId, newProgress);
    this.emit('progress', newProgress);
  }
  
  incrementProcessed(sessionId: string, imported: boolean = true): void {
    const current = this.progress.get(sessionId);
    if (!current || !current.metadata) return;
    
    const metadata = {
      ...current.metadata,
      processed: (current.metadata.processed || 0) + 1,
      imported: imported ? (current.metadata.imported || 0) + 1 : (current.metadata.imported || 0),
      skipped: imported ? (current.metadata.skipped || 0) : (current.metadata.skipped || 0) + 1
    };
    
    const progress = current.metadata.total 
      ? Math.round((metadata.processed / current.metadata.total) * 100)
      : 0;
    
    this.updateProgress(sessionId, { metadata, progress });
  }
  
  addError(sessionId: string, error: string): void {
    const current = this.progress.get(sessionId);
    if (!current || !current.metadata) return;
    
    const metadata = {
      ...current.metadata,
      errors: [...(current.metadata.errors || []), error]
    };
    
    this.updateProgress(sessionId, { metadata });
  }
  
  setStatus(
    sessionId: string, 
    status: 'processing' | 'categorizing' | 'storing', 
    message?: string
  ): void {
    this.updateProgress(sessionId, { 
      status: 'processing',
      message: message || 'Processing...'
    });
  }
  
  completeSession(sessionId: string, message: string = 'Import completed!'): void {
    this.updateProgress(sessionId, {
      status: 'completed',
      progress: 100,
      message
    });
    
    // Clean up after a delay
    setTimeout(() => {
      this.progress.delete(sessionId);
    }, 300000); // 5 minutes
  }
  
  errorSession(sessionId: string, error: string): void {
    this.updateProgress(sessionId, {
      status: 'failed',
      progress: 100,
      message: error
    });
  }
  
  getProgress(sessionId: string): ProgressUpdate | null {
    return this.progress.get(sessionId) || null;
  }
  
  // For Server-Sent Events
  streamProgress(sessionId: string): ReadableStream {
    const encoder = new TextEncoder();
    let listener: ((update: ProgressUpdate) => void) | null = null;
    
    return new ReadableStream({
      start: (controller) => {
        // Send initial state
        const initial = this.getProgress(sessionId);
        if (initial) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(initial)}\n\n`)
          );
        }
        
        // Listen for updates
        listener = (update: ProgressUpdate) => {
          if (update.sessionId === sessionId) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(update)}\n\n`)
            );
            
            // Close stream when complete or error
            if (update.status === 'completed' || update.status === 'failed') {
              controller.close();
            }
          }
        };
        
        this.on('progress', listener);
      },
      
      cancel: () => {
        if (listener) {
          this.off('progress', listener);
        }
      }
    });
  }
}

// Export singleton instance
export const importProgress = ImportProgressTracker.getInstance();