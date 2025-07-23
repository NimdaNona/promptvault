import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

// Force this API route to run in a Node.js serverless function
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Schema for scan request
const ScanRequestSchema = z.object({
  customPath: z.string().optional(),
  platform: z.enum(['windows', 'mac', 'linux']).optional(),
});

// Get default Cline storage paths based on platform
function getDefaultClinePaths(platform?: string): string[] {
  const homeDir = os.homedir();
  const detectedPlatform = platform || process.platform;
  
  const paths: string[] = [];
  
  switch (detectedPlatform) {
    case 'win32':
    case 'windows':
      // Windows paths
      paths.push(
        path.join(homeDir, 'AppData', 'Roaming', 'Code', 'User', 'globalStorage', 'saoudrizwan.claude-dev'),
        path.join(homeDir, 'AppData', 'Roaming', 'Code - Insiders', 'User', 'globalStorage', 'saoudrizwan.claude-dev'),
        path.join(homeDir, 'AppData', 'Roaming', 'VSCodium', 'User', 'globalStorage', 'saoudrizwan.claude-dev'),
        path.join(homeDir, 'AppData', 'Roaming', 'Cursor', 'User', 'globalStorage', 'saoudrizwan.claude-dev'),
      );
      break;
    case 'darwin':
    case 'mac':
      // macOS paths
      paths.push(
        path.join(homeDir, 'Library', 'Application Support', 'Code', 'User', 'globalStorage', 'saoudrizwan.claude-dev'),
        path.join(homeDir, 'Library', 'Application Support', 'Code - Insiders', 'User', 'globalStorage', 'saoudrizwan.claude-dev'),
        path.join(homeDir, 'Library', 'Application Support', 'VSCodium', 'User', 'globalStorage', 'saoudrizwan.claude-dev'),
        path.join(homeDir, 'Library', 'Application Support', 'Cursor', 'User', 'globalStorage', 'saoudrizwan.claude-dev'),
      );
      break;
    case 'linux':
    default:
      // Linux paths
      paths.push(
        path.join(homeDir, '.config', 'Code', 'User', 'globalStorage', 'saoudrizwan.claude-dev'),
        path.join(homeDir, '.config', 'Code - Insiders', 'User', 'globalStorage', 'saoudrizwan.claude-dev'),
        path.join(homeDir, '.config', 'VSCodium', 'User', 'globalStorage', 'saoudrizwan.claude-dev'),
        path.join(homeDir, '.config', 'Cursor', 'User', 'globalStorage', 'saoudrizwan.claude-dev'),
      );
      break;
  }
  
  return paths;
}

// Validate path is within allowed directories
function isPathAllowed(targetPath: string): boolean {
  const normalizedPath = path.normalize(targetPath);
  const homeDir = os.homedir();
  
  // Only allow paths within user's home directory
  if (!normalizedPath.startsWith(homeDir)) {
    return false;
  }
  
  // Additional security: prevent directory traversal
  if (normalizedPath.includes('..')) {
    return false;
  }
  
  return true;
}

// Scan directory for Cline markdown files
async function scanDirectory(dirPath: string): Promise<{
  path: string;
  files: Array<{
    name: string;
    path: string;
    size: number;
    modified: string;
    preview?: string;
  }>;
  error?: string;
}> {
  const result = {
    path: dirPath,
    files: [] as any[],
    error: undefined as string | undefined,
  };
  
  try {
    // Check if directory exists
    await fs.access(dirPath);
    
    // Read directory contents
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    
    // Filter and process markdown files
    for (const entry of entries) {
      if (entry.isFile() && (entry.name.endsWith('.md') || entry.name.endsWith('.markdown'))) {
        const filePath = path.join(dirPath, entry.name);
        const stats = await fs.stat(filePath);
        
        // Read first 200 characters for preview
        let preview = '';
        try {
          const content = await fs.readFile(filePath, 'utf-8');
          preview = content.substring(0, 200).trim();
          if (content.length > 200) {
            preview += '...';
          }
        } catch (error) {
          console.error(`Error reading file preview: ${filePath}`, error);
        }
        
        result.files.push({
          name: entry.name,
          path: filePath,
          size: stats.size,
          modified: stats.mtime.toISOString(),
          preview,
        });
      }
    }
    
    // Sort files by modified date (newest first)
    result.files.sort((a, b) => 
      new Date(b.modified).getTime() - new Date(a.modified).getTime()
    );
    
  } catch (error) {
    if ((error as any).code === 'ENOENT') {
      result.error = 'Directory not found';
    } else if ((error as any).code === 'EACCES') {
      result.error = 'Permission denied';
    } else {
      result.error = 'Failed to scan directory';
    }
  }
  
  return result;
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Parse request body
    const body = await request.json();
    const validation = ScanRequestSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.errors },
        { status: 400 }
      );
    }
    
    const { customPath, platform } = validation.data;
    const results: any[] = [];
    
    if (customPath) {
      // Validate custom path
      if (!isPathAllowed(customPath)) {
        return NextResponse.json(
          { error: 'Path not allowed. Only paths within your home directory are permitted.' },
          { status: 403 }
        );
      }
      
      // Scan custom path
      const result = await scanDirectory(customPath);
      results.push(result);
    } else {
      // Scan default Cline paths
      const defaultPaths = getDefaultClinePaths(platform);
      
      // Scan each path in parallel
      const scanPromises = defaultPaths.map(p => scanDirectory(p));
      const scanResults = await Promise.all(scanPromises);
      
      // Only include directories that exist and have files
      results.push(...scanResults.filter(r => !r.error && r.files.length > 0));
    }
    
    // Calculate total files and size
    const totalFiles = results.reduce((sum, r) => sum + r.files.length, 0);
    const totalSize = results.reduce((sum, r) => 
      sum + r.files.reduce((s, f) => s + f.size, 0), 0
    );
    
    return NextResponse.json({
      success: true,
      directories: results,
      summary: {
        directoriesFound: results.length,
        totalFiles,
        totalSize,
        platform: platform || process.platform,
      }
    });
    
  } catch (error) {
    console.error('Directory scan error:', error);
    return NextResponse.json(
      { 
        error: 'Scan failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

// Endpoint to read specific files
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new Response('Unauthorized', { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const filePath = searchParams.get('path');
    
    if (!filePath) {
      return new Response('Missing file path', { status: 400 });
    }
    
    // Validate path
    if (!isPathAllowed(filePath)) {
      return new Response('Path not allowed', { status: 403 });
    }
    
    // Read file content
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      
      return NextResponse.json({
        path: filePath,
        name: path.basename(filePath),
        content,
        size: content.length,
      });
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        return new Response('File not found', { status: 404 });
      }
      throw error;
    }
    
  } catch (error) {
    console.error('File read error:', error);
    return new Response('Read failed', { status: 500 });
  }
}