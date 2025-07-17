// Import system types
export type ImportSource = 'chatgpt' | 'claude' | 'gemini' | 'cline' | 'cursor' | 'file';

export interface ImportSession {
  id: string;
  userId: string;
  source: ImportSource;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  importedCount: number;
  skippedCount: number;
  processedCount?: number;
  totalCount?: number;
  error?: string;
  metadata?: any;
  results?: ImportResults;
  createdAt: Date;
  updatedAt: Date;
}

export interface ImportResults {
  imported: number;
  skipped: number;
  errors: string[];
  warnings?: string[];
}

export interface ImportOptions {
  skipDuplicates?: boolean;
  autoCategize?: boolean;
  folderId?: string;
  defaultTags?: string[];
  skipAI?: boolean;
  batchSize?: number;
  onProgress?: (progress: number) => void;
}

export interface ExtractedPrompt {
  title: string;
  content: string;
  response?: string;
  metadata: {
    source: ImportSource;
    timestamp?: string;
    model?: string;
    [key: string]: any;
  };
}

export interface ProcessedPrompt {
  id: string;
  title: string;
  content: string;
  category?: string;
  folderId?: string;
  tags: string[];
  metadata: any;
}

export interface ImportProgress {
  sessionId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number; // 0-100
  message: string;
  metadata?: {
    total?: number;
    processed?: number;
    imported?: number;
    skipped?: number;
    [key: string]: any;
  };
}

export interface PromptAnalysis {
  category: string;
  tags: string[];
  complexity: 'simple' | 'moderate' | 'complex';
  suggestedFolder?: string;
  suggestedName?: string;
  relatedPrompts?: string[];
}