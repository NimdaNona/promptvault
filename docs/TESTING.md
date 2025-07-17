# PromptVault Testing Guide

## Overview

This document outlines the testing strategy, tools, and best practices for PromptVault. While automated testing infrastructure is planned, current testing focuses on comprehensive manual testing and quality assurance practices.

## Testing Philosophy

Our testing approach prioritizes:
- **User experience** validation
- **Data integrity** assurance
- **Security** verification
- **Performance** monitoring
- **Cross-platform** compatibility

## Current Testing Status

### Implemented
- ✅ TypeScript type checking
- ✅ ESLint code quality checks
- ✅ Manual testing procedures
- ✅ Development environment testing
- ✅ Production smoke tests

### Planned
- 🚧 Unit tests with Jest
- 🚧 Integration tests
- 🚧 E2E tests with Playwright
- 🚧 Performance benchmarks
- 🚧 Security audits

## Manual Testing Procedures

### 1. Authentication Testing

#### Sign Up Flow
```
Test Case: New User Registration
1. Navigate to /sign-up
2. Enter valid email address
3. Create password (min 8 characters)
4. Verify email (check inbox)
5. Complete onboarding wizard
6. Confirm redirected to dashboard

Expected: User created, onboarding completed, tier set to 'free'
```

#### Sign In Flow
```
Test Case: Existing User Login
1. Navigate to /sign-in
2. Enter registered email
3. Enter correct password
4. Click sign in
5. Verify redirected to dashboard

Expected: Successful login, session created
```

#### Session Management
```
Test Case: Session Persistence
1. Sign in successfully
2. Close browser
3. Reopen and navigate to app
4. Verify still logged in

Expected: Session persists across browser restarts
```

### 2. Prompt Management Testing

#### CRUD Operations
```
Test Case: Create Prompt
1. Click "New Prompt" button
2. Fill in:
   - Name: "Test Prompt"
   - Content: "You are a helpful assistant..."
   - Model: GPT-4
   - Folder: "testing"
3. Click Save
4. Verify prompt appears in list

Expected: Prompt created, version 1 saved
```

```
Test Case: Edit Prompt
1. Open existing prompt
2. Modify content
3. Add change message
4. Save changes
5. Check version history

Expected: New version created, history preserved
```

```
Test Case: Delete Prompt
1. Select prompt
2. Click delete button
3. Confirm deletion
4. Verify removed from list

Expected: Prompt deleted, versions removed
```

#### Organization Features
```
Test Case: Folder Management
1. Create folder "Project A"
2. Create subfolder "Project A/Tasks"
3. Move prompt to folder
4. Filter by folder
5. Verify navigation

Expected: Folders created, prompts organized
```

```
Test Case: Tag System
1. Create tag "important"
2. Assign to multiple prompts
3. Filter by tag
4. Remove tag
5. Verify updates

Expected: Tags functional, filtering works
```

### 3. Import System Testing

#### Platform-Specific Imports

**ChatGPT Import Test**
```
1. Export data from ChatGPT
2. Click Import > ChatGPT
3. Upload conversations.json
4. Review extracted prompts
5. Confirm import
6. Verify prompts created

Files needed: Sample ChatGPT export
Expected: All user prompts imported
```

**Claude Import Test**
```
1. Test both JSON and JSONL formats
2. Upload multiple files
3. Check deduplication
4. Verify metadata preserved

Files needed: Claude exports
Expected: Successful multi-format import
```

**Bulk Import Test**
```
1. Prepare 50+ prompts
2. Upload via bulk import
3. Monitor progress
4. Check for errors
5. Verify all imported

Expected: Efficient bulk processing
```

### 4. AI Features Testing (Pro/Enterprise)

#### Prompt Optimization
```
Test Case: AI Enhancement
1. Select basic prompt
2. Click "Optimize with AI"
3. Review suggestions
4. Apply optimizations
5. Compare before/after

Expected: Improved prompt with scoring
```

#### Smart Categorization
```
Test Case: Auto-Categorization
1. Import uncategorized prompts
2. Enable AI categorization
3. Review assignments
4. Verify accuracy
5. Adjust as needed

Expected: Logical categorization applied
```

### 5. Sharing System Testing

#### Share Link Creation
```
Test Case: Public Sharing
1. Open prompt
2. Click "Share"
3. Set expiration (7 days)
4. Copy link
5. Test in incognito mode
6. Verify access without login

Expected: Public access works, expiration honored
```

### 6. Billing Testing

#### Subscription Flow
```
Test Case: Pro Upgrade
1. Click "Upgrade to Pro"
2. Enter test card: 4242 4242 4242 4242
3. Complete Stripe checkout
4. Return to app
5. Verify tier updated
6. Check feature access

Expected: Subscription active, limits removed
```

#### Webhook Testing
```
Test Case: Subscription Events
1. Use Stripe CLI to trigger events
2. Send checkout.session.completed
3. Verify user tier updated
4. Send subscription.deleted
5. Verify downgrade to free

Expected: Webhooks processed correctly
```

### 7. Performance Testing

#### Load Testing
```
Test Case: Large Dataset
1. Create 100+ prompts
2. Test search performance
3. Measure page load times
4. Check pagination
5. Monitor memory usage

Expected: <2s load times, smooth scrolling
```

