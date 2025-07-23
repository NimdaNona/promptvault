# Cline Import Guide

## Overview

The Cline import feature allows you to import your AI-powered coding conversations from the Cline VSCode extension into PromptVault. This guide covers all aspects of importing your Cline data.

## What is Cline?

Cline (formerly Claude Dev) is a VSCode extension that provides AI-powered coding assistance. It stores conversation history in markdown files that can be imported into PromptVault for organization, versioning, and team collaboration.

## Import Methods

### Method 1: File Upload

1. Navigate to your `/imports` page or the onboarding flow
2. Click on the Cline import card
3. Select "Upload File" mode
4. Drag and drop your Cline markdown files or click to browse
5. Review the import preview
6. Click "Import" to process the files

**Supported formats:**
- Individual markdown files (`.md`)
- Multiple files can be uploaded at once
- Files should contain Cline conversation history

### Method 2: Storage Folder Scan

1. Navigate to your `/imports` page or the onboarding flow
2. Click on the Cline import card  
3. Select "Scan Storage" mode
4. The system will automatically detect your Cline storage locations
5. Browse and select the files you want to import
6. Click "Import Selected" to process the files

**Default storage locations:**
- **Windows**: `%APPDATA%\Code\User\globalStorage\saoudrizwan.claude-dev`
- **macOS**: `~/Library/Application Support/Code/User/globalStorage/saoudrizwan.claude-dev`
- **Linux**: `~/.config/Code/User/globalStorage/saoudrizwan.claude-dev`

## Cline Markdown Format

Cline uses two main conversation formats:

### Format 1: Human/Assistant
```markdown
# Task: Implement user authentication

## Conversation

### Human
I need to implement JWT authentication for my Express API

### Assistant
I'll help you implement JWT authentication for your Express API. Let me break this down into steps...
```

### Format 2: User/Cline
```markdown
# Implement search functionality

User: I need to add search to my React app

Cline: I'll help you implement search functionality in your React app. Here's what we'll need to do...
```

## Import Features

### AI-Powered Categorization

When importing Cline conversations, PromptVault automatically:
- Analyzes conversation content
- Suggests appropriate names for prompts
- Organizes prompts into relevant folders
- Adds contextual tags for easy searching

### Performance Optimization

For large imports, PromptVault provides:
- **Batch Processing**: Processes files in optimized chunks
- **Deduplication**: Automatically removes duplicate prompts
- **Progress Tracking**: Real-time updates on import status
- **Performance Metrics**: Throughput and success rate monitoring

### Metadata Preservation

The import process preserves:
- Model information (GPT-4, Claude, etc.)
- Token usage statistics
- Cost information (if available)
- Conversation timestamps
- Task context and descriptions

## Import Limits

Import limits depend on your subscription tier:

| Tier | Max Prompts | Batch Processing | AI Categorization |
|------|-------------|------------------|-------------------|
| Free | 50 | ✓ | ✗ |
| Pro | Unlimited | ✓ | ✓ |
| Enterprise | Unlimited | ✓ | ✓ |

## Best Practices

### Before Importing

1. **Review Your Files**: Ensure files contain actual Cline conversations
2. **Check File Size**: Large files (>10MB) may take longer to process
3. **Organize Locally**: Group related conversations for easier import

### During Import

1. **Use Folder Scan**: For bulk imports from VSCode storage
2. **Monitor Progress**: Watch the progress bar and performance metrics
3. **Review Errors**: Check any failed imports in the error list

### After Import

1. **Review Categories**: Check AI-suggested folders and tags
2. **Organize Further**: Move prompts to appropriate folders if needed
3. **Add Context**: Edit prompts to add additional context or notes

## Troubleshooting

### Common Issues

**Import fails immediately**
- Check that files are valid markdown format
- Ensure files contain Cline conversation markers
- Verify file size is under 10MB per file

**No files found in storage scan**
- Verify Cline extension is installed in VSCode
- Check that you have existing Cline conversations
- Try selecting a different platform if on a non-standard setup

**Duplicates not detected**
- Deduplication works on exact content matches
- Minor formatting differences may result in duplicates
- Manually review and remove duplicates if needed

**AI categorization not working**
- Only available for Pro and Enterprise tiers
- Requires OpenAI API to be configured
- Check your account settings for API status

### Performance Issues

**Slow imports**
- Large files take longer to process
- Try importing in smaller batches
- Monitor performance metrics for bottlenecks

**Memory errors**
- Files over 10MB may cause issues
- Split large conversation files before importing
- Use batch import for many small files

## Advanced Features

### Batch Import API

For developers and power users, PromptVault provides a batch import API:

```bash
POST /api/import/bulk
Content-Type: multipart/form-data

{
  "platform": "cline",
  "files": [file1, file2, ...],
  "options": {
    "autoCategize": true,
    "targetFolder": "Cline Imports"
  }
}
```

### Performance Monitoring

Track import performance with real-time metrics:
- **Throughput**: Prompts processed per second
- **Success Rate**: Percentage of successful imports
- **Memory Usage**: Current memory consumption
- **Processing Time**: Average time per prompt

## Security & Privacy

- All imports are processed securely on our servers
- Files are temporarily stored in Vercel Blob storage
- Processed files are automatically deleted after import
- Your prompts remain private to your account/team

## Support

If you encounter issues with Cline imports:
1. Check this documentation first
2. Review error messages in the import dialog
3. Contact support with your import session ID

---

Last updated: January 2025