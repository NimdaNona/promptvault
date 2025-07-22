'use client';

import { useState } from 'react';
import { ImportDialog } from '@/components/import/import-dialog';
import { Button } from '@/components/ui/button';
import { Upload } from 'lucide-react';

export default function TestImportPage() {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="container mx-auto py-10">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-4">Import Test Page</h1>
        <p className="text-gray-600 mb-8">
          Test the new import infrastructure for AI Prompt Vault. This page demonstrates
          the complete import flow including file upload, background processing, and
          real-time progress tracking.
        </p>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Import Your Prompts</h2>
          <p className="text-gray-600 mb-6">
            Click the button below to import prompts from ChatGPT, Claude, Gemini, Cline, or Cursor.
            Files up to 500MB are supported.
          </p>

          <Button
            onClick={() => setDialogOpen(true)}
            size="lg"
            className="w-full sm:w-auto"
          >
            <Upload className="mr-2 h-4 w-4" />
            Import Prompts
          </Button>
        </div>

        <div className="mt-8 bg-blue-50 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-2">Features Demonstrated:</h3>
          <ul className="space-y-2 text-blue-800">
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Client-side file upload with Vercel Blob (up to 500MB)</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Background processing with QStash message queue</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Real-time progress tracking with Server-Sent Events</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>AI-powered prompt categorization and tagging</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Platform-specific parsers for all major LLMs</span>
            </li>
          </ul>
        </div>

        <ImportDialog open={dialogOpen} onOpenChange={setDialogOpen} />
      </div>
    </div>
  );
}