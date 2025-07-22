# AI Prompt Vault Import Infrastructure Design

## Executive Summary

This document outlines a comprehensive infrastructure solution for handling large-scale file imports in AI Prompt Vault. The design addresses the challenge of processing 10MB+ files containing chat logs from various LLM platforms while maintaining a seamless user experience.

### Key Achievements
- **Bypasses Vercel's 4.5MB limit** using client-side uploads
- **Processes files up to 500MB** with chunked processing
- **Scales horizontally** with parallel job execution
- **Provides real-time progress** tracking
- **Ensures reliability** with automatic retries
- **Optimizes costs** with intelligent caching

## Architecture Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Client/UI     │────▶│  Vercel Blob    │────▶│   QStash/       │
│   (Browser)     │     │  (Storage)      │     │   Inngest       │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                                                │
         │                                                ▼
         ▼                                        ┌─────────────────┐
┌─────────────────┐                               │  Process Jobs   │
│  Upload Token   │                               │  (Serverless)   │
│   Generation    │                               └─────────────────┘
└─────────────────┘                                       │
                                                          ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Upstash       │◀────│   OpenAI API    │◀────│  Chunk Parser   │
│   Redis         │     │ (Categorization)│     │   (Streaming)   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                                                │
         │                                                ▼
         └──────────────────────────────────────▶┌─────────────────┐
                                                  │  Neon Database  │
                                                  │  (PostgreSQL)   │
                                                  └─────────────────┘
```

## Core Components

### 1. Vercel Blob Storage

**Purpose**: Handle large file uploads without hitting serverless function limits

**Configuration**:
```typescript
// Client-side upload configuration
const uploadConfig = {
  access: 'public',
  handleUploadUrl: '/api/import/blob/upload',
  clientPayload: {
    userId: currentUserId,
    importType: 'chatgpt|claude|gemini|cline|cursor',
  },
  multipart: true, // Enable for files > 100MB
};
```

**Key Features**:
- Direct browser-to-storage uploads (bypasses 4.5MB limit)
- Multipart support for files up to 500MB
- Automatic retry on failed parts
- Progress tracking via upload events
- Regional deployment for low latency

### 2. Background Job Processing

#### Option A: QStash (Recommended for Simplicity)

**Pros**:
- Simple HTTP-based queue
- Built-in retries and delays
- Cost-effective (500 free messages/day)
- No complex setup required
- Integrates with Upstash Redis

**Implementation**:
```typescript
// Queue processing job
await qstash.publishJSON({
  url: `${process.env.NEXT_PUBLIC_APP_URL}/api/import/process`,
  body: {
    blobUrl: uploadedBlob.url,
    userId: userId,
    sessionId: importSession.id,
    importType: 'chatgpt',
    chunkSize: 100, // Process 100 prompts at a time
  },
  retries: 3,
  delay: 0,
});
```

#### Option B: Inngest (For Complex Workflows)

**Pros**:
- Step-based orchestration
- Visual workflow monitoring
- Built-in error handling
- Supports long-running workflows
- Better for complex multi-step processes

**Implementation**:
```typescript
export const processImport = inngest.createFunction(
  { id: "process-import", concurrency: 10 },
  { event: "import/file.uploaded" },
  async ({ event, step }) => {
    // Step 1: Parse file in chunks
    const chunks = await step.run("parse-file", async () => {
      return await parseFileInChunks(event.data.blobUrl);
    });

    // Step 2: Process chunks in parallel
    const results = await Promise.all(
      chunks.map((chunk, index) =>
        step.run(`process-chunk-${index}`, async () => {
          return await processChunk(chunk);
        })
      )
    );

    // Step 3: Finalize import
    await step.run("finalize", async () => {
      return await finalizeImport(event.data.sessionId, results);
    });
  }
);
```

### 3. Upstash Redis for Progress Tracking

**Purpose**: Real-time progress updates and caching

**Implementation**:
```typescript
// Track import progress
await redis.hset(`import:${sessionId}`, {
  status: 'processing',
  totalPrompts: 1000,
  processedPrompts: 150,
  currentChunk: 2,
  totalChunks: 10,
  lastUpdated: Date.now(),
});

