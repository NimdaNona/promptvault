import type { ExtractedPrompt } from './index';

// Cursor stores chat history in SQLite databases
// This parser handles the state.vscdb files

interface CursorSQLiteChat {
  id: string;
  title?: string;
  messages: string; // JSON string
  created_at: number;
  updated_at: number;
}

export async function parseCursorSQLite(buffer: ArrayBuffer): Promise<ExtractedPrompt[]> {
  try {
    // For browser environment, we need to parse SQLite manually
    // In production, you'd use a WASM SQLite library or server-side processing
    
    // Convert buffer to string to check if it's SQLite
    const bytes = new Uint8Array(buffer);
    const header = String.fromCharCode(...bytes.slice(0, 16));
    
    if (!header.startsWith('SQLite format 3')) {
      throw new Error('Not a valid SQLite database');
    }

    // For now, return instructions for manual export
    // In production, use sql.js or similar WASM SQLite library
    throw new Error('SQLite parsing requires server-side processing. Please export your Cursor chats as JSON instead.');
  } catch (error) {
    console.error('Failed to parse Cursor SQLite:', error);
    throw error;
  }
}

export function validateCursorSQLite(buffer: ArrayBuffer): boolean {
  try {
    const bytes = new Uint8Array(buffer);
    const header = String.fromCharCode(...bytes.slice(0, 16));
    return header.startsWith('SQLite format 3');
  } catch {
    return false;
  }
}