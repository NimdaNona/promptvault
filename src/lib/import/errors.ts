export interface ImportError {
  type: string;
  message: string;
  timestamp: Date;
  recoverable?: boolean;
  context?: Record<string, any>;
}

export class ImportErrorBase extends Error {
  public readonly type: string;
  public readonly timestamp: Date;
  public readonly recoverable: boolean;
  public readonly context?: Record<string, any>;

  constructor(
    type: string,
    message: string,
    recoverable: boolean = false,
    context?: Record<string, any>
  ) {
    super(message);
    this.name = 'ImportError';
    this.type = type;
    this.timestamp = new Date();
    this.recoverable = recoverable;
    this.context = context;
  }
}

export class FileProcessingError extends ImportErrorBase {
  constructor(message: string, fileName?: string) {
    super('FILE_PROCESSING', message, true, { fileName });
  }
}

export class ValidationError extends ImportErrorBase {
  constructor(message: string, field?: string) {
    super('VALIDATION', message, false, { field });
  }
}

export class QuotaExceededError extends ImportErrorBase {
  constructor(limit: number, current: number) {
    super(
      'QUOTA_EXCEEDED',
      `Import limit exceeded. Limit: ${limit}, Current: ${current}`,
      false,
      { limit, current }
    );
  }
}

export class NetworkError extends ImportErrorBase {
  constructor(message: string, url?: string) {
    super('NETWORK', message, true, { url });
  }
}