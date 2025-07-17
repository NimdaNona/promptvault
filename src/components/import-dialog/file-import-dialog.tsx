"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import { X, Upload, FileText, AlertCircle, CheckCircle, Loader2, ChevronRight } from "lucide-react";
import { PromptImporter } from "@/lib/importers";
import { toast } from "sonner";

interface FileImportDialogProps {
  onClose: () => void;
  onImport: (prompts: any[]) => Promise<void>;
  existingPrompts?: any[];
}

export default function FileImportDialog({ onClose, onImport, existingPrompts = [] }: FileImportDialogProps) {
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const [selectedPrompts, setSelectedPrompts] = useState<Set<number>>(new Set());

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    setIsImporting(true);
    setImportResult(null);

    try {
      const result = await PromptImporter.importFromFile(file, 'file');
      
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

  const handleImport = async () => {
    if (!importResult) return;

    const promptsToImport = importResult.all.filter((_: any, index: number) => 
      selectedPrompts.has(index)
    );

    if (promptsToImport.length === 0) {
      toast.error('Please select at least one prompt to import');
      return;
    }

    setIsImporting(true);
    try {
      await onImport(promptsToImport);
      onClose();
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Failed to import prompts. Please try again.');
    } finally {
      setIsImporting(false);
    }
  };

  const togglePromptSelection = (index: number) => {
    const newSelection = new Set(selectedPrompts);
    if (newSelection.has(index)) {
      newSelection.delete(index);
    } else {
      newSelection.add(index);
    }
    setSelectedPrompts(newSelection);
  };

  const toggleAll = () => {
    if (selectedPrompts.size === importResult.all.length) {
      setSelectedPrompts(new Set());
    } else {
      setSelectedPrompts(new Set(importResult.all.map((_: any, i: number) => i)));
    }
  };

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
          <h2 className="text-xl font-semibold">Import from File</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {!importResult ? (
            <div className="space-y-6">
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                      Supported file formats:
                    </p>
                    <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                      <li>• <strong>JSON</strong>: Array of prompts with &apos;name&apos; and &apos;content&apos; fields</li>
                      <li>• <strong>TXT/MD</strong>: Prompts separated by double newlines</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-medium mb-4">Example JSON format:</h3>
                <pre className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4 text-sm overflow-x-auto">
                  <code>{`[
  {
    "name": "Code Review Assistant",
    "content": "You are an expert code reviewer..."
  },
  {
    "name": "SQL Query Generator",
    "content": "Generate optimized SQL queries..."
  }
]`}</code>
                </pre>
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
                  {isDragActive ? 'Drop the file here' : 'Drag & drop your file here'}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  or click to select a file
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500">
                  Supported formats: JSON, TXT, MD
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Summary */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-blue-900 dark:text-blue-100">
                      Found {importResult.all.length} prompts
                    </p>
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      {importResult.unique.length} unique, {importResult.duplicates.length} duplicates
                    </p>
                  </div>
                </div>
              </div>

              {/* Selection controls */}
              <div className="flex items-center justify-between">
                <button
                  onClick={toggleAll}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                >
                  {selectedPrompts.size === importResult.all.length ? 'Deselect all' : 'Select all'}
                </button>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {selectedPrompts.size} selected
                </p>
              </div>

              {/* Prompts list */}
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {importResult.all.map((prompt: any, index: number) => {
                  const isDuplicate = importResult.duplicates.includes(prompt);
                  const isSelected = selectedPrompts.has(index);

                  return (
                    <div
                      key={index}
                      onClick={() => togglePromptSelection(index)}
                      className={`p-4 rounded-lg border cursor-pointer transition-all
                        ${isSelected 
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                        }`}
                    >
                      <div className="flex items-start space-x-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <p className="font-medium truncate">{prompt.name}</p>
                            {isDuplicate && (
                              <span className="text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 px-2 py-0.5 rounded">
                                Duplicate
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                            {prompt.content}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                            From: {prompt.metadata.conversationTitle || 'Unknown'}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {importResult && (
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <button
              onClick={() => {
                setImportResult(null);
                setSelectedPrompts(new Set());
              }}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
            >
              Back
            </button>
            <button
              onClick={handleImport}
              disabled={isImporting || selectedPrompts.size === 0}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {isImporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Importing...</span>
                </>
              ) : (
                <>
                  <span>Import {selectedPrompts.size} Prompts</span>
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}