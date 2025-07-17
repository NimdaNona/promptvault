"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, Upload, Code2, Loader2, ChevronRight, FolderOpen, 
  FileText, AlertCircle, CheckCircle, Info, HelpCircle 
} from "lucide-react";
import { toast } from "sonner";

interface ClineImportDialogProps {
  onClose: () => void;
  onImport: (prompts: any[]) => Promise<void>;
  existingPrompts?: any[];
}

interface ImportFile {
  file: File;
  status: 'pending' | 'processing' | 'success' | 'error';
  error?: string;
}

export default function ClineImportDialog({ onClose, onImport, existingPrompts = [] }: ClineImportDialogProps) {
  const [files, setFiles] = useState<ImportFile[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importStatus, setImportStatus] = useState<string>("");
  const [showInstructions, setShowInstructions] = useState(true);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map(file => ({
      file,
      status: 'pending' as const
    }));
    setFiles(prev => [...prev, ...newFiles]);
    setShowInstructions(false);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/markdown': ['.md', '.markdown'],
      'text/plain': ['.txt']
    },
    multiple: true,
    maxFiles: 50
  });

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    if (files.length === 1) {
      setShowInstructions(true);
    }
  };

  const processImport = async () => {
    if (files.length === 0) return;

    setIsImporting(true);
    setImportProgress(0);
    setImportStatus("Uploading files...");

    try {
      // Upload all files
      const uploadedFiles = [];
      for (let i = 0; i < files.length; i++) {
        const { file } = files[i];
        setImportStatus(`Uploading file ${i + 1} of ${files.length}...`);
        setImportProgress((i / files.length) * 30); // 0-30% for uploads

        const formData = new FormData();
        formData.append('file', file);

        const uploadResponse = await fetch('/api/import/upload', {
          method: 'POST',
          body: formData,
        });

        if (!uploadResponse.ok) {
          throw new Error(`Failed to upload ${file.name}`);
        }

        const uploadResult = await uploadResponse.json();
        uploadedFiles.push({
          url: uploadResult.url,
          filename: file.name,
          content: uploadResult.content
        });
      }

      // Send to Cline import API
      setImportStatus("Processing Cline markdown files...");
      setImportProgress(40);

      const importResponse = await fetch('/api/import/cline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          files: uploadedFiles,
          options: {
            skipAI: false,
            tags: ['Cline', 'VSCode']
          }
        })
      });

      if (!importResponse.ok) {
        const error = await importResponse.json();
        throw new Error(error.details || 'Import failed');
      }

      const result = await importResponse.json();
      
      // Set up SSE for progress tracking
      if (result.sessionId) {
        const eventSource = new EventSource(`/api/import/cline?sessionId=${result.sessionId}`);
        
        eventSource.onmessage = (event) => {
          const progress = JSON.parse(event.data);
          setImportProgress(progress.progress);
          setImportStatus(progress.message);
          
          if (progress.status === 'completed') {
            eventSource.close();
            toast.success(`Successfully imported ${result.imported} prompts!`);
            
            // Call parent import handler with the imported prompts
            onImport(result.prompts).then(() => {
              onClose();
            });
          } else if (progress.status === 'failed') {
            eventSource.close();
            throw new Error(progress.message);
          }
        };

        eventSource.onerror = () => {
          eventSource.close();
          setImportStatus("Connection lost. Import may still be processing.");
        };
      } else {
        // Fallback if no session ID
        toast.success(`Successfully imported ${result.imported} prompts!`);
        await onImport(result.prompts);
        onClose();
      }

    } catch (error) {
      console.error('Import error:', error);
      toast.error(error instanceof Error ? error.message : 'Import failed');
      setImportStatus("Import failed");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Code2 className="w-6 h-6 text-purple-600" />
            <h2 className="text-xl font-semibold">Import from Cline (VSCode)</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            disabled={isImporting}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait">
            {showInstructions && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6 mb-6"
              >
                {/* How to Export Section */}
                <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                  <h3 className="font-semibold text-purple-900 dark:text-purple-100 mb-3 flex items-center">
                    <HelpCircle className="w-5 h-5 mr-2" />
                    How to Export from Cline
                  </h3>
                  <ol className="space-y-3 text-sm text-purple-800 dark:text-purple-200">
                    <li className="flex items-start">
                      <span className="font-semibold mr-2 mt-0.5">1.</span>
                      <div>
                        <p>Open VSCode and click on the Cline icon in the sidebar</p>
                      </div>
                    </li>
                    <li className="flex items-start">
                      <span className="font-semibold mr-2 mt-0.5">2.</span>
                      <div>
                        <p>Click the "History" button at the top of the Cline panel</p>
                      </div>
                    </li>
                    <li className="flex items-start">
                      <span className="font-semibold mr-2 mt-0.5">3.</span>
                      <div>
                        <p>Hover over a task and click the export button that appears</p>
                      </div>
                    </li>
                    <li className="flex items-start">
                      <span className="font-semibold mr-2 mt-0.5">4.</span>
                      <div>
                        <p>Save the markdown file to your computer</p>
                      </div>
                    </li>
                    <li className="flex items-start">
                      <span className="font-semibold mr-2 mt-0.5">5.</span>
                      <div>
                        <p>Repeat for each task you want to import</p>
                      </div>
                    </li>
                  </ol>
                </div>

                {/* Important Note */}
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                  <div className="flex items-start">
                    <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 mr-3 flex-shrink-0" />
                    <div className="text-sm text-amber-800 dark:text-amber-200">
                      <p className="font-semibold mb-1">Multi-file Upload Supported</p>
                      <p>Cline exports tasks individually, but you can upload multiple markdown files at once. We'll extract and organize all your prompts automatically.</p>
                    </div>
                  </div>
                </div>

                {/* What We'll Import */}
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <div className="flex items-start">
                    <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 mr-3 flex-shrink-0" />
                    <div className="text-sm text-blue-800 dark:text-blue-200">
                      <p className="font-semibold mb-1">What we'll import:</p>
                      <ul className="list-disc list-inside space-y-1 ml-2">
                        <li>All user prompts from conversations</li>
                        <li>Task titles and timestamps</li>
                        <li>Code context when available</li>
                        <li>AI-powered categorization and tagging</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* File Upload Area */}
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer
              ${isDragActive 
                ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20' 
                : 'border-gray-300 dark:border-gray-600 hover:border-purple-400 dark:hover:border-purple-500'
              }`}
          >
            <input {...getInputProps()} />
            <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-lg font-medium mb-2">
              {isDragActive ? 'Drop your Cline files here' : 'Drag & drop Cline markdown files'}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              or click to browse your files
            </p>
            <p className="text-xs text-gray-500">
              Supports multiple .md files • Max 50 files
            </p>
          </div>

          {/* File List */}
          {files.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">Selected Files ({files.length})</h3>
                <button
                  onClick={() => {
                    setFiles([]);
                    setShowInstructions(true);
                  }}
                  className="text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                >
                  Clear all
                </button>
              </div>
              
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {files.map((importFile, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                  >
                    <div className="flex items-center flex-1 min-w-0">
                      <FileText className="w-4 h-4 mr-2 text-gray-500 flex-shrink-0" />
                      <span className="text-sm truncate">{importFile.file.name}</span>
                      <span className="text-xs text-gray-500 ml-2">
                        ({(importFile.file.size / 1024).toFixed(1)} KB)
                      </span>
                    </div>
                    {!isImporting && (
                      <button
                        onClick={() => removeFile(index)}
                        className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-sm ml-2"
                      >
                        Remove
                      </button>
                    )}
                    {importFile.status === 'success' && (
                      <CheckCircle className="w-4 h-4 text-green-600 ml-2" />
                    )}
                    {importFile.status === 'error' && (
                      <AlertCircle className="w-4 h-4 text-red-600 ml-2" />
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Import Progress */}
          {isImporting && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 space-y-3"
            >
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">{importStatus}</span>
                <span className="font-medium">{Math.round(importProgress)}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-purple-500 to-purple-600"
                  initial={{ width: 0 }}
                  animate={{ width: `${importProgress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </motion.div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-between">
          <button
            onClick={onClose}
            disabled={isImporting}
            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={processImport}
            disabled={files.length === 0 || isImporting}
            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
          >
            {isImporting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Import {files.length} File{files.length !== 1 ? 's' : ''}
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}