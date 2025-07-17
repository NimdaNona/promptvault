"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { motion } from "framer-motion";
import { X, Upload, Terminal, Loader2, ChevronRight, Database } from "lucide-react";
import { PromptImporter } from "@/lib/importers";
import { toast } from "sonner";

interface CursorImportDialogProps {
  onClose: () => void;
  onImport: (prompts: any[]) => Promise<void>;
  existingPrompts?: any[];
}

export default function CursorImportDialog({ onClose, onImport, existingPrompts = [] }: CursorImportDialogProps) {
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const [selectedPrompts, setSelectedPrompts] = useState<Set<number>>(new Set());

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    setIsImporting(true);
    setImportResult(null);

    try {
      // Upload file first
      const formData = new FormData();
      formData.append('file', file);

      const uploadResponse = await fetch('/api/import/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload file');
      }

      const { content } = await uploadResponse.json();

      // Process with importer
      const tempFile = new File([content], file.name, { type: file.type });
      const result = await PromptImporter.importFromFile(tempFile, 'cursor');
      
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
      'application/x-sqlite3': ['.vscdb', '.db'],
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
            <Terminal className="w-6 h-6 text-indigo-600" />
            <h2 className="text-xl font-semibold">Import from Cursor IDE</h2>
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
            <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-4">
              <p className="text-sm text-indigo-800 dark:text-indigo-200">
                Cursor state.vscdb parser is in development. Export feature coming soon.
              </p>
            </div>

            <div>
              <h3 className="font-medium mb-4">How to export Cursor chat history:</h3>
              
              <div className="space-y-4">
                <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4 font-mono text-sm">
                  <p className="text-gray-600 dark:text-gray-400 mb-2">Cursor stores chats in:</p>
                  <div className="space-y-1">
                    <p className="text-gray-800 dark:text-gray-200">
                      <strong>Windows:</strong> %APPDATA%\Cursor\User\workspaceStorage\
                    </p>
                    <p className="text-gray-800 dark:text-gray-200">
                      <strong>Mac/Linux:</strong> ~/.config/Cursor/User/workspaceStorage/
                    </p>
                  </div>
                </div>

                <ol className="text-sm text-gray-600 dark:text-gray-400 space-y-2 list-decimal list-inside">
                  <li>Navigate to the Cursor workspace storage folder</li>
                  <li>Find the folder with an MD5 hash name for your workspace</li>
                  <li>Look for <code className="bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded">state.vscdb</code> file</li>
                  <li>Export chats using the CursorChat Downloader extension (recommended)</li>
                  <li>Upload the exported JSON file below</li>
                </ol>

                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                  <p className="text-xs text-blue-800 dark:text-blue-200">
                    <strong>Tip:</strong> Install the CursorChat Downloader VSCode extension to easily export your chat history to JSON format.
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
              <Database className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <p className="text-lg font-medium mb-2">
                {isDragActive ? 'Drop the file here' : 'Drag & drop your Cursor export'}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                or click to select the file
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500">
                JSON exports from CursorChat Downloader recommended
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}