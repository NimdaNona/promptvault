import { Redis } from '@upstash/redis';
import { ImportProgress } from '@/lib/types/import';

export class ProgressTracker {
  private redis: Redis;
  private sessionId: string;
  private key: string;

  constructor(sessionId: string) {
    this.redis = new Redis({
      url: process.env.KV_REST_API_URL!,
      token: process.env.KV_REST_API_TOKEN!
    });
    this.sessionId = sessionId;
    this.key = `import:progress:${sessionId}`;
  }

  async updateProgress(
    progress: number,
    message: string,
    additionalData?: Partial<ImportProgress>
  ): Promise<void> {
    const data: ImportProgress = {
      sessionId: this.sessionId,
      status: progress === 100 ? 'completed' : progress === 0 && message.includes('Failed') ? 'failed' : 'processing',
      progress,
      message,
      ...additionalData
    };

    // Store in Redis with 1 hour expiry
    await this.redis.setex(this.key, 3600, JSON.stringify(data));

    // Also publish to a channel for real-time updates
    await this.redis.publish(`import:${this.sessionId}`, JSON.stringify(data));
  }

  async getProgress(): Promise<ImportProgress | null> {
    const data = await this.redis.get<string>(this.key);
    if (!data) return null;
    
    try {
      return JSON.parse(data) as ImportProgress;
    } catch {
      return null;
    }
  }

  async clearProgress(): Promise<void> {
    await this.redis.del(this.key);
  }
}