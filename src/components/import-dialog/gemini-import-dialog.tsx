"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { motion } from "framer-motion";
import { X, Upload, Sparkles, Loader2, ChevronRight, Share2, Download } from "lucide-react";
import { PromptImporter } from "@/lib/importers";
import { toast } from "sonner";

interface GeminiImportDialogProps {
  onClose: () => void;
  onImport: (prompts: any[]) => Promise<void>;
  existingPrompts?: any[];
}

export default function GeminiImportDialog({ onClose, onImport, existingPrompts = [] }: GeminiImportDialogProps) {
  const [activeTab, setActiveTab] = useState<'share' | 'export'>('share');
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
      const result = await PromptImporter.importFromFile(tempFile, 'gemini');
      
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
      'text/plain': ['.txt', '.md'],
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
            <Sparkles className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold">Import from Google Gemini</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Tabs */}
          <div className="border-b border-gray-200 dark:border-gray-700">
            <div className="flex">
              <button
                onClick={() => setActiveTab('share')}
                className={`px-6 py-3 font-medium transition-colors relative ${
                  activeTab === 'share'
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                }`}
              >
                Share Link
                {activeTab === 'share' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400" />
                )}
              </button>
              <button
                onClick={() => setActiveTab('export')}
                className={`px-6 py-3 font-medium transition-colors relative ${
                  activeTab === 'export'
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                }`}
              >
                Export to Docs
                {activeTab === 'export' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400" />
                )}
              </button>
            </div>
          </div>

          <div className="p-6">
            {activeTab === 'share' ? (
              <div className="space-y-6">
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    Gemini parser is in development. Please export to Google Docs for now.
                  </p>
                </div>

                <div>
                  <h3 className="font-medium mb-4">How to share a Gemini conversation:</h3>
                  <ol className="text-sm text-gray-600 dark:text-gray-400 space-y-2 list-decimal list-inside">
                    <li>Open the Gemini conversation you want to share</li>
                    <li>Click the share icon <Share2 className="w-4 h-4 inline" /> in the conversation</li>
                    <li>Select &quot;Share conversation&quot; to generate a link</li>
                    <li>Copy the generated share link</li>
                  </ol>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    Gemini Google Docs export parser is coming soon.
                  </p>
                </div>

                <div>
                  <h3 className="font-medium mb-4">How to export Gemini to Google Docs:</h3>
                  <ol className="text-sm text-gray-600 dark:text-gray-400 space-y-2 list-decimal list-inside">
                    <li>Open your Gemini conversation</li>
                    <li>Click the export icon <Download className="w-4 h-4 inline" /></li>
                    <li>Select &quot;Export to Docs&quot;</li>
                    <li>Download the Google Doc as a text file</li>
                    <li>Upload the file below</li>
                  </ol>
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
                  <Upload className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                  <p className="text-lg font-medium mb-2">
                    {isDragActive ? 'Drop the file here' : 'Drag & drop your Gemini export'}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    or click to select a file
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500">
                    Supported formats: TXT, JSON
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}