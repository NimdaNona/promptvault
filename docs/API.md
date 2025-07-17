# PromptVault API Documentation

## Overview

PromptVault's API is built with Next.js App Router, providing RESTful endpoints for all platform functionality. All API routes are protected by Clerk authentication unless explicitly marked as public.

## Authentication

All API requests require authentication via Clerk. The authentication token is automatically handled by the Clerk middleware for browser requests. For programmatic access, include the Clerk session token in the Authorization header:

```
Authorization: Bearer <session_token>
```

## Base URL

- **Production**: `https://aipromptvault.app/api`
- **Development**: `http://localhost:3000/api`

## Common Response Formats

### Success Response
```json
{
  "success": true,
  "data": { ... }
}
```

### Error Response
```json
{
  "error": "Error message",
  "details": { ... }  // Optional
}
```

## API Endpoints

### Prompts

#### List Prompts
```
GET /api/prompts
```

Query parameters:
- `search` (string): Search prompts by name or content
- `folder` (string): Filter by folder path
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20, max: 100)

Response:
```json
{
  "prompts": [
    {
      "id": "uuid",
      "name": "Prompt name",
      "description": "Description",
      "content": "Prompt content",
      "model": "gpt-4",
      "folder": "marketing/social",
      "metadata": { ... },
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

#### Create Prompt
```
POST /api/prompts
```

Request body:
```json
{
  "name": "Prompt name",
  "description": "Optional description",
  "content": "Prompt content",
  "model": "gpt-4",
  "folder": "marketing/social",
  "metadata": {
    "temperature": 0.7,
    "maxTokens": 1000
  }
}
```

Response:
```json
{
  "id": "uuid",
  "name": "Prompt name",
  // ... full prompt object
}
```

#### Get Single Prompt
```
GET /api/prompts/[id]
```

Response:
```json
{
  "id": "uuid",
  "name": "Prompt name",
  // ... full prompt object
  "versions": [
    {
      "id": "uuid",
      "version": 1,
      "content": "Content",
      "changeMessage": "Initial version",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

#### Update Prompt
```
PATCH /api/prompts/[id]
```

Request body (all fields optional):
```json
{
  "name": "Updated name",
  "description": "Updated description",
  "content": "Updated content",
  "folder": "new/folder",
  "metadata": { ... }
}
```

#### Delete Prompt
```
DELETE /api/prompts/[id]
```

Response:
```json
{
  "success": true,
  "message": "Prompt deleted successfully"
}
```

### Import System

#### Upload Files for Import
```
POST /api/import/upload
```

Multipart form data:
- `file`: File to upload (max 10MB)

Response:
```json
{
  "url": "https://blob.vercel-storage.com/...",
  "pathname": "uploads/...",
  "contentType": "application/json",
  "size": 1024
}
```

#### Bulk Import
```
POST /api/import/bulk
```

Request body:
```json
{
  "files": [
    {
      "url": "blob_url",
      "source": "chatgpt|claude|gemini|cline|cursor",
      "name": "export.json"
    }
  ],
  "options": {
    "skipDuplicates": true,
    "autoCategize": true,
    "targetFolder": "imports/chatgpt"
  }
}
```

Response:
```json
{
  "success": true,
  "imported": 25,
  "skipped": 5,
  "errors": [],
  "warnings": ["5 duplicate prompts detected"],
  "sessionId": "uuid"
}
```

#### Platform-Specific Import

**ChatGPT Import**
```
POST /api/import/chatgpt
```

**Claude Import**
```
POST /api/import/claude
```

**Cline Import**
```
POST /api/import/cline
```

All follow similar request/response patterns as bulk import.

### AI Features

#### Optimize Prompt
```
POST /api/optimize
```

Request body:
```json
{
  "promptId": "uuid",
  "content": "Original prompt content",
  "targetModel": "gpt-4"
}
```

Response:
```json
{
  "optimized": "Improved prompt content",
  "improvements": [
    "Added clear instructions",
    "Improved formatting",
    "Added context boundaries"
  ],
  "scoreBefore": 0.65,
  "scoreAfter": 0.89
}
```

#### AI Onboarding Suggestions
```
POST /api/ai/onboarding
```

Request body:
```json
{
  "role": "developer|marketer|researcher|other",
  "interests": ["web development", "API design"],
  "experience": "intermediate"
}
```

Response:
```json
{
  "suggestions": [
    {
      "name": "Code Review Assistant",
      "content": "You are an expert code reviewer...",
      "category": "development",
      "tags": ["code-review", "best-practices"]
    }
  ]
}
```

### Sharing

#### Create Share Link
```
POST /api/share
```

Request body:
```json
{
  "promptId": "uuid",
  "expiresIn": 7  // days, optional
}
```

Response:
```json
{
  "shareCode": "abc123def",
  "shareUrl": "https://aipromptvault.app/share/abc123def",
  "expiresAt": "2024-01-08T00:00:00Z"
}
```

#### Get Shared Prompt
```
GET /api/share/[shareCode]
```

Public endpoint - no authentication required.

Response:
```json
{
  "prompt": {
    "name": "Prompt name",
    "content": "Prompt content",
    "model": "gpt-4"
  },
  "sharedBy": "User Name",
  "expiresAt": "2024-01-08T00:00:00Z"
}
```

### Billing

#### Create Checkout Session
```
POST /api/billing/create-checkout
```

Request body:
```json
{
  "priceId": "price_1RlXaFG48MbDPfJlDHIs7KdQ",
  "tier": "pro|enterprise"
}
```

Response:
```json
{
  "sessionId": "cs_test_...",
  "url": "https://checkout.stripe.com/..."
}
```

#### Create Customer Portal
```
POST /api/billing/create-portal
```

Response:
```json
{
  "url": "https://billing.stripe.com/session/..."
}
```

### Webhooks (Public)

#### Clerk Webhook
```
POST /api/webhooks/clerk
```

Handles:
- `user.created` - Creates user record in database
- `user.updated` - Updates user information
- `user.deleted` - Soft deletes user data

#### Stripe Webhook
```
POST /api/webhooks/stripe
```

Handles:
- `checkout.session.completed` - Activates subscription
- `customer.subscription.updated` - Updates tier
- `customer.subscription.deleted` - Downgrades to free

### User Management

#### Get Current User
```
GET /api/user
```

Response:
```json
{
  "id": "clerk_user_id",
  "email": "user@example.com",
  "name": "User Name",
  "tier": "pro",
  "promptCount": 150,
  "limits": {
    "prompts": -1,
    "aiOptimizations": -1,
    "teamMembers": 5
  }
}
```

#### Update User Preferences
```
PATCH /api/user/preferences
```

Request body:
```json
{
  "theme": "light|dark",
  "emailNotifications": true,
  "defaultModel": "gpt-4"
}
```

## Rate Limiting

API endpoints are rate limited to prevent abuse:

- **Standard endpoints**: 100 requests per minute
- **AI endpoints**: 20 requests per minute
- **Import endpoints**: 10 requests per minute

Rate limit headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1704067200
```

## Error Codes

| Status Code | Description |
|------------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Missing or invalid auth |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found |
| 409 | Conflict - Duplicate resource |
| 413 | Payload Too Large |
| 429 | Too Many Requests - Rate limited |
| 500 | Internal Server Error |

## Pagination

List endpoints support pagination with these parameters:
- `page`: Page number (1-based)
- `limit`: Items per page (max 100)

Response includes pagination metadata:
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5,
    "hasNext": true,
    "hasPrev": false
  }
}
```

## Versioning

The API currently uses implicit versioning through the URL structure. Future versions will include explicit versioning:
- Current: `/api/endpoint`
- Future: `/api/v2/endpoint`

## SDK and Client Libraries

Currently, the API is accessed directly via HTTP. Official SDKs are planned for:
- JavaScript/TypeScript
- Python
- Go

## Best Practices

1. **Always handle errors** gracefully
2. **Respect rate limits** to avoid throttling
3. **Use pagination** for large datasets
4. **Cache responses** when appropriate
5. **Validate input** before sending requests
6. **Handle webhook retries** idempotently

## Testing

For local development and testing:

```bash
# Test with curl
curl -H "Authorization: Bearer <token>" \
  http://localhost:3000/api/prompts

# Test webhooks with Stripe CLI
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```