// Cache AI categorization results
await redis.setex(
  `category:${promptHash}`,
  86400, // 24 hour cache
  JSON.stringify(categoryData)
);
```

### 4. Chunked File Processing

**Purpose**: Handle large files without memory overflow

**Implementation**:
```typescript
async function* parseFileInChunks(blobUrl: string, chunkSize = 100) {
  const stream = await fetch(blobUrl).then(r => r.body);
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  
  let buffer = '';
  let promptCount = 0;
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    buffer += decoder.decode(value, { stream: true });
    const prompts = extractPromptsFromBuffer(buffer);
    
    while (prompts.length >= chunkSize) {
      yield prompts.splice(0, chunkSize);
      promptCount += chunkSize;
      
      // Update progress
      await updateProgress(sessionId, promptCount);
    }
  }
  
  // Yield remaining prompts
  if (prompts.length > 0) {
    yield prompts;
  }
}
```

### 5. AI Categorization Service

**Purpose**: Intelligent prompt categorization and optimization

**Implementation**:
```typescript
class AICategorizationService {
  private batchQueue: Prompt[] = [];
  private batchSize = 10;
  private batchTimeout: NodeJS.Timeout;

  async categorizePrompt(prompt: Prompt): Promise<Category> {
    // Check cache first
    const cached = await redis.get(`category:${prompt.hash}`);
    if (cached) return JSON.parse(cached);

    // Add to batch queue
    this.batchQueue.push(prompt);
    
    if (this.batchQueue.length >= this.batchSize) {
      return this.processBatch();
    }
    
    // Set timeout for partial batch
    if (!this.batchTimeout) {
      this.batchTimeout = setTimeout(() => this.processBatch(), 1000);
    }
  }

