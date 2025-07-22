'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UploadComponent } from './upload-component';
import { ProgressDisplay } from './progress-display';
import { ImportPlatform } from '@/lib/types/import';
import { FileUp, Brain, Sparkles, Code, Terminal } from 'lucide-react';

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const platforms: {
  value: ImportPlatform;
  label: string;
  icon: React.ReactNode;
  description: string;
}[] = [
  {
    value: 'chatgpt',
    label: 'ChatGPT',
    icon: <Brain className="h-5 w-5" />,
    description: 'Import conversations from ChatGPT export',
  },
  {
    value: 'claude',
    label: 'Claude',
    icon: <Sparkles className="h-5 w-5" />,
    description: 'Import conversations from Claude',
  },
  {
    value: 'gemini',
    label: 'Gemini',
    icon: <FileUp className="h-5 w-5" />,
    description: 'Import conversations from Google Gemini',
  },
  {
    value: 'cline',
    label: 'Cline',
    icon: <Code className="h-5 w-5" />,
    description: 'Import Cline chat logs',
  },
  {
    value: 'cursor',
    label: 'Cursor',
    icon: <Terminal className="h-5 w-5" />,
    description: 'Import Cursor composer sessions',
  },
];

export function ImportDialog({ open, onOpenChange }: ImportDialogProps) {
  const router = useRouter();
  const [selectedPlatform, setSelectedPlatform] = useState<ImportPlatform>('chatgpt');
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleUploadComplete = (blobUrl: string, sessionId: string) => {
    setCurrentSessionId(sessionId);
    setIsProcessing(true);
  };

  const handleError = (error: string) => {
    console.error('Import error:', error);
    // You can add toast notification here
  };

  const handleProcessingComplete = () => {
    // Refresh the prompts list
    router.refresh();
    
    // Close dialog after a short delay
    setTimeout(() => {
      onOpenChange(false);
      setIsProcessing(false);
      setCurrentSessionId(null);
    }, 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import Prompts</DialogTitle>
          <DialogDescription>
            Import your conversation history from various AI platforms. Your prompts will be automatically categorized and organized.
          </DialogDescription>
        </DialogHeader>

        {!isProcessing ? (
          <Tabs value={selectedPlatform} onValueChange={(v) => setSelectedPlatform(v as ImportPlatform)}>
            <TabsList className="grid grid-cols-5 w-full">
              {platforms.map((platform) => (
                <TabsTrigger
                  key={platform.value}
                  value={platform.value}
                  className="flex flex-col gap-1 h-auto py-2"
                >
                  {platform.icon}
                  <span className="text-xs">{platform.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>

            {platforms.map((platform) => (
              <TabsContent key={platform.value} value={platform.value} className="mt-4">
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">{platform.description}</p>
                  
                  <UploadComponent
                    platform={platform.value}
                    onUploadComplete={handleUploadComplete}
                    onError={handleError}
                  />

                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium text-sm mb-2">How to export from {platform.label}:</h4>
                    {getExportInstructions(platform.value)}
                  </div>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        ) : (
          <div className="py-4">
            {currentSessionId && (
              <ProgressDisplay
                sessionId={currentSessionId}
                onComplete={handleProcessingComplete}
              />
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function getExportInstructions(platform: ImportPlatform) {
  const instructions: Record<ImportPlatform, React.ReactNode> = {
    chatgpt: (
      <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
        <li>Go to ChatGPT Settings → Data controls</li>
        <li>Click &quot;Export data&quot;</li>
        <li>Wait for the email with your export</li>
        <li>Download and extract the ZIP file</li>
        <li>Upload the conversations.json file here</li>
      </ol>
    ),
    claude: (
      <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
        <li>Go to Claude Settings → Account</li>
        <li>Click &quot;Export conversations&quot;</li>
        <li>Download the JSON file</li>
        <li>Upload the file here</li>
      </ol>
    ),
    gemini: (
      <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
        <li>Go to Google Takeout</li>
        <li>Select &quot;Gemini&quot; or &quot;Bard&quot;</li>
        <li>Export and download your data</li>
        <li>Upload the conversations file here</li>
      </ol>
    ),
    cline: (
      <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
        <li>Open your Cline chat history</li>
        <li>Click the export button</li>
        <li>Save as Markdown (.md) file</li>
        <li>Upload the file here</li>
      </ol>
    ),
    cursor: (
      <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
        <li>Open Cursor composer</li>
        <li>Export your conversation history</li>
        <li>Save the export file</li>
        <li>Upload the file here</li>
      </ol>
    ),
  };

  return instructions[platform];
}