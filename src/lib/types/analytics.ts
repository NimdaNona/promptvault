export interface AnalyticsEvent {
  event: string;
  properties: Record<string, any>;
  timestamp: Date;
  userId?: string;
  sessionId?: string;
}

export interface ImportAnalytics {
  sessionId: string;
  userId: string;
  platform: string;
  startTime: Date;
  endTime?: Date;
  duration: number;
  filesProcessed: number;
  promptsImported: number;
  errorsEncountered: number;
  status: 'in_progress' | 'completed' | 'completed_with_errors' | 'failed';
  metadata?: Record<string, any>;
}

export interface PerformanceMetrics {
  throughput: number;
  latency: number;
  memoryUsage: number;
  cpuUsage?: number;
  timestamp: Date;
}

export interface UserEngagementMetrics {
  feature: string;
  userId: string;
  sessionId: string;
  actions: Array<{
    action: string;
    timestamp: Date;
    metadata?: Record<string, any>;
  }>;
  duration: number;
  completed: boolean;
}