#### Concurrent Usage
```
Test Case: Multiple Sessions
1. Open app in multiple browsers
2. Perform simultaneous operations
3. Check for conflicts
4. Verify data consistency

Expected: No data corruption, proper locking
```

## Testing Environments

### Local Development
```bash
# Start dev server
npm run dev

# Environment: http://localhost:3000
# Database: Development instance
# Stripe: Test mode
# Clerk: Development instance
```

### Staging (Preview)
- Vercel preview deployments
- Branch-specific URLs
- Production-like environment
- Test data isolation

### Production
- Live at aipromptvault.app
- Real user data
- Limited testing scope
- Monitoring only

## Test Data Management

### Sample Data Sets

1. **Prompts Collection**
   - Basic prompts (10)
   - Complex prompts (10)
   - Various models (5 each)
   - Different folders (5)
   - Tagged prompts (20)

2. **Import Files**
   - ChatGPT export (small/large)
   - Claude exports (JSON/JSONL)
   - Gemini export
   - Cline markdown files
   - Cursor database

3. **User Scenarios**
   - Free tier user (45 prompts)
   - Pro user (200+ prompts)
   - Enterprise team (5 members)

### Test Accounts

```
# Free Tier
Email: test-free@example.com
Prompts: 45/50

# Pro Tier
Email: test-pro@example.com
Prompts: Unlimited

# Enterprise
Email: test-enterprise@example.com
Team: 5 members
```

## Bug Reporting

### Bug Report Template
```markdown
**Description**: Clear description of the issue
**Steps to Reproduce**:
1. Step one
2. Step two
3. ...

**Expected Behavior**: What should happen
**Actual Behavior**: What actually happens
**Environment**:
- Browser: Chrome 120
- OS: Windows 11
- User Tier: Pro
- Time: 2024-01-15 14:30 UTC

**Screenshots**: If applicable
**Additional Context**: Any other relevant information
```

### Severity Levels
- **Critical**: Data loss, security breach, app crash
- **High**: Feature broken, blocking user flow
- **Medium**: Feature degraded, workaround exists
- **Low**: Minor UI issue, cosmetic bug

## Security Testing

### Authentication Security
- [ ] Test SQL injection in login
- [ ] Verify password requirements
- [ ] Check session timeout
- [ ] Test concurrent sessions
- [ ] Verify CSRF protection

### Data Security
- [ ] Test unauthorized access
- [ ] Verify data isolation
- [ ] Check API authentication
- [ ] Test file upload limits
- [ ] Verify input sanitization

### Payment Security
- [ ] Test card validation
- [ ] Verify webhook signatures
- [ ] Check subscription limits
- [ ] Test refund handling
- [ ] Verify PCI compliance

## Accessibility Testing

### WCAG 2.1 Compliance
- [ ] Keyboard navigation
- [ ] Screen reader compatibility
- [ ] Color contrast ratios
- [ ] Focus indicators
- [ ] ARIA labels
- [ ] Form validation

### Device Testing
- [ ] Desktop (1920x1080)
- [ ] Laptop (1366x768)
- [ ] Tablet (768x1024)
- [ ] Mobile (375x812)

## Performance Metrics

### Target Metrics
- Page Load: <3 seconds
- Time to Interactive: <5 seconds
- API Response: <500ms
- Database Query: <100ms
- Search Results: <1 second

### Monitoring Tools
- Vercel Analytics
- Browser DevTools
- Lighthouse scores
- Network throttling

## Future Testing Plans

### Unit Testing Setup
```typescript
// Example test structure
describe('PromptImporter', () => {
  it('should parse ChatGPT export', () => {
    const data = loadFixture('chatgpt-export.json');
    const prompts = parseChatGPTExport(data);
    expect(prompts).toHaveLength(5);
  });
});
```

### Integration Testing
```typescript
// API route testing
describe('POST /api/prompts', () => {
  it('should create prompt for authenticated user', async () => {
    const response = await request(app)
      .post('/api/prompts')
      .set('Authorization', 'Bearer token')
      .send({ name: 'Test', content: 'Content' });
    
    expect(response.status).toBe(201);
  });
});
```

### E2E Testing
```typescript
// Playwright example
test('user can create and edit prompt', async ({ page }) => {
  await page.goto('/dashboard');
  await page.click('text=New Prompt');
  await page.fill('[name=name]', 'E2E Test Prompt');
  await page.fill('[name=content]', 'Test content');
  await page.click('text=Save');
  
  await expect(page).toHaveURL(/\/prompts\/.+/);
});
```

## Continuous Integration

### Planned CI Pipeline
```yaml
name: Test Suite
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run lint
      - run: npm run type-check
      - run: npm run test
      - run: npm run test:e2e
```

## Testing Checklist

### Before Release
- [ ] All manual test cases pass
- [ ] No TypeScript errors
- [ ] ESLint warnings resolved
- [ ] Cross-browser testing complete
- [ ] Mobile responsiveness verified
- [ ] Performance metrics met
- [ ] Security checklist complete
- [ ] Accessibility standards met

### Post-Release
- [ ] Production smoke tests
- [ ] Monitor error logs
- [ ] Check performance metrics
- [ ] Verify webhook delivery
- [ ] User feedback collection