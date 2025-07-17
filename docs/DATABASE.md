# PromptVault Database Documentation

## Overview

PromptVault uses Neon PostgreSQL with Drizzle ORM for type-safe database operations. The database schema is designed for scalability, performance, and data integrity with comprehensive relationships and indexes.

## Database Configuration

### Connection Setup

**Production Configuration**:
- **Provider**: Neon PostgreSQL
- **Connection Pooling**: Enabled (required for serverless)
- **SSL**: Required
- **Max Connections**: Handled by Neon pooler

**Connection URLs**:
```env
# Pooled connection for application use
DATABASE_URL=postgresql://[user]:[password]@[host]/[database]?sslmode=require

# Unpooled connection for migrations only
DATABASE_URL_UNPOOLED=postgresql://[user]:[password]@[host]/[database]?sslmode=require
```

### Drizzle Configuration

```typescript
// drizzle.config.ts
export default {
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  driver: "pg",
  dbCredentials: {
    connectionString: process.env.DATABASE_URL_UNPOOLED!,
  },
} satisfies Config;
```

## Database Schema

### Users Table

Extended user profiles synchronized with Clerk authentication.

```typescript
users {
  id: text (PK)                    // Clerk user ID
  email: text (UNIQUE, NOT NULL)   // User email
  name: text                       // Display name
  tier: text (DEFAULT 'free')      // Subscription tier: free, pro, enterprise
  promptCount: integer (DEFAULT 0) // Cached prompt count
  stripeCustomerId: text           // Stripe customer reference
  stripeSubscriptionId: text       // Active subscription ID
  createdAt: timestamp             // Account creation
  updatedAt: timestamp             // Last update
}

Indexes:
- user_email_idx (email)
```

### Prompts Table

Main content storage for user prompts.

```typescript
prompts {
  id: uuid (PK)                    // Unique prompt ID
  userId: text (FK -> users.id)    // Owner reference
  name: text (NOT NULL)            // Prompt name
  description: text                // Optional description
  content: text (NOT NULL)         // Prompt content
  model: text (DEFAULT 'gpt-4')    // Target LLM model
  isPublic: boolean (DEFAULT false) // Public visibility
  folder: text                     // Folder path (e.g., "marketing/social")
  metadata: jsonb                  // Additional settings
  createdAt: timestamp             // Creation time
  updatedAt: timestamp             // Last update
}

Indexes:
- prompt_user_id_idx (userId)
- prompt_folder_idx (folder)
- prompt_public_idx (isPublic)
```

### Prompt Versions Table

Git-like version control for prompt history.

```typescript
promptVersions {
  id: uuid (PK)                    // Version ID
  promptId: uuid (FK -> prompts.id) // Parent prompt
  version: integer (NOT NULL)      // Version number
  content: text (NOT NULL)         // Version content
  metadata: jsonb                  // Version metadata
  changeMessage: text              // Commit message
  createdAt: timestamp             // Version creation
  createdBy: text (FK -> users.id) // Author
}

Indexes:
- version_prompt_id_idx (promptId)
- prompt_version_unique (promptId, version) UNIQUE
```

### Tags Table

User-defined tags for organization.

```typescript
tags {
  id: uuid (PK)                    // Tag ID
  name: text (NOT NULL)            // Tag name
  userId: text (FK -> users.id)    // Owner
  color: varchar(7) (DEFAULT '#3B82F6') // Hex color
  createdAt: timestamp             // Creation time
}

Constraints:
- user_tag_unique (userId, name) UNIQUE
```

### Prompt Tags Junction Table

Many-to-many relationship between prompts and tags.

```typescript
promptTags {
  promptId: uuid (FK -> prompts.id) // Prompt reference
  tagId: uuid (FK -> tags.id)      // Tag reference
}

Constraints:
- prompt_tag_primary (promptId, tagId) UNIQUE
```

### Shares Table

Shareable links with optional expiration.

```typescript
shares {
  id: uuid (PK)                    // Share ID
  promptId: uuid (FK -> prompts.id) // Shared prompt
  sharedBy: text (FK -> users.id)  // Share creator
  shareCode: text (UNIQUE)         // Unique share code
  expiresAt: timestamp             // Optional expiration
  viewCount: integer (DEFAULT 0)   // Access count
  createdAt: timestamp             // Share creation
}

Indexes:
- share_code_idx (shareCode) UNIQUE
```

### Team Invites Table

Team collaboration invitations (Pro/Enterprise).

```typescript
teamInvites {
  id: uuid (PK)                    // Invite ID
  invitedBy: text (FK -> users.id) // Inviter
  invitedEmail: text (NOT NULL)    // Invitee email
  role: text (DEFAULT 'viewer')    // Role: viewer, editor
  accepted: boolean (DEFAULT false) // Acceptance status
  createdAt: timestamp             // Invite creation
  expiresAt: timestamp (NOT NULL)  // Expiration time
}

Indexes:
- invite_email_idx (invitedEmail)
```

### Import Sessions Table

Track bulk import operations.

```typescript
importSessions {
  id: uuid (PK)                    // Session ID
  userId: text (FK -> users.id)    // Importer
  source: text (NOT NULL)          // Import source
  importedCount: integer           // Success count
  skippedCount: integer            // Skip count
  metadata: jsonb                  // Import details
  createdAt: timestamp             // Import time
}

Indexes:
- import_sessions_user_id_idx (userId)
- import_sessions_source_idx (source)

Source values:
- 'chatgpt'
- 'claude'
- 'gemini'
- 'cline'
- 'cursor'
- 'file'
```

### Prompt Optimizations Table

AI optimization history and results.

