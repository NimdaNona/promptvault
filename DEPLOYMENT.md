# PromptVault Deployment Guide

## Prerequisites

Before deploying PromptVault, you'll need to set up the following services:

1. **Clerk Account** - For authentication
2. **Vercel Account** - For hosting and database
3. **OpenAI API Key** - For AI features
4. **Stripe Account** - For payments

## Environment Variables

Copy `.env.example` to `.env.local` and fill in all the required values:

```bash
cp .env.example .env.local
```

### Required Environment Variables:

1. **Clerk Authentication**
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - Get from Clerk Dashboard
   - `CLERK_SECRET_KEY` - Get from Clerk Dashboard
   - `CLERK_WEBHOOK_SECRET` - Create webhook endpoint in Clerk pointing to `/api/webhooks/clerk`

2. **Database (Vercel Postgres)**
   - Create a Postgres database in Vercel Dashboard
   - Copy all database URLs from the connection settings

3. **OpenAI**
   - `OPENAI_API_KEY` - Get from OpenAI Platform

4. **Stripe**
   - `STRIPE_SECRET_KEY` - Get from Stripe Dashboard
   - `STRIPE_WEBHOOK_SECRET` - Create webhook endpoint in Stripe
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Get from Stripe Dashboard

## Deployment Steps

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **Deploy to Vercel**
   ```bash
   vercel --prod
   ```

3. **Set Environment Variables in Vercel**
   - Go to your project in Vercel Dashboard
   - Navigate to Settings > Environment Variables
   - Add all variables from your `.env.local` file

4. **Run Database Migrations**
   ```bash
   npm run db:push
   ```

5. **Configure Webhooks**
   - Clerk: Set webhook URL to `https://your-app.vercel.app/api/webhooks/clerk`
   - Stripe: Set webhook URL to `https://your-app.vercel.app/api/webhooks/stripe`

## Post-Deployment

1. Test the authentication flow
2. Create a test prompt
3. Test the payment flow with Stripe test cards
4. Monitor logs in Vercel Dashboard

## Troubleshooting

- If build fails, check all environment variables are set correctly
- For database issues, ensure Vercel Postgres is properly configured
- For authentication issues, verify Clerk webhook is properly configured