# PromptVault Deployment Guide

## Overview

PromptVault is deployed at `aipromptvault.app` using Vercel with Neon PostgreSQL, Clerk authentication, and Stripe payments. This guide covers all deployment aspects, from initial setup to production maintenance.

## Prerequisites

Before deploying PromptVault, ensure you have accounts and access to:

1. **Vercel**: For hosting and deployment
2. **Neon Database**: PostgreSQL database with connection pooling
3. **Clerk**: Authentication and user management (production instance)
4. **Stripe**: Payment processing (products already configured)
5. **OpenAI**: API access for AI features
6. **Vercel Blob**: File storage for imports (automatically provisioned)
7. **GitHub**: For repository and CI/CD

## Environment Variables

Create a `.env.local` file with these required variables:

```bash
# Clerk Authentication (Production)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_Y2xlcmsuYWlwcm9tcHR2YXVsdC5hcHAk
CLERK_SECRET_KEY=sk_live_36QkcgfkvrEP7JEAEsnmwX3hr2MFUZVp7PzLIjCK4X
CLERK_WEBHOOK_SECRET=whsec_[obtain_from_clerk_dashboard]

# Neon Database (Use pooled connection for app)
DATABASE_URL=postgresql://[user]:[password]@[host]/[database]?sslmode=require
DATABASE_URL_UNPOOLED=postgresql://[user]:[password]@[host]/[database]?sslmode=require

# OpenAI
OPENAI_API_KEY=sk-[your_openai_api_key]

# Stripe (Production)
STRIPE_SECRET_KEY=sk_live_[your_stripe_secret_key]
STRIPE_WEBHOOK_SECRET=whsec_feUTuTFfliVnBf3NwLFw0KnbSqWnbfa0
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_[your_stripe_publishable_key]

# Stripe Price IDs (Already Configured)
STRIPE_PRO_PRICE_ID=price_1RlXaFG48MbDPfJlDHIs7KdQ        # $9/month
STRIPE_ENTERPRISE_PRICE_ID=price_1RlXaGG48MbDPfJl05xAbzV5  # $29/month

# App URL
NEXT_PUBLIC_APP_URL=https://aipromptvault.app
```

## Current Production Configuration

### 1. Domain & DNS Configuration

**Primary Domain**: `aipromptvault.app`

All required CNAME records are configured:
- `clerk.aipromptvault.app` → `frontend-api.clerk.services`
- `accounts.aipromptvault.app` → `accounts.clerk.services`
- `clkmail.aipromptvault.app` → `mail.ue53si84o1n0.clerk.services`
- DKIM records for email authentication

### 2. Clerk Production Instance

- **Instance ID**: `ins_2zxxRAVxx2LVyEGO61U9rZeCWun`
- **Environment**: Production
- **Frontend API**: `https://clerk.aipromptvault.app`
- **Accounts Portal**: `https://accounts.aipromptvault.app`

Features enabled:
- Enhanced email deliverability
- Progressive sign-up
- URL-based session syncing
- Custom branded auth pages

### 3. Stripe Configuration

Products and pricing are already created:

**Pro Plan** ($9/month)
- Product ID: `prod_SgvRtycGt2k5UT`
- Price ID: `price_1RlXaFG48MbDPfJlDHIs7KdQ`

**Enterprise Plan** ($29/month)
- Product ID: `prod_SgvRxzqeGaePDa`
- Price ID: `price_1RlXaGG48MbDPfJl05xAbzV5`

Webhook endpoint: `https://aipromptvault.app/api/webhooks/stripe`
Events configured:
- `checkout.session.completed`
- `customer.subscription.updated`
- `customer.subscription.deleted`

### 4. Database Architecture

Using Neon PostgreSQL with connection pooling:
- **Pooled connection**: Used by the application (`DATABASE_URL`)
- **Unpooled connection**: Used for migrations only
- **Important**: Always use pooled connection in application code

## Deployment Steps

### 1. Initial Setup

```bash
# Clone repository
git clone https://github.com/NimdaNona/promptvault.git
cd promptvault

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your values
```

### 2. Database Setup

```bash
# Generate database schema
npm run db:generate

# Push schema to database (development)
npm run db:push

# For production, use migrations
npm run db:migrate
```

