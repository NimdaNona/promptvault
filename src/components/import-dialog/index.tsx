"use client";

import dynamic from 'next/dynamic';
import type { ImportSource } from "@/lib/importers";

// Dynamically import platform-specific dialogs
const ChatGPTImportDialog = dynamic(() => import('./chatgpt-import-dialog'));
const ClaudeImportDialog = dynamic(() => import('./claude-import-dialog'));
const GeminiImportDialog = dynamic(() => import('./gemini-import-dialog'));
const ClineImportDialog = dynamic(() => import('./cline-import-dialog'));
const CursorImportDialog = dynamic(() => import('./cursor-import-dialog'));
const FileImportDialog = dynamic(() => import('./file-import-dialog'));

interface ImportDialogProps {
  source: ImportSource;
  onClose: () => void;
  onImport: (prompts: any[]) => Promise<void>;
  existingPrompts?: any[];
}

export default function ImportDialog({ source, onClose, onImport, existingPrompts = [] }: ImportDialogProps) {
  switch (source) {
    case 'chatgpt':
      return <ChatGPTImportDialog onClose={onClose} onImport={onImport} existingPrompts={existingPrompts} />;
    case 'claude':
      return <ClaudeImportDialog onClose={onClose} onImport={onImport} existingPrompts={existingPrompts} />;
    case 'gemini':
      return <GeminiImportDialog onClose={onClose} onImport={onImport} existingPrompts={existingPrompts} />;
    case 'cline':
      return <ClineImportDialog onClose={onClose} onImport={onImport} existingPrompts={existingPrompts} />;
    case 'cursor':
      return <CursorImportDialog onClose={onClose} onImport={onImport} existingPrompts={existingPrompts} />;
    case 'file':
      return <FileImportDialog onClose={onClose} onImport={onImport} existingPrompts={existingPrompts} />;
    default:
      return null;
  }
}