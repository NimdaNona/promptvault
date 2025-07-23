export type ImportPlatform = 'chatgpt' | 'claude' | 'gemini' | 'cline' | 'cursor';

export interface ImportSession {
  id: string;
  userId: string;
  platform: ImportPlatform;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  fileName: string;
  fileSize: number;
  fileType: string;
  blobUrl?: string;
  totalPrompts: number;
  processedPrompts: number;
  failedPrompts: number;
  error?: string;
  startedAt: Date;
  completedAt?: Date;
  metadata?: Record<string, any>;
}

export interface ParsedPrompt {
  id: string;
  content: string;
  timestamp?: Date;
  metadata?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    [key: string]: any;
  };
  category?: string;
  tags?: string[];
  sourceContext?: string;
}

export interface ImportProgress {
  sessionId: string;
  status: ImportSession['status'];
  progress: number; // 0-100
  message: string;
  totalPrompts?: number;
  processedPrompts?: number;
  errors?: string[];
  performance?: {
    throughput: number;
    memoryUsage?: number;
    averageProcessingTime?: number;
  };
  metadata?: Record<string, any>;
}