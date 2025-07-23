import { AnalyticsEvent, ImportAnalytics } from '@/lib/types/analytics';

export interface ClineImportMetrics {
  sessionId: string;
  userId: string;
  importMethod: 'file' | 'folder';
  startTime: Date;
  endTime?: Date;
  filesProcessed: number;
  promptsImported: number;
  errorsEncountered: number;
  duplicatesRemoved: number;
  performance: {
    throughput: number;
    averageProcessingTime: number;
    peakMemoryUsage: number;
  };
  userActions: {
    retriesAttempted: number;
    errorsSkipped: number;
    helpViewed: boolean;
  };
}

export class ClineImportAnalytics {
  private static sessions = new Map<string, ClineImportMetrics>();

  /**
   * Initialize analytics for a new import session
   */
  static startSession(
    sessionId: string,
    userId: string,
    importMethod: 'file' | 'folder'
  ): void {
    this.sessions.set(sessionId, {
      sessionId,
      userId,
      importMethod,
      startTime: new Date(),
      filesProcessed: 0,
      promptsImported: 0,
      errorsEncountered: 0,
      duplicatesRemoved: 0,
      performance: {
        throughput: 0,
        averageProcessingTime: 0,
        peakMemoryUsage: 0,
      },
      userActions: {
        retriesAttempted: 0,
        errorsSkipped: 0,
        helpViewed: false,
      },
    });

    this.track('cline_import_started', {
      sessionId,
      userId,
      importMethod,
    });
  }

  /**
   * Update session metrics
   */
  static updateSession(
    sessionId: string,
    updates: Partial<ClineImportMetrics>
  ): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    Object.assign(session, updates);
    
    // Update performance metrics
    if (updates.performance) {
      Object.assign(session.performance, updates.performance);
    }
    
    // Update user actions
    if (updates.userActions) {
      Object.assign(session.userActions, updates.userActions);
    }
  }

  /**
   * Complete a session and send final analytics
   */
  static completeSession(sessionId: string, success: boolean): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.endTime = new Date();
    const duration = session.endTime.getTime() - session.startTime.getTime();

    this.track('cline_import_completed', {
      sessionId,
      userId: session.userId,
      importMethod: session.importMethod,
      success,
      duration,
      filesProcessed: session.filesProcessed,
      promptsImported: session.promptsImported,
      errorsEncountered: session.errorsEncountered,
      duplicatesRemoved: session.duplicatesRemoved,
      performance: session.performance,
      userActions: session.userActions,
    });

    // Calculate and track conversion metrics
    const conversionRate = session.filesProcessed > 0
      ? (session.promptsImported / session.filesProcessed) * 100
      : 0;

    this.track('cline_import_conversion', {
      sessionId,
      conversionRate,
      errorRate: session.filesProcessed > 0
        ? (session.errorsEncountered / session.filesProcessed) * 100
        : 0,
    });

    // Clean up session
    this.sessions.delete(sessionId);
  }

  /**
   * Track file processing event
   */
  static trackFileProcessed(
    sessionId: string,
    fileInfo: {
      fileName: string;
      fileSize: number;
      processingTime: number;
      promptsExtracted: number;
      error?: string;
    }
  ): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.filesProcessed++;
    
    if (fileInfo.error) {
      session.errorsEncountered++;
    } else {
      session.promptsImported += fileInfo.promptsExtracted;
    }

    // Update performance metrics
    const currentAvg = session.performance.averageProcessingTime;
    session.performance.averageProcessingTime = 
      (currentAvg * (session.filesProcessed - 1) + fileInfo.processingTime) / 
      session.filesProcessed;

    this.track('cline_file_processed', {
      sessionId,
      fileName: fileInfo.fileName,
      fileSize: fileInfo.fileSize,
      processingTime: fileInfo.processingTime,
      promptsExtracted: fileInfo.promptsExtracted,
      success: !fileInfo.error,
      error: fileInfo.error,
    });
  }

  /**
   * Track user interactions
   */
  static trackUserAction(
    sessionId: string,
    action: 'retry' | 'skip' | 'view_help' | 'cancel'
  ): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    switch (action) {
      case 'retry':
        session.userActions.retriesAttempted++;
        break;
      case 'skip':
        session.userActions.errorsSkipped++;
        break;
      case 'view_help':
        session.userActions.helpViewed = true;
        break;
    }

    this.track('cline_user_action', {
      sessionId,
      action,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Track performance metrics
   */
  static trackPerformance(
    sessionId: string,
    metrics: {
      throughput: number;
      memoryUsage: number;
      cpuUsage?: number;
    }
  ): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.performance.throughput = metrics.throughput;
    session.performance.peakMemoryUsage = Math.max(
      session.performance.peakMemoryUsage,
      metrics.memoryUsage
    );

    this.track('cline_performance_snapshot', {
      sessionId,
      ...metrics,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Get aggregated metrics for dashboard
   */
  static async getAggregatedMetrics(
    userId?: string,
    timeRange?: { start: Date; end: Date }
  ): Promise<{
    totalImports: number;
    totalPrompts: number;
    averageSuccessRate: number;
    averageProcessingTime: number;
    topErrors: Array<{ error: string; count: number }>;
  }> {
    // In a real implementation, this would query from a database
    // For now, return mock data
    return {
      totalImports: 0,
      totalPrompts: 0,
      averageSuccessRate: 0,
      averageProcessingTime: 0,
      topErrors: [],
    };
  }

  /**
   * Internal tracking method
   */
  private static track(event: string, properties: Record<string, any>): void {
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log('[Cline Analytics]', event, properties);
    }

    // Send to analytics service
    if (typeof window !== 'undefined' && (window as any).analytics) {
      (window as any).analytics.track(event, {
        ...properties,
        platform: 'cline',
        timestamp: new Date().toISOString(),
      });
    }

    // Send to monitoring service (e.g., Sentry, LogRocket)
    if (typeof window !== 'undefined' && (window as any).LogRocket) {
      (window as any).LogRocket.track(event, properties);
    }
  }

  /**
   * Generate import report
   */
  static generateReport(sessionId: string): ImportAnalytics | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    const duration = session.endTime 
      ? session.endTime.getTime() - session.startTime.getTime()
      : Date.now() - session.startTime.getTime();

    return {
      sessionId: session.sessionId,
      userId: session.userId,
      platform: 'cline',
      startTime: session.startTime,
      endTime: session.endTime,
      duration,
      filesProcessed: session.filesProcessed,
      promptsImported: session.promptsImported,
      errorsEncountered: session.errorsEncountered,
      status: session.endTime 
        ? (session.errorsEncountered === 0 ? 'completed' : 'completed_with_errors')
        : 'in_progress',
      metadata: {
        importMethod: session.importMethod,
        duplicatesRemoved: session.duplicatesRemoved,
        performance: session.performance,
        userActions: session.userActions,
      },
    };
  }
}