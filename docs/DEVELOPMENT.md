# PromptVault Development Guide

## Overview

This guide covers everything you need to know to set up and develop PromptVault locally. The project uses Next.js 15 with TypeScript, Neon PostgreSQL, and various third-party services.

## Prerequisites

### Required Software
- **Node.js** 18.17 or higher
- **npm** 9.0 or higher
- **Git** for version control
- **VS Code** (recommended) or your preferred IDE

### Required Accounts
1. **GitHub** - For code repository access
2. **Neon** - PostgreSQL database (free tier available)
3. **Clerk** - Authentication service (free development tier)
4. **Stripe** - Payment processing (test mode for development)
5. **OpenAI** - AI features (API key required)
6. **Vercel** - Deployment and blob storage (optional for local dev)

## Initial Setup

### 1. Clone the Repository

```bash
git clone https://github.com/NimdaNona/promptvault.git
cd promptvault
```

### 2. Install Dependencies

```bash
npm install
```

This will install all required packages including:
- Next.js and React
- Drizzle ORM
- Clerk authentication
- Stripe SDK
- UI components and utilities

### 3. Environment Configuration

Create a `.env.local` file in the root directory:

```bash
cp .env.example .env.local
```

Configure the following environment variables:

#### Clerk Authentication (Development)
```env
# Get from Clerk Dashboard > API Keys
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Optional: Configure webhooks for user sync
CLERK_WEBHOOK_SECRET=whsec_...
```

#### Database Configuration
```env
# Neon PostgreSQL - Use pooled connection string
DATABASE_URL=postgresql://user:password@host/database?sslmode=require

# Unpooled connection for migrations only
DATABASE_URL_UNPOOLED=postgresql://user:password@host/database?sslmode=require
```

#### OpenAI Configuration
```env
# Get from OpenAI Platform
OPENAI_API_KEY=sk-...
```

#### Stripe Configuration (Test Mode)
```env
# Get from Stripe Dashboard > Developers > API Keys
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Create test products in Stripe Dashboard
STRIPE_PRO_PRICE_ID=price_...
STRIPE_ENTERPRISE_PRICE_ID=price_...

# For webhook testing (use Stripe CLI)
STRIPE_WEBHOOK_SECRET=whsec_...
```

#### Application URLs
```env
# For local development
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Database Setup

#### Create Database Schema

For initial setup or schema changes:
```bash
npm run db:push
```

For production-style migrations:
```bash
npm run db:generate  # Generate migration files
npm run db:migrate   # Apply migrations
```

#### Explore Database

Open Drizzle Studio to view and manage data:
```bash
npm run db:studio
```

This opens a GUI at `https://local.drizzle.studio`

### 5. Stripe Setup

#### Create Test Products

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/test/products)
2. Create two products:
   - **Pro Plan** - $9/month
   - **Enterprise Plan** - $29/month
3. Copy the price IDs to your `.env.local`

#### Test Webhooks Locally

Install Stripe CLI:
```bash
# macOS
brew install stripe/stripe-cli/stripe

# Windows
scoop install stripe

# Linux
curl -s https://packages.stripe.com/api/security/keypair/stripe-cli-gpg/public | gpg --dearmor | sudo tee /usr/share/keyrings/stripe.gpg
```

Forward webhooks to local server:
```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

## Development Workflow

### 1. Start Development Server

```bash
npm run dev
```

This starts the Next.js development server with Turbopack at `http://localhost:3000`

Features:
- Fast refresh for React components
- API route hot reloading
- TypeScript type checking
- Error overlay for debugging

### 2. Development Tools

#### VS Code Extensions (Recommended)
- **Tailwind CSS IntelliSense** - Autocomplete for Tailwind classes
- **Prisma** - Syntax highlighting for schema files
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **GitLens** - Git integration

#### Browser Extensions
- **React Developer Tools** - Component inspection
- **Clerk DevTools** - Auth debugging

### 3. Code Structure

```
src/
├── app/                    # Next.js pages and API routes
│   ├── api/               # Backend endpoints
│   ├── dashboard/         # Protected app pages
│   └── (auth)/           # Public auth pages
├── components/            # Reusable React components
│   ├── ui/               # Base UI components
│   └── [feature]/        # Feature-specific components
├── lib/                   # Core business logic
│   ├── db/               # Database schema and queries
│   ├── importers/        # Import system parsers
│   └── utils/            # Helper functions
└── middleware.ts          # Route protection
```

### 4. Common Development Tasks

#### Adding a New API Route

Create a new file in `src/app/api/[endpoint]/route.ts`:

