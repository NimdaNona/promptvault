"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { motion } from "framer-motion";
import { X, Upload, Code2, Loader2, ChevronRight, FolderOpen } from "lucide-react";
import { PromptImporter } from "@/lib/importers";
import { toast } from "sonner";

interface ClineImportDialogProps {
  onClose: () => void;
  onImport: (prompts: any[]) => Promise<void>;
  existingPrompts?: any[];
}

export default function ClineImportDialog({ onClose, onImport, existingPrompts = [] }: ClineImportDialogProps) {
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const [selectedPrompts, setSelectedPrompts] = useState<Set<number>>(new Set());

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    setIsImporting(true);
    setImportResult(null);

    try {
      const result = await PromptImporter.importFromFile(file, 'cline');
      
      if (result.errors.length > 0) {
        result.errors.forEach(error => toast.error(error));
        if (result.prompts.length === 0) {
          setIsImporting(false);
          return;
        }
      }

      result.warnings.forEach(warning => toast.warning(warning));

      // Check for duplicates
      const { unique, duplicates } = PromptImporter.detectDuplicates(result.prompts, existingPrompts);
      
      // Pre-select all unique prompts
      const preSelected = new Set(unique.map((_, index) => index));
      setSelectedPrompts(preSelected);

      setImportResult({
        all: result.prompts,
        unique,
        duplicates,
      });
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Failed to import file. Please check the format and try again.');
    } finally {
      setIsImporting(false);
    }
  }, [existingPrompts]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/json': ['.json'],
    },
    maxFiles: 1,
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col"
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
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
              <p className="text-sm text-purple-800 dark:text-purple-200">
                Cline chat logs parser is in development. The parser is coming soon.
              </p>
            </div>

            <div>
              <h3 className="font-medium mb-4">How to find Cline chat logs:</h3>
              
              <div className="space-y-4">
                <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4 font-mono text-sm">
                  <p className="text-gray-600 dark:text-gray-400 mb-2">Cline stores chats in your workspace:</p>
                  <code className="text-gray-800 dark:text-gray-200">.cline/tasks/</code>
                </div>

                <ol className="text-sm text-gray-600 dark:text-gray-400 space-y-2 list-decimal list-inside">
                  <li>Open your VSCode workspace</li>
                  <li>Look for the <code className="bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded">.cline</code> folder in your project root</li>
                  <li>Navigate to <code className="bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded">.cline/tasks/</code></li>
                  <li>Each JSON file represents a chat session</li>
                  <li>Select and upload the chat log you want to import</li>
                </ol>

                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                  <p className="text-xs text-yellow-800 dark:text-yellow-200">
                    <strong>Note:</strong> Cline chat logs can be large. We'll extract only your prompts from the conversation.
                  </p>
                </div>
              </div>
            </div>

            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors cursor-pointer
                ${isDragActive 
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                  : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                }`}
            >
              <input {...getInputProps()} />
              <FolderOpen className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <p className="text-lg font-medium mb-2">
                {isDragActive ? 'Drop the JSON file here' : 'Drag & drop your Cline chat log'}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                or click to select the file
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500">
                Only JSON files from .cline/tasks/ are supported
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}