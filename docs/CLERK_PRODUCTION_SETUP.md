# Clerk Production Setup Guide

## Current Status

The following Clerk production configurations have been completed:

1. **Test Mode Disabled** ✅
   - Production mode is now active

2. **Custom Sign-in/Sign-up Pages** ✅
   - Created at `/sign-in` and `/sign-up`
   - Styled to match PromptVault branding
   - Configured with proper redirect URLs

3. **Allowed Origins** ✅
   - Added: `https://aipromptvault.app`
   - Added: `http://localhost:3000`

4. **Email Configuration** ✅
   - Enhanced email deliverability enabled
   - From email: `noreply@clerk.aipromptvault.app`

5. **Middleware Configuration** ✅
   - Protected routes configured
   - Public routes properly defined
   - Security headers added

## Required Manual Steps

### 1. Configure Webhook Secret

1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Navigate to **Webhooks** section
3. Click **Add Endpoint**
4. Enter endpoint URL: `https://aipromptvault.app/api/webhooks/clerk`
5. Select events:
   - `user.created`
   - `user.updated`  
   - `user.deleted`
6. Copy the **Signing Secret**
7. Add to `.env.local`:
   ```
   CLERK_WEBHOOK_SECRET=your_webhook_secret_here
   ```
8. Add to Vercel environment variables

### 2. Update Production Keys (If Needed)

If you're using test keys in production:

1. Go to Clerk Dashboard > **API Keys**
2. Switch to **Production** instance
3. Copy production keys
4. Update in Vercel:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `CLERK_SECRET_KEY`

### 3. Configure OAuth Providers (Optional)

To add social login:

1. Go to **User & Authentication** > **Social Connections**
2. Enable desired providers (Google, GitHub, etc.)
3. Add OAuth redirect URLs for each provider

### 4. Email Templates (Optional)

Customize email templates:

1. Go to **Customization** > **Emails**
2. Customize templates for:
   - Sign up
   - Sign in
   - Password reset
   - Email verification

## Verification Steps

After completing setup:

1. Test sign up flow at `https://aipromptvault.app/sign-up`
2. Test sign in flow at `https://aipromptvault.app/sign-in`
3. Verify webhook events in Clerk Dashboard > Webhooks > Logs
4. Check user sync in database after sign up

## Troubleshooting

### Users Not Syncing to Database

1. Check webhook logs in Clerk Dashboard
2. Verify `CLERK_WEBHOOK_SECRET` is set correctly
3. Check Vercel function logs for `/api/webhooks/clerk`

### Authentication Issues

1. Ensure production keys are used
2. Verify allowed origins include your domain
3. Check middleware configuration

### Email Delivery Issues

If emails aren't delivering:
1. Enhanced email deliverability is already enabled
2. Check spam folders
3. Consider custom domain setup in Clerk