  private async processBatch() {
    const batch = this.batchQueue.splice(0, this.batchSize);
    clearTimeout(this.batchTimeout);
    
    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content: "Categorize these prompts into folders and suggest tags..."
        },
        {
          role: "user",
          content: JSON.stringify(batch)
        }
      ],
      response_format: { type: "json_object" }
    });
    
    // Cache results
    const categories = JSON.parse(response.choices[0].message.content);
    await Promise.all(
      categories.map((cat, i) => 
        redis.setex(`category:${batch[i].hash}`, 86400, JSON.stringify(cat))
      )
    );
    
    return categories;
  }
}
```

## Implementation Plan

### Phase 1: Core Infrastructure (Week 1)

1. **Set up Vercel Blob client uploads**
   ```typescript
   // app/api/import/blob/upload/route.ts
   import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
   
   export async function POST(request: Request) {
     const body = await request.json() as HandleUploadBody;
     
     try {
       const jsonResponse = await handleUpload({
         body,
         request,
         onBeforeGenerateToken: async (pathname, clientPayload) => {
           // Validate user permissions
           const { userId, importType } = clientPayload;
           
           // Check tier limits
           const user = await getUser(userId);
           if (!canImport(user)) {
             throw new Error('Import limit reached');
           }
           
           return {
             allowedContentTypes: ['application/json', 'text/plain', 'text/markdown'],
             tokenPayload: JSON.stringify({ userId, importType }),
           };
         },
         onUploadCompleted: async ({ blob, tokenPayload }) => {
           // Queue processing job
           const { userId, importType } = JSON.parse(tokenPayload);
           
           await queueImportJob({
             blobUrl: blob.url,
             userId,
             importType,
             filename: blob.pathname,
             size: blob.size,
           });
         },
       });
       
       return Response.json(jsonResponse);
     } catch (error) {
       return Response.json({ error: error.message }, { status: 400 });
     }
   }
   ```

2. **Configure QStash for job processing**
   ```typescript
   // lib/qstash.ts
   import { Client } from "@upstash/qstash";
   
   export const qstash = new Client({
     token: process.env.QSTASH_TOKEN!,
   });
   
   export async function queueImportJob(data: ImportJobData) {
     const response = await qstash.publishJSON({
       url: `${process.env.NEXT_PUBLIC_APP_URL}/api/import/process`,
       body: data,
       retries: 3,
       headers: {
         "Content-Type": "application/json",
       },
     });
     
     return response.messageId;
   }
   ```

3. **Implement chunked processing endpoint**
   ```typescript
   // app/api/import/process/route.ts
   import { verifySignature } from "@upstash/qstash/nextjs";
   
   export const POST = verifySignature(async (req: Request) => {
     const data = await req.json();
     const { blobUrl, userId, importType, sessionId } = data;
     
     // Initialize progress
     await redis.hset(`import:${sessionId}`, {
       status: 'processing',
       startedAt: Date.now(),
     });
     
     // Process file in chunks
     const processor = getProcessor(importType);
     let totalProcessed = 0;
     
     for await (const chunk of processor.parseChunks(blobUrl)) {
       // Process chunk
       const results = await processChunk(chunk, userId);
       totalProcessed += results.length;
       
       // Update progress
       await redis.hset(`import:${sessionId}`, {
         processedPrompts: totalProcessed,
         lastUpdated: Date.now(),
       });
       
       // Queue next chunk if needed
       if (chunk.hasMore) {
         await qstash.publishJSON({
           url: `${process.env.NEXT_PUBLIC_APP_URL}/api/import/process-chunk`,
           body: {
             sessionId,
             chunkId: chunk.id,
             offset: chunk.nextOffset,
           },
           delay: 1, // 1 second delay between chunks
         });
       }
     }
     
     return Response.json({ success: true, processed: totalProcessed });
   });
   ```

### Phase 2: Parser Implementation (Week 2)

1. **Base Parser Interface**
   ```typescript
   // lib/importers/base-parser.ts
   export abstract class BaseParser {
     abstract parseChunks(blobUrl: string): AsyncGenerator<ParsedChunk>;
     abstract validateFile(content: string): boolean;
     
     protected async* streamFile(blobUrl: string) {
       const response = await fetch(blobUrl);
       const reader = response.body!.getReader();
       const decoder = new TextDecoder();
       
       let buffer = '';
       while (true) {
         const { done, value } = await reader.read();
         if (done) break;
         
         buffer += decoder.decode(value, { stream: true });
         yield buffer;
       }
     }
   }
   ```

2. **Platform-specific parsers**
   ```typescript
   // lib/importers/chatgpt-parser.ts
   export class ChatGPTParser extends BaseParser {
     async* parseChunks(blobUrl: string): AsyncGenerator<ParsedChunk> {
       let conversations = [];
       let buffer = '';
       
       for await (const chunk of this.streamFile(blobUrl)) {
         buffer = chunk;
         
         // Try to parse complete JSON objects
         try {
           const data = JSON.parse(buffer);
           conversations = data.conversations || [];
           buffer = '';
         } catch (e) {
           // Keep buffering if JSON is incomplete
           continue;
         }
         
         // Extract prompts from conversations
         for (const conversation of conversations) {
           const prompts = this.extractPrompts(conversation);
           
           if (prompts.length >= 100) {
             yield {
               prompts: prompts.splice(0, 100),
               hasMore: true,
               metadata: { conversationId: conversation.id }
             };
           }
         }
       }
     }
     
     private extractPrompts(conversation: any): Prompt[] {
       return conversation.messages
         .filter(m => m.author.role === 'user')
         .map(m => ({
           content: m.content.parts.join('\n'),
           metadata: {
             model: conversation.model,
             timestamp: m.create_time,
           }
         }));
     }
   }
   ```

### Phase 3: Progress UI & Monitoring (Week 3)

1. **Real-time progress component**
   ```typescript
   // components/import-progress.tsx
   export function ImportProgress({ sessionId }: { sessionId: string }) {
     const [progress, setProgress] = useState<ImportProgress | null>(null);
     
     useEffect(() => {
       const eventSource = new EventSource(
         `/api/import/progress?sessionId=${sessionId}`
       );
       
       eventSource.onmessage = (event) => {
         const data = JSON.parse(event.data);
         setProgress(data);
       };
       
       return () => eventSource.close();
     }, [sessionId]);
     
     if (!progress) return <Skeleton />;
     
     return (
       <div className="space-y-4">
         <Progress 
           value={(progress.processed / progress.total) * 100} 
         />
         <div className="flex justify-between text-sm">
           <span>{progress.processed} / {progress.total} prompts</span>
           <span>{progress.status}</span>
         </div>
         {progress.errors.length > 0 && (
           <Alert variant="warning">
             {progress.errors.length} prompts failed to import
           </Alert>
         )}
       </div>
     );
   }
   ```

2. **Server-sent events for progress**
   ```typescript
   // app/api/import/progress/route.ts
   export async function GET(req: Request) {
     const { searchParams } = new URL(req.url);
     const sessionId = searchParams.get('sessionId');
     
     const stream = new ReadableStream({
       async start(controller) {
         const sendUpdate = async () => {
           const progress = await redis.hgetall(`import:${sessionId}`);
           
           if (progress) {
             controller.enqueue(
               `data: ${JSON.stringify(progress)}\n\n`
             );
           }
           
           if (progress?.status === 'completed') {
             controller.close();
           } else {
             setTimeout(sendUpdate, 1000);
           }
         };
         
         await sendUpdate();
       },
     });
     
     return new Response(stream, {
       headers: {
         'Content-Type': 'text/event-stream',
         'Cache-Control': 'no-cache',
         'Connection': 'keep-alive',
       },
     });
   }
   ```

## Performance Optimizations

### 1. Intelligent Caching

```typescript
class CacheManager {
  private readonly redis: Redis;
  private readonly ttl = 86400; // 24 hours

