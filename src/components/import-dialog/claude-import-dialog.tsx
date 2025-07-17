"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import { X, Upload, FileText, AlertCircle, CheckCircle, Loader2, ChevronRight, Brain, Download, Terminal, FolderOpen } from "lucide-react";
import { PromptImporter } from "@/lib/importers";
import { toast } from "sonner";

interface ClaudeImportDialogProps {
  onClose: () => void;
  onImport: (prompts: any[]) => Promise<void>;
  existingPrompts?: any[];
}

export default function ClaudeImportDialog({ onClose, onImport, existingPrompts = [] }: ClaudeImportDialogProps) {
  const [activeTab, setActiveTab] = useState<'app' | 'code'>('app');
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
      const result = await PromptImporter.importFromFile(tempFile, 'claude');
      
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

      toast.success(`Found ${result.prompts.length} prompts to import`);
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Failed to import file. Please check the format and try again.');
    } finally {
      setIsImporting(false);
    }
  }, [existingPrompts]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: activeTab === 'code' 
      ? { 
          'application/x-ndjson': ['.jsonl'],
          'text/plain': ['.jsonl'] 
        }
      : { 'application/json': ['.json'] },
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
      // Call the bulk import API
      const response = await fetch('/api/import/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompts: promptsToImport,
          source: 'claude',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to import prompts');
      }

      const data = await response.json();
      toast.success(`Successfully imported ${data.imported} prompts`);
      
      if (data.skipped > 0) {
        toast.warning(`Skipped ${data.skipped} prompts due to errors`);
      }

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
          <div className="flex items-center space-x-3">
            <Brain className="w-6 h-6 text-orange-600" />
            <h2 className="text-xl font-semibold">Import from Claude</h2>
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
          {!importResult ? (
            <>
              {/* Tabs */}
              <div className="border-b border-gray-200 dark:border-gray-700">
                <div className="flex">
                  <button
                    onClick={() => setActiveTab('app')}
                    className={`px-6 py-3 font-medium transition-colors relative ${
                      activeTab === 'app'
                        ? 'text-blue-600 dark:text-blue-400'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                    }`}
                  >
                    Claude App
                    {activeTab === 'app' && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400" />
                    )}
                  </button>
                  <button
                    onClick={() => setActiveTab('code')}
                    className={`px-6 py-3 font-medium transition-colors relative ${
                      activeTab === 'code'
                        ? 'text-blue-600 dark:text-blue-400'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                    }`}
                  >
                    Claude Code
                    {activeTab === 'code' && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400" />
                    )}
                  </button>
                </div>
              </div>

              <div className="p-6">
                {activeTab === 'app' ? (
                  <div className="space-y-6">
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                      <p className="text-sm text-blue-800 dark:text-blue-200">
                        Claude app export is now supported. Follow the steps below to export your data.
                      </p>
                    </div>

                    <div>
                      <h3 className="font-medium mb-4">How to export your Claude data:</h3>
                      <ol className="text-sm text-gray-600 dark:text-gray-400 space-y-2 list-decimal list-inside">
                        <li>Open <a href="https://claude.ai" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">claude.ai</a> in your browser</li>
                        <li>Click on your name in the sidebar</li>
                        <li>Go to Settings → Account</li>
                        <li>Click "Export your data"</li>
                        <li>You'll receive an email with a download link</li>
                        <li>Download and extract the ZIP file</li>
                        <li>Upload the data export JSON file below</li>
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
                        {isDragActive ? 'Drop the file here' : 'Drag & drop your Claude export file'}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                        or click to select the file
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500">
                        Only JSON files from Claude export are supported
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                      <p className="text-sm text-blue-800 dark:text-blue-200">
                        Claude Code JSONL files are supported. Upload your session files below.
                      </p>
                    </div>

                    <div>
                      <h3 className="font-medium mb-4">How to find Claude Code session files:</h3>
                      
                      <div className="space-y-4">
                        <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4 font-mono text-sm">
                          <p className="text-gray-600 dark:text-gray-400 mb-2">Session files location:</p>
                          <code className="text-gray-800 dark:text-gray-200">~/.claude/projects/</code>
                        </div>

                        <ol className="text-sm text-gray-600 dark:text-gray-400 space-y-2 list-decimal list-inside">
                          <li>Open a terminal or file explorer</li>
                          <li>Navigate to your home directory</li>
                          <li>Find the <code className="bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded">.claude/projects/</code> folder</li>
                          <li>Each folder contains <code className="bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded">.jsonl</code> files with your sessions</li>
                          <li>Upload the JSONL file for the session you want to import</li>
                        </ol>

                        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                          <div className="flex items-start space-x-2">
                            <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                            <p className="text-xs text-yellow-800 dark:text-yellow-200">
                              JSONL files can be large. We'll extract only your prompts, not Claude's responses.
                            </p>
                          </div>
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
                      <Terminal className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                      <p className="text-lg font-medium mb-2">
                        {isDragActive ? 'Drop the JSONL file here' : 'Drag & drop your Claude Code JSONL file'}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                        or click to select the file
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500">
                        Only JSONL files from Claude Code sessions are supported
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="p-6 space-y-4">
              {/* Summary */}
              <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-5 h-5 text-orange-600 dark:text-orange-400 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-orange-900 dark:text-orange-100">
                      Found {importResult.all.length} prompts from Claude
                    </p>
                    <p className="text-sm text-orange-800 dark:text-orange-200">
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
                            {prompt.metadata.conversationTitle || 'Claude Session'}
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