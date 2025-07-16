# PromptVault

AI-powered prompt management platform for storing, organizing, versioning, and optimizing prompts for large language models.

## Features

- 🔐 **Secure Authentication** - User accounts with Clerk
- 📝 **Prompt Management** - Create, edit, delete, and organize prompts
- 🔄 **Version Control** - Git-like versioning with history tracking
- 🤖 **AI Optimization** - Enhance prompts with OpenAI integration
- 👥 **Collaboration** - Share prompts with team members
- 💳 **Monetization** - Tiered pricing with Stripe integration
- 📊 **Analytics** - Track prompt usage and performance

## Tech Stack

- **Framework**: Next.js 14+ with App Router
- **Database**: Vercel Postgres with Drizzle ORM
- **Authentication**: Clerk
- **Payments**: Stripe
- **AI**: OpenAI API
- **Styling**: Tailwind CSS
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Accounts for: Clerk, Vercel, OpenAI, Stripe

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/NimdaNona/promptvault.git
   cd promptvault
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your API keys
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000)

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

## Project Structure

```
src/
├── app/              # Next.js App Router pages
├── components/       # React components
├── lib/             
│   ├── db/          # Database schema and connection
│   └── utils/       # Utility functions
├── hooks/           # Custom React hooks
└── middleware.ts    # Clerk authentication middleware
```

## Features Overview

### Free Tier
- Up to 50 prompts
- Basic organization with folders and tags
- Version history

### Pro Tier ($9/month)
- Unlimited prompts
- AI optimization
- Team collaboration
- Priority support

### Enterprise Tier ($29/month)
- Everything in Pro
- Advanced analytics
- Custom integrations
- Dedicated support

## Contributing

This is a private project. For issues or feature requests, please contact the repository owner.

## License

Private - All rights reserved