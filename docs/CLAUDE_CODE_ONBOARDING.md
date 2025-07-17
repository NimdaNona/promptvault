# Claude Code Session Onboarding Prompt

Use this prompt when starting a new Claude Code session for the PromptVault project:

---

## Prompt for New Claude Code Sessions

I'm working on PromptVault, an AI-powered enterprise prompt management platform deployed at aipromptvault.app. Please familiarize yourself with the project by:

1. **Read CLAUDE.md first** - This contains critical project-specific instructions and context
2. **Review /docs/ARCHITECTURE.md** - Understand the system design and tech stack
3. **Check /docs/DEVELOPMENT.md** - Learn the development setup and workflow
4. **Scan recent commits** with `git log --oneline -20` to understand current work

Key context:
- **Production**: Live at aipromptvault.app using Clerk production instance
- **Stack**: Next.js 15.4.1, Neon PostgreSQL (pooled connections), Drizzle ORM, Clerk auth, Stripe payments
- **Current focus**: Import system for various LLM platforms (ChatGPT, Claude, Gemini, etc.)
- **Environment**: Use the .env.local file, NOT .env.example

Please acknowledge once you've reviewed these files and are ready to help with development.

---

## Why This Prompt Works

1. **Prioritizes CLAUDE.md**: This file contains project-specific instructions that override default behaviors
2. **Provides essential context**: Gives immediate awareness of production status and tech stack
3. **Directs to key documentation**: Points to the most important files for understanding the project
4. **Sets up for recent context**: The git log command helps understand current development state
5. **Clarifies environment**: Prevents confusion about which env file to use
6. **Requests confirmation**: Ensures Claude has processed the information before proceeding

## Additional Context Commands

After Claude acknowledges, you can provide additional context as needed:

```bash
# Show current feature being worked on
git status

# Show database schema
npm run db:studio

# Check for any failing tests or lint issues
npm run lint && npm run typecheck

# Review import system if working on imports
ls -la src/lib/importers/
```

## Best Practices

1. Always mention if you're continuing work from a previous session
2. Specify which feature or issue you're working on
3. Mention any specific constraints or requirements
4. Share any error messages or issues you're encountering
5. Indicate if you need to maintain backward compatibility

This onboarding approach ensures Claude Code quickly gains the necessary context to provide accurate, project-aligned assistance.