import { describe, it, expect } from 'vitest';
import { ClineParser } from '../cline-new';

describe('ClineParser', () => {
  const parser = new ClineParser();

  describe('Simple conversation format', () => {
    it('should parse basic Human/Assistant format', async () => {
      const content = `### Human
How do I create a React component?

### Assistant
Here's how to create a React component...

### Human
Can you show me an example with props?

### Assistant
Sure! Here's an example...`;

      const prompts = await parser.parse(content);
      
      expect(prompts).toHaveLength(2);
      expect(prompts[0].content).toBe('How do I create a React component?');
      expect(prompts[1].content).toBe('Can you show me an example with props?');
    });

    it('should parse alternative User/Cline format', async () => {
      const content = `User: What is TypeScript?
      
Cline: TypeScript is a typed superset of JavaScript...

User: How do I install it?

Cline: You can install TypeScript using npm...`;

      const prompts = await parser.parse(content);
      
      expect(prompts).toHaveLength(2);
      expect(prompts[0].content).toBe('What is TypeScript?');
      expect(prompts[1].content).toBe('How do I install it?');
    });
  });

  describe('Task export format', () => {
    it('should parse task with metadata', async () => {
      const content = `# Fix authentication bug

---
model: claude-3-sonnet
totalTokens: 1500
cost: 0.045
duration: 120
---

### Human
The login form is not working. Users can't sign in.

### Assistant
I'll help you fix the login issue. Let me check the authentication code...

### Human
I think the problem is in the API endpoint

### Assistant
You're right, let me examine the API endpoint...`;

      const prompts = await parser.parse(content);
      
      expect(prompts).toHaveLength(2);
      expect(prompts[0].metadata.title).toBe('Fix authentication bug');
      expect(prompts[0].metadata.model).toBe('claude-3-sonnet');
      expect(prompts[0].metadata.totalTokens).toBe(1500);
    });
  });

  describe('Code block extraction', () => {
    it('should extract code blocks from prompts', async () => {
      const content = `### Human
Create a function to validate email addresses:

\`\`\`javascript
function validateEmail(email) {
  // Need implementation
}
\`\`\`

Also create a test for it:

\`\`\`javascript
test('validates email', () => {
  expect(validateEmail('test@example.com')).toBe(true);
});
\`\`\``;

      const prompts = await parser.parse(content);
      
      expect(prompts).toHaveLength(1);
      expect(prompts[0].metadata.codeBlocks).toHaveLength(2);
      expect(prompts[0].metadata.codeBlocks[0].language).toBe('javascript');
    });
  });

  describe('File reference extraction', () => {
    it('should extract file references', async () => {
      const content = `### Human
Please update the \`src/components/Button.tsx\` file and also check File: utils/validation.js

The main config is in config/app.json`;

      const prompts = await parser.parse(content);
      
      expect(prompts).toHaveLength(1);
      expect(prompts[0].metadata.fileReferences).toContain('src/components/Button.tsx');
      expect(prompts[0].metadata.fileReferences).toContain('utils/validation.js');
      expect(prompts[0].metadata.fileReferences).toContain('config/app.json');
    });
  });

  describe('Complexity estimation', () => {
    it('should estimate simple complexity', async () => {
      const content = `### Human
What is React?`;

      const prompts = await parser.parse(content);
      expect(prompts[0].metadata.complexity).toBe('simple');
    });

    it('should estimate complex complexity', async () => {
      const content = `### Human
${Array(60).fill('This is a line of text.').join('\n')}

\`\`\`javascript
// Code block 1
\`\`\`

\`\`\`javascript
// Code block 2
\`\`\`

\`\`\`javascript
// Code block 3
\`\`\`

\`\`\`javascript
// Code block 4
\`\`\``;

      const prompts = await parser.parse(content);
      expect(prompts[0].metadata.complexity).toBe('complex');
    });
  });

  describe('Edge cases', () => {
    it('should handle empty content', async () => {
      const prompts = await parser.parse('');
      expect(prompts).toHaveLength(0);
    });

    it('should handle malformed content', async () => {
      const content = `This is just some random text
without any proper formatting
### Not a valid section
More random text`;

      const prompts = await parser.parse(content);
      expect(prompts).toHaveLength(0);
    });

    it('should handle timestamps', async () => {
      const content = `### Human
[2024-01-15 10:30:45] Can you help me debug this?

### Assistant
Of course! What seems to be the issue?`;

      const prompts = await parser.parse(content);
      expect(prompts).toHaveLength(1);
      expect(prompts[0].content).toBe('Can you help me debug this?');
      expect(prompts[0].timestamp).toBeInstanceOf(Date);
    });
  });
});