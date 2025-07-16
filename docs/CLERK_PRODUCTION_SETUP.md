# Clerk Production Setup Guide

## Production Instance Details
- **Instance ID**: `ins_2zxxRAVxx2LVyEGO61U9rZeCWun`
- **Environment**: Production
- **Domain**: `aipromptvault.app`
- **Frontend API**: `https://clerk.aipromptvault.app`
- **Accounts Portal**: `https://accounts.aipromptvault.app`

## ✅ Completed Configurations

### 1. **Instance Settings**
   - Production mode active
   - Enhanced email deliverability enabled
   - Progressive sign-up enabled
   - From email: `noreply@clerk.aipromptvault.app`
   - Support email: `support@aipromptvault.app`
   - URL-based session syncing enabled

### 2. **Domain Configuration**
   - Primary domain: `aipromptvault.app`
   - All required CNAME records configured:
     - `clerk.aipromptvault.app` → `frontend-api.clerk.services`
     - `accounts.aipromptvault.app` → `accounts.clerk.services`
     - `clkmail.aipromptvault.app` → `mail.ue53si84o1n0.clerk.services`
     - DKIM records for email authentication

### 3. **Allowed Origins**
   - Production: `https://aipromptvault.app`
   - Development: `http://localhost:3000`

### 4. **Redirect URLs**
   All necessary redirect URLs have been whitelisted:
   - `https://aipromptvault.app/` (root)
   - `https://aipromptvault.app/dashboard`
   - `https://aipromptvault.app/onboarding`
   - `https://aipromptvault.app/sign-in`
   - `https://aipromptvault.app/sign-up`
   - `http://localhost:3000/` (and all equivalent paths)

### 5. **Custom Authentication Pages**
   - Sign-in: `/sign-in` - Custom branded page
   - Sign-up: `/sign-up` - Custom branded page
   - Onboarding: `/onboarding` - User setup flow

### 6. **Middleware & Routing**
   - Protected routes: `/dashboard`, `/prompts`, `/settings`, `/api/*`
   - Public routes: `/`, `/sign-in`, `/sign-up`, `/api/webhooks`, `/share`
   - Security headers implemented

### 7. **Webhook Configuration**
   - Svix app created for webhook management
   - Endpoint ready at: `/api/webhooks/clerk`
   - Handles: `user.created`, `user.updated`, `user.deleted`

### 8. **Environment Variables**
   Production keys are already set in `.env.local`:
   ```
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_Y2xlcmsuYWlwcm9tcHR2YXVsdC5hcHAk
   CLERK_SECRET_KEY=sk_live_36QkcgfkvrEP7JEAEsnmwX3hr2MFUZVp7PzLIjCK4X
   ```

## 📋 Required Manual Steps

### 1. Configure Webhook Secret in Clerk Dashboard

1. Go to the Svix Dashboard URL:
   ```
   https://app.svix.com/login?primaryColor=6c47ff&fontFamily=Inter#key=eyJhcHBJZCI6ImFwcF8yenk1dE1hU0pHVTFaSUFtd1RsdFNVb1l5RGciLCJvbmVUaW1lVG9rZW4iOiJERjRRQ0NmRmxrV0tjUG1TOTBTVERCdW9lYm5CaUtWZCIsInJlZ2lvbiI6ImV1In0=
   ```

2. Create a new endpoint:
   - URL: `https://aipromptvault.app/api/webhooks/clerk`
   - Message Types: Select all user events
   
3. Copy the **Signing Secret**

4. Add to `.env.local`:
   ```
   CLERK_WEBHOOK_SECRET=whsec_your_webhook_secret_here
   ```

5. Add the same to Vercel environment variables

### 2. Configure Social Authentication (Optional)

To enable Google Sign-In:
1. Go to Clerk Dashboard > **User & Authentication** > **Social Connections**
2. Enable **Google**
3. Add redirect URLs:
   - `https://clerk.aipromptvault.app/v1/oauth_callback`
   - `https://accounts.aipromptvault.app/sign-in/oauth_callback`

To enable GitHub Sign-In:
1. Enable **GitHub** in Social Connections
2. Add the same redirect URLs as above

### 3. Verify DNS Configuration

Ensure all CNAME records are properly configured:
```bash
# Check each subdomain
nslookup clerk.aipromptvault.app
nslookup accounts.aipromptvault.app
nslookup clkmail.aipromptvault.app
```

## 🧪 Verification Steps

1. **Test Authentication Flow**:
   - Sign up: `https://aipromptvault.app/sign-up`
   - Sign in: `https://aipromptvault.app/sign-in`
   - Verify onboarding redirect works

2. **Test Webhook Integration**:
   - Create a test user
   - Check database for user record
   - Verify webhook logs in Svix dashboard

3. **Test Email Delivery**:
   - Request password reset
   - Check email delivery (including spam folder)

## 🔧 Troubleshooting

### Users Not Syncing to Database
1. Verify webhook endpoint is accessible
2. Check `CLERK_WEBHOOK_SECRET` in Vercel
3. Review Vercel function logs: `/api/webhooks/clerk`
4. Check Svix dashboard for failed deliveries

### Authentication Redirect Issues
1. Ensure all redirect URLs are whitelisted
2. Check middleware configuration
3. Verify `NEXT_PUBLIC_APP_URL` is set correctly

### Email Delivery Problems
1. Verify DKIM records are configured
2. Check Clerk email logs in dashboard
3. Consider using custom SMTP if needed

## 🚀 Next Steps

1. Complete webhook secret configuration
2. Test full authentication flow in production
3. Monitor webhook delivery success rate
4. Consider enabling additional authentication methods
5. Customize email templates to match brand