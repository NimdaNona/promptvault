#!/bin/bash

# Deployment script for Cline Import Feature
# This script handles the safe rollout of the Cline import feature

set -e

echo "🚀 Starting Cline Import Feature Deployment"
echo "=========================================="

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo -e "${RED}Error: Vercel CLI is not installed${NC}"
    echo "Please install it with: npm i -g vercel"
    exit 1
fi

# Function to check if user wants to proceed
confirm() {
    read -p "$1 (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}Deployment cancelled${NC}"
        exit 1
    fi
}

# Step 1: Run pre-deployment checks
echo -e "\n${YELLOW}Step 1: Running pre-deployment checks${NC}"

echo "Checking TypeScript compilation..."
npm run typecheck
if [ $? -ne 0 ]; then
    echo -e "${RED}TypeScript errors found. Please fix before deploying.${NC}"
    exit 1
fi

echo "Running linter..."
npm run lint
if [ $? -ne 0 ]; then
    echo -e "${RED}Linting errors found. Please fix before deploying.${NC}"
    exit 1
fi

echo "Building project..."
npm run build
if [ $? -ne 0 ]; then
    echo -e "${RED}Build failed. Please fix before deploying.${NC}"
    exit 1
fi

echo -e "${GREEN}✓ All pre-deployment checks passed${NC}"

# Step 2: Deploy to preview environment
echo -e "\n${YELLOW}Step 2: Deploying to preview environment${NC}"
confirm "Deploy to Vercel preview?"

echo "Deploying to preview..."
PREVIEW_URL=$(vercel --no-clipboard 2>&1 | grep -o 'https://[^ ]*')

if [ -z "$PREVIEW_URL" ]; then
    echo -e "${RED}Failed to get preview URL${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Preview deployed at: $PREVIEW_URL${NC}"

# Step 3: Run post-deployment tests
echo -e "\n${YELLOW}Step 3: Post-deployment verification${NC}"
echo "Please test the following on the preview URL:"
echo "1. ✓ Cline import option appears on /import page"
echo "2. ✓ File upload works correctly"
echo "3. ✓ Folder scanning works correctly"
echo "4. ✓ Error handling works as expected"
echo "5. ✓ Analytics are being tracked"
echo ""
confirm "Have you completed all tests successfully?"

# Step 4: Deploy to production with feature flag disabled
echo -e "\n${YELLOW}Step 4: Deploying to production (feature flag disabled)${NC}"
echo "The feature will be deployed but hidden behind a feature flag"
confirm "Deploy to production?"

# Set environment variable to disable feature initially
echo "Setting DISABLE_CLINE_IMPORT=true for initial deployment..."
vercel env add DISABLE_CLINE_IMPORT production <<< "true"

echo "Deploying to production..."
PROD_URL=$(vercel --prod --no-clipboard 2>&1 | grep -o 'https://[^ ]*')

if [ -z "$PROD_URL" ]; then
    echo -e "${RED}Failed to get production URL${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Production deployed at: $PROD_URL${NC}"
echo -e "${GREEN}✓ Feature is currently DISABLED via feature flag${NC}"

# Step 5: Enable feature for testing
echo -e "\n${YELLOW}Step 5: Feature flag configuration${NC}"
echo "To enable the feature:"
echo "1. Remove DISABLE_CLINE_IMPORT env var in Vercel dashboard"
echo "2. Or use the admin panel at /admin/feature-flags"
echo "3. Start with a small rollout percentage (e.g., 10%)"
echo "4. Monitor analytics at /admin/analytics/cline-imports"

# Step 6: Rollback instructions
echo -e "\n${YELLOW}Rollback Instructions${NC}"
echo "If issues arise:"
echo "1. Quick disable: Set DISABLE_CLINE_IMPORT=true in Vercel env vars"
echo "2. Full rollback: vercel rollback"
echo "3. Check logs: vercel logs"

echo -e "\n${GREEN}🎉 Deployment complete!${NC}"
echo "Next steps:"
echo "1. Monitor error rates and performance"
echo "2. Gradually increase rollout percentage"
echo "3. Collect user feedback"
echo "4. Plan next improvements"

# Create deployment record
TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")
echo "$TIMESTAMP - Cline Import Feature deployed to production (disabled)" >> deployments.log

echo -e "\n${GREEN}Deployment logged to deployments.log${NC}"