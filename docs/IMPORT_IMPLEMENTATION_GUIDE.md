# Import Implementation Guide

This document provides a comprehensive reference for the AI Prompt Vault import infrastructure, detailing how to utilize and integrate the import system for adding new platforms or maintaining existing functionality.

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Component Structure](#component-structure)
3. [Adding New Import Platforms](#adding-new-import-platforms)
4. [API Endpoints](#api-endpoints)
5. [File Processing Pipeline](#file-processing-pipeline)
6. [Progress Tracking](#progress-tracking)
7. [AI Categorization](#ai-categorization)
8. [Error Handling](#error-handling)
9. [Testing](#testing)
10. [Environment Variables](#environment-variables)

## Architecture Overview

The import system is designed to handle large file uploads (up to 500MB) with background processing, real-time progress tracking, and AI-powered categorization.

### Key Components:
1. **Client-Side Upload**: Uses Vercel Blob for multipart uploads
2. **Background Processing**: QStash message queue for async processing
3. **Progress Tracking**: Upstash Redis + Server-Sent Events (SSE)
4. **AI Categorization**: OpenAI API with Redis caching
5. **Platform Parsers**: Modular parsers for each LLM platform

### Flow Diagram:
```
User Upload → Vercel Blob → Create Session → QStash Queue → Worker Process
                                                                    ↓
Progress SSE ← Redis Updates ← Progress Tracker ← File Processing
                                                        ↓
                                                  AI Categorization
                                                        ↓
                                                  Database Insert
```

## Component Structure

### Frontend Components

#### `/src/components/import/import-dialog.tsx`
Main entry point for imports. Displays platform tabs and manages import flow.

```typescript
// Usage in any page:
import { ImportDialog } from '@/components/import/import-dialog';

const [dialogOpen, setDialogOpen] = useState(false);
<ImportDialog open={dialogOpen} onOpenChange={setDialogOpen} />
```

#### `/src/components/import/upload-component.tsx`
Handles file upload with drag-and-drop support. Key features:
- Client-side multipart upload
- Progress tracking
- Error handling
- Automatic session creation and processing trigger

#### `/src/components/import/progress-display.tsx`
Real-time progress display using SSE. Auto-updates as import progresses.

### Backend Services

#### `/src/lib/services/file-processing.ts`
Core processing engine. Handles:
- File download from Vercel Blob
- Platform detection and parser selection
- Batch processing with progress updates
- AI categorization integration

#### `/src/lib/services/ai-categorizer.ts`
AI-powered categorization with caching:
- Uses GPT-3.5-turbo for efficiency
- Redis caching to reduce API costs
- Batched processing for multiple prompts

#### `/src/lib/services/progress-tracker.ts`
Redis-based progress tracking:
- Atomic updates
- 1-hour TTL on progress data
- Publishes updates for SSE consumption

## Adding New Import Platforms

To add support for a new LLM platform:

### 1. Create Parser Implementation

Create `/src/lib/importers/[platform-name].ts`:

```typescript
import { BaseImporter } from './base';
import { ParsedPrompt } from '@/lib/types/import';

export class PlatformNameImporter extends BaseImporter {
  platform = 'platform-name' as const;

  async parseContent(content: string): Promise<ParsedPrompt[]> {
    const prompts: ParsedPrompt[] = [];
    
    try {
      // Parse platform-specific format
      const data = JSON.parse(content);
      
      // Transform to ParsedPrompt format
      for (const item of data.conversations) {
        prompts.push({
          userMessage: item.user_input,
          assistantMessage: item.ai_response,
          metadata: {
            model: item.model || 'unknown',
            timestamp: item.created_at,
            // Optional metadata
            usage: item.token_usage,
            context: item.context,
          }
        });
      }
    } catch (error) {
      console.error(`Error parsing ${this.platform} content:`, error);
      throw new Error(`Invalid ${this.platform} export format`);
    }
    
    return prompts;
  }
}
```

### 2. Update Type Definitions

Add to `/src/lib/types/import.ts`:

```typescript
export type ImportPlatform = 
  | 'chatgpt' 
  | 'claude' 
  | 'gemini' 
  | 'cline' 
  | 'cursor'
  | 'platform-name'; // Add new platform
```

### 3. Register Parser

Update `/src/lib/services/file-processing.ts`:

```typescript
import { PlatformNameImporter } from '@/lib/importers/platform-name';

private getParser(platform: ImportPlatform): BaseImporter {
  switch (platform) {
    // ... existing cases
    case 'platform-name':
      return new PlatformNameImporter();
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
}
```

### 4. Add UI Support

Update `/src/components/import/import-dialog.tsx`:

```typescript
const platforms = [
  // ... existing platforms
  {
    value: 'platform-name',
    label: 'Platform Name',
    icon: <IconComponent className="h-5 w-5" />,
    description: 'Import conversations from Platform Name',
  },
];

// Add export instructions
function getExportInstructions(platform: ImportPlatform) {
  const instructions = {
    // ... existing instructions
    'platform-name': (
      <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
        <li>Step 1 for exporting from platform</li>
        <li>Step 2...</li>
        <li>Upload the exported file here</li>
      </ol>
    ),
  };
}
```

## API Endpoints

### POST `/api/import/session`
Creates import session. Required before upload.

**Request:**
```json
{
  "platform": "chatgpt"
}
```

**Response:**
```json
{
  "sessionId": "abc123",
  "platform": "chatgpt",
  "status": "pending"
}
```

### POST `/api/import/upload-handler`
Handles Vercel Blob multipart uploads. Called automatically by upload component.

### POST `/api/import/process`
Triggers background processing. Called automatically after upload.

**Request:**
```json
{
  "sessionId": "abc123"
}
```

### GET `/api/import/progress/[sessionId]`
SSE endpoint for real-time progress updates.

**Response (SSE):**
```
data: {"status":"processing","progress":45,"message":"Processing prompts...","totalPrompts":100,"processedPrompts":45}
```

### POST `/api/import/worker`
QStash worker endpoint. Not called directly - triggered by message queue.

## File Processing Pipeline

### Supported File Formats

Each platform parser supports specific formats:

- **ChatGPT**: JSON with conversation tree structure
- **Claude**: JSON (app export) or JSONL (Claude Code)
- **Gemini**: JSON with various structures
- **Cline**: Markdown with special formatting
- **Cursor**: JSON composer or conversation format

### Processing Steps

1. **Download**: Fetch file from Vercel Blob URL
2. **Parse**: Platform-specific parsing
3. **Validate**: Ensure required fields exist
4. **Transform**: Convert to standard ParsedPrompt format
5. **Categorize**: AI-powered categorization (batched)
6. **Insert**: Batch insert to database with deduplication

### Chunking Strategy

For large files, processing happens in chunks:
- Default chunk size: 50 prompts
- Configurable via `IMPORT_CHUNK_SIZE` env var
- Progress updates after each chunk

## Progress Tracking

### Redis Schema

Progress stored with key pattern: `import:progress:{sessionId}`

```typescript
{
  sessionId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number; // 0-100
  message: string;
  totalPrompts?: number;
  processedPrompts?: number;
  errors?: string[];
  startedAt?: Date;
  completedAt?: Date;
}
```

### SSE Implementation

Client connects to `/api/import/progress/[sessionId]` and receives updates:

```typescript
// Client usage
const eventSource = new EventSource(`/api/import/progress/${sessionId}`);
eventSource.onmessage = (event) => {
  const progress = JSON.parse(event.data);
  // Update UI
};
```

## AI Categorization

### Categorization Strategy

The AI categorizer uses GPT-3.5-turbo to analyze prompts and suggest:
- Categories (e.g., "Code Generation", "Data Analysis")
- Tags (e.g., ["python", "debugging", "api"])
- Folder organization

### Caching System

Redis caching reduces API costs:
- Cache key: Hash of prompt content
- TTL: 7 days
- Hit rate typically >50% for similar imports

### Batch Processing

Prompts processed in batches of 10 for efficiency:
```typescript
const batchSize = 10;
for (let i = 0; i < prompts.length; i += batchSize) {
  const batch = prompts.slice(i, i + batchSize);
  await this.processBatch(batch);
}
```

## Error Handling

### Retry Strategy

QStash automatically retries failed jobs:
- Max retries: 3
- Backoff: Exponential
- Dead letter queue after final failure

### Error Types

1. **Upload Errors**: Network issues, file too large
2. **Parse Errors**: Invalid file format
3. **Processing Errors**: Database issues, AI API errors
4. **Quota Errors**: User tier limits exceeded

### User Feedback

Errors displayed in progress UI with actionable messages:
```typescript
if (error.code === 'TIER_LIMIT_REACHED') {
  return 'Upgrade to Pro to import more prompts';
}
```

## Testing

### Test Import Page

Use `/test-import` page for testing:
```bash
npm run dev
# Navigate to http://localhost:3000/test-import
```

### Sample Files

Create test files for each platform:

```typescript
// test-chatgpt.json
{
  "conversations": [{
    "id": "123",
    "messages": [
      { "role": "user", "content": "Test prompt" },
      { "role": "assistant", "content": "Test response" }
    ]
  }]
}
```

### Manual Testing Checklist

1. ✅ Upload file via drag-and-drop
2. ✅ Upload file via button click
3. ✅ Monitor progress in real-time
4. ✅ Verify prompts appear in dashboard
5. ✅ Check AI categorization applied
6. ✅ Test with large files (>10MB)
7. ✅ Test error scenarios

## Environment Variables

Required for import system:

```env
# Upstash QStash (Background Jobs)
QSTASH_URL=https://qstash.upstash.io
QSTASH_TOKEN=your-token
QSTASH_CURRENT_SIGNING_KEY=your-signing-key
QSTASH_NEXT_SIGNING_KEY=your-next-signing-key

# Upstash Redis (Progress Tracking & Caching)
UPSTASH_REDIS_REST_URL=https://your-instance.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token

# OpenAI (AI Categorization)
OPENAI_API_KEY=your-api-key

# Vercel Blob (File Storage)
BLOB_READ_WRITE_TOKEN=your-token

# Optional Configuration
IMPORT_CHUNK_SIZE=50 # Prompts per chunk
AI_CATEGORIZATION_BATCH_SIZE=10 # Prompts per AI batch
IMPORT_PROGRESS_TTL=3600 # Progress data TTL in seconds
```

## Troubleshooting

### Common Issues

1. **"QStash signature verification failed"**
   - Ensure QStash signing keys are correct
   - Check webhook URL is publicly accessible

2. **"Redis connection failed"**
   - Verify Upstash Redis credentials
   - Check Redis instance is active

3. **"File upload failed"**
   - Ensure file is under 500MB
   - Check Vercel Blob token is valid

4. **"No prompts found in file"**
   - Verify file format matches platform
   - Check parser implementation

### Debug Mode

Enable debug logging:
```typescript
// In file-processing.ts
const DEBUG = process.env.NODE_ENV === 'development';
if (DEBUG) {
  console.log('Processing file:', { platform, sessionId });
}
```

### Monitoring

Track import metrics:
- Success/failure rates by platform
- Average processing time
- AI categorization cache hit rate
- User tier distribution

## Best Practices

1. **Always validate** user input and file formats
2. **Use transactions** for database operations
3. **Cache AI responses** to reduce costs
4. **Provide clear feedback** during long operations
5. **Handle errors gracefully** with user-friendly messages
6. **Test with real export files** from each platform
7. **Monitor costs** for AI API usage
8. **Set appropriate timeouts** for file processing
9. **Use typed interfaces** for all data structures
10. **Document platform-specific quirks** in parser files

## Future Enhancements

Consider these improvements:

1. **Webhook Notifications**: Notify users when import completes
2. **Import Templates**: Save import settings for reuse
3. **Conflict Resolution**: Handle duplicate prompts intelligently
4. **Export Format**: Allow users to export in any supported format
5. **Bulk Operations**: Select multiple files for import
6. **Import History**: Track and display past imports
7. **Undo Import**: Rollback failed or unwanted imports
8. **Custom Parsers**: Allow users to define custom formats
9. **API Access**: REST API for programmatic imports
10. **Analytics**: Detailed import statistics and insights