# PromptVault Deployment Guide

## Prerequisites

Before deploying PromptVault, ensure you have:

1. **Stripe Account**: Create products and prices in your Stripe Dashboard
2. **Clerk Account**: Set up your authentication
3. **Neon Database**: PostgreSQL database set up
4. **OpenAI API Key**: For AI optimization features
5. **Vercel Account**: For deployment

## Environment Variables

Create a `.env.local` file with these variables:

```bash
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key

# Neon Database
DATABASE_URL=your_neon_pooled_connection_url
POSTGRES_URL=your_neon_pooled_connection_url

# OpenAI
OPENAI_API_KEY=your_openai_api_key

# Stripe
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_feUTuTFfliVnBf3NwLFw0KnbSqWnbfa0
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_PRO_PRICE_ID=price_1RlXaFG48MbDPfJlDHIs7KdQ
STRIPE_ENTERPRISE_PRICE_ID=price_1RlXaGG48MbDPfJl05xAbzV5

# App URL
NEXT_PUBLIC_APP_URL=https://aipromptvault.app
```

## Stripe Setup (Already Configured)

1. **Products Created**:
   - Pro Plan ($9/month): Product ID: prod_SgvRtycGt2k5UT
   - Enterprise Plan ($29/month): Product ID: prod_SgvRxzqeGaePDa

2. **Price IDs**:
   - Pro: price_1RlXaFG48MbDPfJlDHIs7KdQ
   - Enterprise: price_1RlXaGG48MbDPfJl05xAbzV5

3. **Webhook Configured**:
   - Endpoint: `https://aipromptvault.app/api/webhooks/stripe`
   - Events: checkout.session.completed, customer.subscription.updated, customer.subscription.deleted
   - Secret: Configured in environment variables

## Database Setup

Run the migration to set up your database schema:

```bash
npm run db:push
```

## Deployment Steps

1. **Push to GitHub**:
   ```bash
   git add .
   git commit -m "Initial deployment"
   git push origin main
   ```

2. **Deploy to Vercel**:
   - Connect your GitHub repository to Vercel
   - Add all environment variables in Vercel dashboard
   - Deploy

3. **Post-Deployment**:
   - Test authentication flow
   - Test Stripe checkout
   - Test AI optimization (Pro/Enterprise only)
   - Test sharing functionality

## Important Notes

- **Stripe Webhook Secret**: Must be set for subscription management to work
- **Database Migrations**: Run `npm run db:push` after any schema changes
- **API Keys Security**: Never commit API keys to version control
- **Tier Limits**: 
  - Free: 50 prompts, no AI features
  - Pro: Unlimited prompts, AI features, 5 team members
  - Enterprise: Everything in Pro + unlimited team members

## Troubleshooting

- **Stripe Webhook Errors**: Check webhook secret is correct
- **Database Connection**: Ensure using pooled connection URL
- **Auth Issues**: Verify Clerk keys and domain configuration
- **AI Features Not Working**: Check OpenAI API key and user tier