```typescript
promptOptimizations {
  id: uuid (PK)                    // Optimization ID
  promptId: uuid (FK -> prompts.id) // Original prompt
  originalContent: text (NOT NULL)  // Before optimization
  optimizedContent: text (NOT NULL) // After optimization
  improvements: jsonb              // Improvement list
  scoreBefore: real                // Quality score before
  scoreAfter: real                 // Quality score after
  createdAt: timestamp             // Optimization time
}

Indexes:
- prompt_optimizations_prompt_id_idx (promptId)
```

### Prompt Templates Table

Reusable prompt templates and examples.

```typescript
promptTemplates {
  id: uuid (PK)                    // Template ID
  category: text (NOT NULL)        // Template category
  name: text (NOT NULL)            // Template name
  description: text                // Description
  content: text (NOT NULL)         // Template content
  variables: jsonb                 // Variable definitions
  usageCount: integer (DEFAULT 0)  // Usage counter
  rating: real                     // User rating
  isOfficial: boolean (DEFAULT false) // Official template
  createdBy: text (FK -> users.id) // Creator (nullable)
  createdAt: timestamp             // Creation time
}

Indexes:
- prompt_templates_category_idx (category)
- prompt_templates_official_idx (isOfficial)
```

## Database Relationships

### Drizzle Relations

```typescript
// User relationships
usersRelations = {
  prompts: many(prompts)
  tags: many(tags)
  shares: many(shares)
  invites: many(teamInvites)
  importSessions: many(importSessions)
  promptTemplates: many(promptTemplates)
}

// Prompt relationships
promptsRelations = {
  user: one(users)
  versions: many(promptVersions)
  tags: many(promptTags)
  shares: many(shares)
  optimizations: many(promptOptimizations)
}

// Version relationships
promptVersionsRelations = {
  prompt: one(prompts)
  createdBy: one(users)
}
```

## Common Queries

### Get User with Prompt Count
```typescript
const user = await db.query.users.findFirst({
  where: eq(users.id, userId),
  with: {
    prompts: {
      columns: { id: true }
    }
  }
});
```

### Get Prompts with Tags
```typescript
const prompts = await db.query.prompts.findMany({
  where: eq(prompts.userId, userId),
  with: {
    tags: {
      with: {
        tag: true
      }
    }
  }
});
```

### Create Prompt with Version
```typescript
await db.transaction(async (tx) => {
  const [prompt] = await tx.insert(prompts).values({
    userId,
    name,
    content,
    folder
  }).returning();

  await tx.insert(promptVersions).values({
    promptId: prompt.id,
    version: 1,
    content,
    changeMessage: "Initial version",
    createdBy: userId
  });

  await tx.update(users)
    .set({ promptCount: sql`${users.promptCount} + 1` })
    .where(eq(users.id, userId));
});
```

## Database Migrations

### Creating Migrations
```bash
npm run db:generate  # Generate migration from schema changes
```

### Running Migrations
```bash
npm run db:migrate   # Run migrations in production
npm run db:push      # Push schema changes (development only)
```

### Migration Best Practices

1. **Always review generated migrations** before applying
2. **Test migrations locally** first
3. **Backup production data** before major migrations
4. **Use transactions** for multi-step migrations
5. **Include rollback scripts** for complex changes

## Performance Optimization

### Indexes

Critical indexes for performance:
- User email lookup
- Prompt folder navigation
- Share code resolution
- Import session tracking

### Query Optimization

1. **Use prepared statements** via Drizzle
2. **Leverage connection pooling**
3. **Implement pagination** for large datasets
4. **Use selective columns** in queries
5. **Batch operations** when possible

### Connection Pooling

Neon handles connection pooling automatically:
- Max pool size: Managed by Neon
- Idle timeout: 5 minutes
- Connection retry: Automatic

## Data Integrity

### Constraints

- **Foreign keys** with cascading deletes
- **Unique constraints** on critical fields
- **NOT NULL** constraints for required data
- **Default values** for optional fields

### Transactions

Always use transactions for:
- Multi-table operations
- Prompt creation with versions
- User tier updates
- Import operations

Example:
```typescript
try {
  await db.transaction(async (tx) => {
    // Multiple operations
    // All succeed or all fail
  });
} catch (error) {
  // Handle rollback
}
```

## Backup and Recovery

### Automatic Backups

Neon provides:
- **Point-in-time recovery**: Up to 7 days
- **Branching**: Create database branches
- **Snapshots**: On-demand backups

### Manual Backup Strategy

1. **Daily exports** of critical data
2. **Version control** for schema
3. **Test restore procedures** regularly
4. **Document recovery steps**

## Security Considerations

### Access Control

- **Row-level security** via application logic
- **User isolation** enforced in queries
- **Connection encryption** (SSL required)
- **Credential rotation** recommended

### Data Sanitization

- **Input validation** with Zod
- **SQL injection prevention** via Drizzle
- **JSONB validation** for metadata
- **Content sanitization** for user input

## Monitoring and Maintenance

### Key Metrics

Monitor:
- Connection pool usage
- Query performance
- Storage growth
- Index efficiency

### Maintenance Tasks

Regular tasks:
1. **Analyze query performance**
2. **Update table statistics**
3. **Review slow query log**
4. **Clean up orphaned data**
5. **Optimize indexes**

## Troubleshooting

### Common Issues

1. **Connection Pool Exhaustion**
   - Solution: Check for connection leaks
   - Use pooled connection URL

2. **Transaction Errors**
   ```
   Error: No transactions support in neon-http driver
   ```
   - Solution: Ensure using pooled connection

3. **Migration Failures**
   - Check migration syntax
   - Verify database permissions
   - Test locally first

4. **Performance Issues**
   - Review query plans
   - Add appropriate indexes
   - Consider query optimization