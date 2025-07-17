# PromptVault

AI-powered enterprise-grade prompt management platform for storing, organizing, versioning, and optimizing prompts for large language models.

🚀 **Live at**: [aipromptvault.app](https://aipromptvault.app)

## Features

### Core Functionality
- 🔐 **Secure Authentication** - Enterprise-grade auth with Clerk
- 📝 **Prompt Management** - Create, edit, organize, and search prompts
- 🔄 **Version Control** - Git-like versioning with complete history tracking
- 📁 **Smart Organization** - Folders, tags, and AI-powered categorization
- 🤖 **AI Optimization** - Enhance prompts with OpenAI integration (Pro/Enterprise)
- 🔗 **Secure Sharing** - Generate shareable links with expiration controls
- 📥 **Multi-Platform Import** - Import from ChatGPT, Claude, Gemini, Cline, and Cursor

### Advanced Features
- 💡 **AI-Powered Onboarding** - Smart prompt suggestions based on your role
- 📊 **Prompt Templates** - Reusable templates for common use cases
- 👥 **Team Collaboration** - Invite team members and manage permissions (Pro/Enterprise)
- 🎯 **Smart Categorization** - AI-powered organization during import
- 🔍 **Advanced Search** - Full-text search across all prompts
- 📱 **Responsive Design** - Works seamlessly on desktop and mobile

## Tech Stack

- **Framework**: Next.js 15.4.1 with App Router and React 19
- **Database**: Neon PostgreSQL with Drizzle ORM
- **Authentication**: Clerk (Production Instance)
- **Payments**: Stripe (Subscription Management)
- **AI Integration**: OpenAI API
- **File Storage**: Vercel Blob
- **Styling**: Tailwind CSS v4 with Framer Motion
- **Deployment**: Vercel with Edge Functions

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL database (Neon recommended)
- Accounts for: Clerk, Stripe, OpenAI, Vercel

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/NimdaNona/promptvault.git
   cd promptvault
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   ```bash
   cp .env.example .env.local
   ```
   
   Edit `.env.local` with your credentials:
   ```env
   # Clerk Authentication
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
   CLERK_SECRET_KEY=sk_test_...
   
   # Database (use pooled connection)
   DATABASE_URL=postgresql://...?sslmode=require
   
   # OpenAI
   OPENAI_API_KEY=sk-...
   
   # Stripe
   STRIPE_SECRET_KEY=sk_test_...
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
   ```

4. **Set up the database**:
   ```bash
   npm run db:push
   ```

5. **Run the development server**:
   ```bash
   npm run dev
   ```

6. **Open** [http://localhost:3000](http://localhost:3000)

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── api/               # API endpoints
│   ├── dashboard/         # Main application UI
│   ├── onboarding/        # User onboarding flow
│   └── (auth)/           # Authentication pages
├── components/            # React components
│   ├── dashboard/        # Dashboard components
│   ├── import-dialog/    # Import system UI
│   └── ui/               # Base UI components
├── lib/                   # Core utilities
│   ├── db/               # Database schema and connection
│   ├── importers/        # Platform-specific parsers
│   └── ai/               # AI integration utilities
└── middleware.ts          # Authentication middleware
```

## Features by Tier

### Free Tier
- ✅ Up to 50 prompts
- ✅ Basic organization (folders & tags)
- ✅ Version history
- ✅ Import from all platforms
- ✅ Public sharing

### Pro Tier ($9/month)
- ✅ Everything in Free
- ✅ **Unlimited prompts**
- ✅ AI-powered optimization
- ✅ Smart categorization
- ✅ Team collaboration (up to 5 members)
- ✅ Priority support

### Enterprise Tier ($29/month)
- ✅ Everything in Pro
- ✅ **Unlimited team members**
- ✅ Advanced analytics
- ✅ Custom integrations
- ✅ Dedicated support
- ✅ SLA guarantees

## Import System

PromptVault supports importing from multiple platforms:

- **ChatGPT**: Export your conversations from ChatGPT settings
- **Claude**: Import from Claude app or Claude Code (VS Code)
- **Gemini**: Import Google AI Studio exports
- **Cline**: Import VSCode Cline extension chat logs
- **Cursor**: Import from Cursor IDE
- **Generic Files**: Import JSON or text files

All imports feature:
- Automatic duplicate detection
- AI-powered categorization (Pro/Enterprise)
- Bulk processing with progress tracking
- Smart naming and organization

## Development

### Available Scripts

```bash
npm run dev          # Start development server with Turbopack
npm run build        # Production build
npm run start        # Start production server
npm run lint         # Run ESLint

# Database commands
npm run db:generate  # Generate Drizzle migrations
npm run db:push      # Push schema changes (development)
npm run db:migrate   # Run migrations (production)
npm run db:studio    # Open Drizzle Studio
```

### Key Development Features

- **Hot Reload**: Fast refresh with Turbopack
- **Type Safety**: Full TypeScript coverage
- **Database GUI**: Drizzle Studio for data management
- **API Testing**: Built-in API route testing
- **Error Handling**: Comprehensive error boundaries

## API Documentation

PromptVault provides a RESTful API for all operations. See [API Documentation](./docs/API.md) for details.

Key endpoints:
- `/api/prompts` - CRUD operations for prompts
- `/api/import/*` - Import from various platforms
- `/api/optimize` - AI-powered prompt optimization
- `/api/share` - Create shareable links

## Deployment

The application is deployed on Vercel with:
- Automatic deployments from GitHub
- Preview deployments for PRs
- Edge functions for optimal performance
- Integrated monitoring and analytics

See [Deployment Guide](./docs/DEPLOYMENT.md) for detailed instructions.

## Documentation

- [Architecture Overview](./docs/ARCHITECTURE.md)
- [API Documentation](./docs/API.md)
- [Database Schema](./docs/DATABASE.md)
- [Deployment Guide](./docs/DEPLOYMENT.md)
- [Development Setup](./docs/DEVELOPMENT.md)
- [Import System](./docs/IMPORT_SYSTEM.md)

## Contributing

This is currently a private project. For feature requests or bug reports, please contact the repository owner.

## Security

- All data is encrypted in transit and at rest
- Authentication handled by Clerk
- Payment processing secured by Stripe
- Regular security audits and updates

Report security vulnerabilities to: security@aipromptvault.app

## License

Copyright © 2024 PromptVault. All rights reserved.

Private and confidential. Unauthorized copying or distribution is strictly prohibited.

---

Built with ❤️ using Next.js, PostgreSQL, and AI