  async getCachedCategory(promptHash: string): Promise<Category | null> {
    const cached = await this.redis.get(`cat:${promptHash}`);
    return cached ? JSON.parse(cached) : null;
  }

  async setCachedCategory(promptHash: string, category: Category) {
    await this.redis.setex(
      `cat:${promptHash}`,
      this.ttl,
      JSON.stringify(category)
    );
  }

  async getCachedOptimization(promptHash: string): Promise<Optimization | null> {
    const cached = await this.redis.get(`opt:${promptHash}`);
    return cached ? JSON.parse(cached) : null;
  }
}
```

### 2. Batch Processing

```typescript
class BatchProcessor {
  private queue: QueueItem[] = [];
  private processing = false;

  async add(item: QueueItem) {
    this.queue.push(item);
    
    if (!this.processing && this.queue.length >= 10) {
      await this.processBatch();
    }
  }

  private async processBatch() {
    this.processing = true;
    const batch = this.queue.splice(0, 10);
    
    try {
      // Process batch with OpenAI
      const results = await this.categorizeeBatch(batch);
      
      // Store results
      await this.storeBatch(results);
    } finally {
      this.processing = false;
      
      // Process next batch if available
      if (this.queue.length > 0) {
        setTimeout(() => this.processBatch(), 100);
      }
    }
  }
}
```

### 3. Deduplication

```typescript
async function deduplicatePrompts(prompts: Prompt[], userId: string) {
  // Generate hashes for all prompts
  const hashes = prompts.map(p => generateHash(p.content));
  
  // Check existing prompts in batch
  const existing = await db
    .select({ hash: prompts.contentHash })
    .from(prompts)
    .where(
      and(
        eq(prompts.userId, userId),
        inArray(prompts.contentHash, hashes)
      )
    );
  
  const existingHashes = new Set(existing.map(e => e.hash));
  
  // Filter out duplicates
  return prompts.filter(p => 
    !existingHashes.has(generateHash(p.content))
  );
}
```

## Cost Analysis

### Monthly Cost Breakdown (1000 active users)

| Service | Usage | Cost |
|---------|-------|------|
| Vercel Blob | 100GB storage, 1TB bandwidth | $20 + $90 = $110 |
| QStash | 3M messages/month | $30 |
| Upstash Redis | 10GB, 100M commands | $90 |
| OpenAI API | 500K categorizations | $50 |
| **Total** | | **$280/month** |

### Cost Optimization Strategies

1. **Aggressive Caching**: Cache AI responses for 7 days
2. **Batch Processing**: Group API calls to reduce overhead
3. **Tiered Processing**: Basic categorization for free users
4. **Storage Cleanup**: Auto-delete processed files after 7 days

## Security Considerations

### 1. File Validation

```typescript
const validateUpload = async (pathname: string, clientPayload: any) => {
  // Validate file type
  const allowedTypes = ['application/json', 'text/plain', 'text/markdown'];
  
  // Validate file size (max 500MB)
  const maxSize = 500 * 1024 * 1024;
  
  // Validate user permissions
  const user = await getUser(clientPayload.userId);
  if (!user || !canImport(user)) {
    throw new Error('Unauthorized');
  }
  
  // Rate limiting
  const importCount = await redis.incr(`import:rate:${user.id}`);
  await redis.expire(`import:rate:${user.id}`, 3600);
  
  if (importCount > 10) {
    throw new Error('Rate limit exceeded');
  }
  
  return true;
};
```

### 2. Content Sanitization

```typescript
function sanitizePrompt(content: string): string {
  // Remove potential XSS
  content = content.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  
  // Remove SQL injection attempts
  content = content.replace(/(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION)\b)/gi, '');
  
  // Truncate to reasonable length
  return content.substring(0, 10000);
}
```

## Monitoring & Alerting

### 1. Key Metrics

```typescript
// Track in Vercel Analytics
export const metrics = {
  importStarted: (source: string) => 
    track('import.started', { source }),
  
  importCompleted: (source: string, count: number, duration: number) =>
    track('import.completed', { source, count, duration }),
  
  importFailed: (source: string, error: string) =>
    track('import.failed', { source, error }),
  
  aiCategorization: (cached: boolean, duration: number) =>
    track('ai.categorization', { cached, duration }),
};
```

### 2. Health Checks

```typescript
// app/api/health/import/route.ts
export async function GET() {
  const checks = {
    blob: await checkBlobStorage(),
    redis: await checkRedis(),
    qstash: await checkQStash(),
    database: await checkDatabase(),
  };
  
  const healthy = Object.values(checks).every(c => c.status === 'ok');
  
  return Response.json({
    status: healthy ? 'healthy' : 'degraded',
    checks,
    timestamp: new Date().toISOString(),
  }, {
    status: healthy ? 200 : 503,
  });
}
```

## Migration Strategy

### Phase 1: Update Current Implementation
1. Replace server-side upload with client-side blob upload
2. Implement basic chunking for existing parsers
3. Add progress tracking with Redis

### Phase 2: Add Background Processing
1. Integrate QStash for job queuing
2. Refactor parsers for streaming
3. Implement retry logic

### Phase 3: Optimize & Scale
1. Add AI categorization with caching
2. Implement batch processing
3. Add comprehensive monitoring

## Conclusion

This infrastructure design provides a robust, scalable solution for handling large file imports in AI Prompt Vault. By leveraging Vercel's ecosystem with strategic additions like QStash and Upstash Redis, we can process files of any size while maintaining excellent user experience and cost efficiency.

The modular architecture allows for easy extension to new import sources and provides clear upgrade paths as the platform grows. With built-in monitoring, caching, and error handling, the system is production-ready and can scale to thousands of concurrent users.