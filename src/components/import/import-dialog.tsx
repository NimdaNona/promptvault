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
import { ClineFolderImport } from './cline-folder-import';
import { ImportPlatform } from '@/lib/types/import';
import { FileUp, Brain, Sparkles, Code, Terminal, HelpCircle } from 'lucide-react';
import { ClineImportHelp, getClineStorageLocation } from '@/lib/import/cline-help';
import { ErrorRecoveryDialog, useErrorRecovery } from './error-recovery-dialog';

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
    description: 'Import AI coding sessions from Cline VSCode extension',
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
  const [clineImportMode, setClineImportMode] = useState<'file' | 'folder'>('file');
  const errorRecovery = useErrorRecovery();

  const handleUploadComplete = (blobUrl: string, sessionId: string) => {
    setCurrentSessionId(sessionId);
    setIsProcessing(true);
  };

  const handleError = (error: string, context?: { file?: string; line?: number }) => {
    console.error('Import error:', error);
    
    // Use error recovery for Cline imports
    if (selectedPlatform === 'cline' && context) {
      errorRecovery.handleError(new Error(error), context);
    }
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
                  
                  {platform.value === 'cline' ? (
                    <>
                      {/* Help section for Cline */}
                      <div className="mb-4">
                        {ClineImportHelp.overview}
                      </div>
                      
                      {/* Import mode selector for Cline */}
                      <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
                        <Button
                          variant={clineImportMode === 'file' ? 'default' : 'ghost'}
                          size="sm"
                          onClick={() => setClineImportMode('file')}
                          className="flex-1"
                        >
                          <FileUp className="h-4 w-4 mr-2" />
                          Upload File
                        </Button>
                        <Button
                          variant={clineImportMode === 'folder' ? 'default' : 'ghost'}
                          size="sm"
                          onClick={() => setClineImportMode('folder')}
                          className="flex-1"
                        >
                          <Terminal className="h-4 w-4 mr-2" />
                          Scan Storage
                        </Button>
                      </div>

                      {clineImportMode === 'file' ? (
                        <>
                          <UploadComponent
                            platform={platform.value}
                            onUploadComplete={handleUploadComplete}
                            onError={handleError}
                          />
                          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                            <h4 className="font-medium text-sm mb-2">How to export from {platform.label}:</h4>
                            {getExportInstructions(platform.value)}
                          </div>
                        </>
                      ) : (
                        <ClineFolderImport
                          onImport={async (files) => {
                            try {
                              // Create import session
                              const sessionResponse = await fetch('/api/import/session', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ platform: 'cline' }),
                              });
                              
                              if (!sessionResponse.ok) {
                                throw new Error('Failed to create import session');
                              }
                              
                              const { sessionId } = await sessionResponse.json();
                              
                              // Process files
                              const importResponse = await fetch('/api/import/cline', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  files,
                                  options: {
                                    targetFolder: 'Cline Imports',
                                    defaultTags: ['cline', 'vscode'],
                                  },
                                }),
                              });
                              
                              if (!importResponse.ok) {
                                throw new Error('Failed to import files');
                              }
                              
                              const result = await importResponse.json();
                              
                              if (result.background) {
                                setCurrentSessionId(result.sessionId);
                                setIsProcessing(true);
                              } else {
                                handleProcessingComplete();
                              }
                            } catch (error) {
                              handleError(error instanceof Error ? error.message : 'Import failed');
                            }
                          }}
                          onError={handleError}
                        />
                      )}
                    </>
                  ) : (
                    <>
                      <UploadComponent
                        platform={platform.value}
                        onUploadComplete={handleUploadComplete}
                        onError={handleError}
                      />
                      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                        <h4 className="font-medium text-sm mb-2">How to export from {platform.label}:</h4>
                        {getExportInstructions(platform.value)}
                      </div>
                    </>
                  )}
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
                showPerformanceMetrics={selectedPlatform === 'cline'}
              />
            )}
          </div>
        )}
      </DialogContent>
      
      {/* Error Recovery Dialog */}
      <ErrorRecoveryDialog
        error={errorRecovery.error}
        open={errorRecovery.showDialog}
        onOpenChange={errorRecovery.setShowDialog}
        sessionId={currentSessionId || undefined}
        onRetry={async () => {
          // Retry logic based on current mode
          if (selectedPlatform === 'cline' && clineImportMode === 'file') {
            // Re-trigger file upload
            const uploadButton = document.querySelector('[data-upload-trigger]') as HTMLElement;
            uploadButton?.click();
          } else if (selectedPlatform === 'cline' && clineImportMode === 'folder') {
            // Re-trigger folder scan
            const scanButton = document.querySelector('[data-scan-trigger]') as HTMLElement;
            scanButton?.click();
          }
          errorRecovery.clearError();
        }}
        onSkip={() => {
          errorRecovery.clearError();
          // Continue with remaining files if in batch mode
          if (currentSessionId) {
            fetch(`/api/import/session/${currentSessionId}/skip-error`, {
              method: 'POST',
            });
          }
        }}
        onViewGuide={() => {
          window.open('/docs/CLINE_IMPORT_GUIDE.md', '_blank');
        }}
      />
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
      <div className="space-y-3">
        <div className="text-sm text-gray-600">
          <p className="font-medium mb-1">Use the mode selector above:</p>
          <ul className="space-y-2 ml-2">
            <li className="flex items-start gap-2">
              <FileUp className="h-4 w-4 text-gray-500 mt-0.5" />
              <div>
                <span className="font-medium">Upload File:</span> Drag & drop Cline markdown files
              </div>
            </li>
            <li className="flex items-start gap-2">
              <Terminal className="h-4 w-4 text-gray-500 mt-0.5" />
              <div>
                <span className="font-medium">Scan Storage:</span> Auto-detect from VSCode storage
              </div>
            </li>
          </ul>
        </div>
        
        <div className="bg-gray-50 border border-gray-200 rounded-md p-3 text-xs">
          <p className="font-medium text-gray-700 mb-1">Default storage location:</p>
          <code className="text-gray-600 break-all">
            {getClineStorageLocation(
              typeof window !== 'undefined' ? 
                (navigator.platform.toLowerCase().includes('mac') ? 'darwin' :
                 navigator.platform.toLowerCase().includes('win') ? 'win32' : 'linux')
                : 'linux'
            )}
          </code>
        </div>
      </div>
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