# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PromptVault is an AI-powered enterprise-grade prompt management platform built with Next.js 15, TypeScript, and Neon PostgreSQL. It provides secure storage, versioning, team collaboration, and AI optimization for LLM prompts.

## Essential Commands

```bash
# Development
npm run dev          # Start development server with Turbopack (http://localhost:3000)

# Database
npm run db:generate  # Generate Drizzle migrations
npm run db:push      # Push schema changes to database
npm run db:migrate   # Run migrations
npm run db:studio    # Open Drizzle Studio for database management

# Build & Deployment
npm run build        # Production build
vercel --prod        # Deploy to production (requires Vercel CLI)
```

## Architecture & Key Patterns

### Tech Stack
- **Next.js 15.4.1** with App Router and React 19
- **Neon PostgreSQL** with connection pooling (IMPORTANT: Use pooled URL for app, unpooled for migrations)
- **Drizzle ORM** for type-safe database operations
- **Clerk** for authentication (production instance at aipromptvault.app)
- **Stripe** for payments (products already configured)
- **OpenAI API** for AI features
- **Vercel Blob** for file uploads

### Database Architecture

The database uses Drizzle ORM with these key tables:
- `users`: Extended user data with tier system (free/pro/enterprise)
- `prompts`: Main content storage with metadata and folder organization
- `promptVersions`: Git-like version control system
- `shares`: Unique share links with expiration
- `importSessions`: Track bulk import operations

CRITICAL: Always use transactions for operations that modify multiple tables. Example pattern from codebase:
```typescript
await db.transaction(async (tx) => {
  // Multiple operations here
});
```

### API Route Patterns

All API routes follow consistent patterns:
1. Authentication check using Clerk
2. Input validation with Zod schemas
3. Tier limit enforcement
4. Transactional database operations
5. Consistent error responses

Example structure from `/api/prompts/route.ts`:
- GET: List with search, folder filtering, pagination
- POST: Create with tier checks, metadata handling

### Authentication & Middleware

Clerk middleware (`src/middleware.ts`) protects routes:
- Protected: `/dashboard/*`, `/prompts/*`, `/settings/*`, `/api/*` (except webhooks)
- Public: `/`, `/sign-in`, `/sign-up`, `/share/*`, webhooks

IMPORTANT: When creating new API routes, they're automatically protected unless explicitly made public.

### Import System Architecture

The import system (`src/lib/importers/`) supports multiple LLM platforms:
- Each platform has its own parser (chatgpt.ts, claude.ts, etc.)
- Central importer class handles file processing
- Bulk import API at `/api/import/bulk`
- File uploads use Vercel Blob storage

When adding new import sources:
1. Create parser in `src/lib/importers/[platform].ts`
2. Add to import dialog components
3. Update the central importer switch statement

### Tier System & Limits

User tiers are enforced throughout the codebase:
- **Free**: 50 prompts max, basic features only
- **Pro**: Unlimited prompts, AI features, 5 team members
- **Enterprise**: Everything + unlimited team members

Check tier limits before any create operation:
```typescript
const tierLimits = TIERS[user.tier as keyof typeof TIERS]?.limits || TIERS.free.limits;
if (tierLimits.prompts !== -1 && user.promptCount >= tierLimits.prompts) {
  // Handle limit reached
}
```

## Production Configuration

The app is deployed at `aipromptvault.app` with:
- Vercel hosting
- Neon PostgreSQL (connection pooling enabled)
- Clerk production instance
- Stripe products configured (IDs in DEPLOYMENT.md)
- All DNS records properly configured

## Critical Implementation Notes

1. **Database Connections**: Always use the pooled connection URL (`DATABASE_URL`) for the app. Only use unpooled for migrations.

2. **Transaction Errors**: If you see "No transactions support in neon-http driver", ensure you're using the pooled connection with proper configuration.

3. **File Uploads**: Use the `/api/import/upload` endpoint which handles Vercel Blob storage. Don't process large files client-side.

4. **AI Features**: Only available for Pro/Enterprise tiers. Always check user tier before calling OpenAI API.

5. **Share Links**: Generated with nanoid, stored with expiration. Public access through `/share/[shareId]` route.

## Recent Major Features

1. **Import System**: Complete implementation for ChatGPT, Claude, Gemini, Cline, and Cursor with file upload support via Vercel Blob.

2. **AI-Powered Onboarding**: Smart prompt suggestions during user setup using OpenAI API.

3. **Version Control**: Git-like system tracking all prompt changes with rollback capability.

4. **Team Collaboration**: Invite system with email notifications (not yet fully implemented).

## Environment Variables

Required variables are documented in `.env.example`. Critical ones:
- `DATABASE_URL`: Must be the pooled connection string
- `CLERK_SECRET_KEY`: For authentication
- `OPENAI_API_KEY`: For AI features
- `STRIPE_WEBHOOK_SECRET`: For subscription management

## Development Workflow

1. Always run `npm run dev` for local development
2. Test database changes with `npm run db:studio`
3. Use `npm run db:push` for schema updates (development)
4. Create proper migrations with `npm run db:generate` (production)
5. Deploy with `vercel --prod` or through GitHub integration