### 3. Vercel Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy to production
vercel --prod
```

Or use GitHub integration:
1. Connect repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### 4. Post-Deployment Tasks

1. **Configure Clerk Webhook**:
   - Go to Clerk Dashboard → Webhooks
   - Create endpoint: `https://aipromptvault.app/api/webhooks/clerk`
   - Select events: `user.created`, `user.updated`, `user.deleted`
   - Copy webhook secret to environment variables

2. **Verify Stripe Webhook**:
   - Test webhook endpoint with Stripe CLI
   - Ensure subscription events are processed correctly

3. **Test Critical Flows**:
   - User registration and onboarding
   - Stripe checkout (Pro/Enterprise plans)
   - Import functionality (all sources)
   - AI optimization features

## Production Checklist

### Pre-Deployment
- [ ] All environment variables configured
- [ ] Database migrations tested
- [ ] Stripe products and webhooks configured
- [ ] Clerk authentication tested
- [ ] DNS records properly configured

### Deployment
- [ ] Deploy to Vercel
- [ ] Run database migrations
- [ ] Verify environment variables
- [ ] Check build logs for errors

### Post-Deployment
- [ ] Test authentication flow
- [ ] Test payment processing
- [ ] Verify import functionality
- [ ] Check AI features (Pro/Enterprise)
- [ ] Monitor error logs
- [ ] Set up monitoring alerts

## Monitoring & Maintenance

### Key Metrics to Monitor

1. **Application Health**:
   - Response times
   - Error rates
   - API endpoint performance

2. **Database Performance**:
   - Connection pool usage
   - Query performance
   - Storage usage

3. **User Metrics**:
   - Sign-up conversion
   - Import success rates
   - Feature usage

### Regular Maintenance Tasks

1. **Weekly**:
   - Review error logs
   - Check webhook delivery rates
   - Monitor database performance

2. **Monthly**:
   - Review and optimize slow queries
   - Update dependencies
   - Audit security settings

3. **Quarterly**:
   - Review tier limits and usage
   - Update documentation
   - Performance optimization

## Troubleshooting

### Common Issues and Solutions

1. **Database Connection Errors**:
   ```
   Error: No transactions support in neon-http driver
   ```
   **Solution**: Ensure using pooled connection URL (`DATABASE_URL`)

2. **Clerk Webhook Failures**:
   - Verify webhook secret in environment variables
   - Check Vercel function logs: `/api/webhooks/clerk`
   - Ensure webhook endpoint is publicly accessible

3. **Stripe Payment Issues**:
   - Verify webhook secret is correct
   - Check Stripe dashboard for failed events
   - Ensure price IDs match environment variables

4. **Import Failures**:
   - Check Vercel Blob storage limits
   - Verify file size limits (10MB max)
   - Monitor rate limiting for AI categorization

5. **AI Features Not Working**:
   - Verify OpenAI API key
   - Check user tier (Pro/Enterprise only)
   - Monitor OpenAI rate limits

### Debug Commands

```bash
# Check Vercel logs
vercel logs

# Test database connection
npm run db:studio

# Verify environment variables
vercel env pull

# Test webhooks locally
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

## Security Considerations

1. **API Keys**:
   - Never commit secrets to version control
   - Rotate keys regularly
   - Use environment variables exclusively

2. **Database Security**:
   - Use connection pooling
   - Enable SSL for all connections
   - Regular security audits

3. **Authentication**:
   - Clerk handles security updates
   - Monitor for suspicious activity
   - Regular session cleanup

4. **File Uploads**:
   - Vercel Blob handles security
   - File size limits enforced
   - Content validation on import

## Scaling Considerations

1. **Database Scaling**:
   - Monitor connection pool usage
   - Consider read replicas for heavy loads
   - Optimize expensive queries

2. **API Rate Limiting**:
   - Implement request throttling
   - Cache AI responses when possible
   - Use queue for bulk operations

3. **File Storage**:
   - Monitor Vercel Blob usage
   - Implement cleanup for old imports
   - Consider CDN for static assets

## Backup and Recovery

1. **Database Backups**:
   - Neon provides automatic backups
   - Test restore procedures regularly
   - Document recovery steps

2. **Code Backups**:
   - GitHub repository as primary backup
   - Tag releases for easy rollback
   - Document deployment history

## Support and Resources

- **Vercel Support**: https://vercel.com/support
- **Neon Documentation**: https://neon.tech/docs
- **Clerk Documentation**: https://clerk.com/docs
- **Stripe Documentation**: https://stripe.com/docs
- **Project Repository**: https://github.com/NimdaNona/promptvault