```typescript
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { z } from "zod";

// Define input schema
const inputSchema = z.object({
  name: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    // 1. Check authentication
    const { userId } = await auth();
    if (!userId) {
      return new Response("Unauthorized", { status: 401 });
    }

    // 2. Validate input
    const body = await req.json();
    const input = inputSchema.parse(body);

    // 3. Database operation
    const result = await db.transaction(async (tx) => {
      // Your logic here
    });

    // 4. Return response
    return Response.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      );
    }
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
```

#### Adding a New Database Table

1. Edit `src/lib/db/schema.ts`:
```typescript
export const newTable = pgTable('new_table', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  userId: text('user_id').notNull().references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
```

2. Generate and apply migration:
```bash
npm run db:generate
npm run db:push  # for development
```

#### Creating a New Component

Use consistent patterns for components:

```typescript
// src/components/feature/new-component.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface NewComponentProps {
  title: string;
  onAction: () => void;
}

export function NewComponent({ title, onAction }: NewComponentProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    setIsLoading(true);
    try {
      await onAction();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <h2>{title}</h2>
      <Button onClick={handleClick} disabled={isLoading}>
        {isLoading ? "Loading..." : "Click Me"}
      </Button>
    </div>
  );
}
```

## Testing

### Manual Testing Checklist

1. **Authentication Flow**
   - Sign up with email
   - Sign in/out
   - Password reset
   - Session persistence

2. **Prompt Management**
   - Create/edit/delete prompts
   - Folder organization
   - Tag management
   - Search functionality

3. **Import System**
   - Test each import source
   - Verify duplicate detection
   - Check AI categorization

4. **Billing Flow**
   - Stripe checkout
   - Subscription management
   - Tier enforcement

### Automated Testing (Planned)

```bash
npm run test        # Run unit tests
npm run test:e2e    # Run E2E tests
```

## Debugging

### Common Issues and Solutions

#### 1. Database Connection Errors
```
Error: No transactions support in neon-http driver
```
**Solution**: Ensure you're using the pooled connection URL (`DATABASE_URL`)

#### 2. Clerk Authentication Issues
- Clear browser cookies
- Check Clerk dashboard for errors
- Verify environment variables
- Test in incognito mode

#### 3. Stripe Webhook Failures
- Ensure webhook forwarding is active
- Check webhook secret matches
- Verify event types are configured
- Review Stripe CLI output

#### 4. TypeScript Errors
```bash
# Regenerate types
npm run build

# Check for type errors
npx tsc --noEmit
```

### Debug Tools

1. **Next.js Debug Mode**
```bash
NODE_OPTIONS='--inspect' npm run dev
```

2. **Database Queries**
```typescript
// Enable query logging
const result = await db.query.users.findFirst({
  where: eq(users.id, userId),
});
console.log(result);
```

3. **API Route Testing**
```bash
# Test with curl
curl -X POST http://localhost:3000/api/prompts \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Prompt"}'
```

## Performance Optimization

### Development Best Practices

1. **Use React Server Components** where possible
2. **Implement proper loading states**
3. **Optimize database queries** with proper indexes
4. **Use dynamic imports** for large components
5. **Implement error boundaries** for robustness

### Monitoring Performance

```typescript
// Add performance logging
console.time('operation');
// ... your code
console.timeEnd('operation');
```

## Git Workflow

### Branch Strategy
- `main` - Production-ready code
- `develop` - Integration branch
- `feature/*` - New features
- `fix/*` - Bug fixes

### Commit Convention
```bash
feat: Add new import dialog
fix: Resolve database connection issue
docs: Update API documentation
style: Format code with Prettier
refactor: Optimize prompt query
test: Add import system tests
```

## Deployment

### Preview Deployments
Push to a branch to get a preview URL from Vercel

### Production Deployment
```bash
# Deploy to production
vercel --prod

# Or merge to main for automatic deployment
git push origin main
```

## Resources

### Documentation
- [Next.js Docs](https://nextjs.org/docs)
- [Drizzle ORM Docs](https://orm.drizzle.team)
- [Clerk Docs](https://clerk.com/docs)
- [Stripe Docs](https://stripe.com/docs)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)

### Support
- GitHub Issues for bug reports
- Discord community (coming soon)
- Email: support@aipromptvault.app

## Tips for New Developers

1. **Start with the README** to understand the project
2. **Run the app locally** before making changes
3. **Use TypeScript** strictly for type safety
4. **Follow existing patterns** in the codebase
5. **Test thoroughly** before submitting PRs
6. **Document your changes** in code and PRs
7. **Ask questions** when unsure