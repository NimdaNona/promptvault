"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import { X, Upload, FileText, AlertCircle, CheckCircle, Loader2, ChevronRight, Link, Download, MessageSquare, Smartphone, Monitor } from "lucide-react";
import { PromptImporter } from "@/lib/importers";
import { toast } from "sonner";

interface ChatGPTImportDialogProps {
  onClose: () => void;
  onImport: (prompts: any[]) => Promise<void>;
  existingPrompts?: any[];
}

export default function ChatGPTImportDialog({ onClose, onImport, existingPrompts = [] }: ChatGPTImportDialogProps) {
  const [activeTab, setActiveTab] = useState<'share' | 'export'>('share');
  const [shareLink, setShareLink] = useState('');
  const [conversationText, setConversationText] = useState('');
  const [showPasteDialog, setShowPasteDialog] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const [selectedPrompts, setSelectedPrompts] = useState<Set<number>>(new Set());

  const handleConversationText = async () => {
    if (!conversationText.trim()) {
      toast.error('Please paste the conversation text');
      return;
    }

    setIsImporting(true);
    try {
      const response = await fetch('/api/import/chatgpt-share', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ conversationText }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process conversation');
      }

      if (data.success && data.prompts) {
        // Format prompts to match ExtractedPrompt interface
        const formattedPrompts = data.prompts.map((prompt: any) => ({
          name: prompt.text.slice(0, 50) + (prompt.text.length > 50 ? '...' : ''),
          content: prompt.text,
          metadata: {
            source: 'chatgpt' as const,
            conversationId: `share-${Date.now()}`,
            conversationTitle: 'Imported from Share Link',
            timestamp: new Date(prompt.timestamp || Date.now()).getTime(),
            model: 'gpt-4'
          }
        }));
        
        // Process the extracted prompts
        const { unique, duplicates } = PromptImporter.detectDuplicates(formattedPrompts, existingPrompts);
        
        // Pre-select all unique prompts
        const preSelected = new Set(unique.map((_, index) => index));
        setSelectedPrompts(preSelected);
        
        setImportResult({
          all: formattedPrompts,
          unique,
          duplicates,
        });
        
        setShowPasteDialog(false);
        setConversationText('');
        toast.success(`Found ${data.prompts.length} prompts from ChatGPT`);
      } else {
        toast.error('No prompts found in the conversation');
      }
    } catch (error) {
      console.error('Conversation text error:', error);
      toast.error('Failed to process conversation text');
    } finally {
      setIsImporting(false);
    }
  };

  const handleShareLink = async () => {
    if (!shareLink.trim()) {
      toast.error('Please enter a share link');
      return;
    }

    // Validate ChatGPT share link format
    if (!shareLink.includes('chatgpt.com/share/') && !shareLink.includes('chat.openai.com/share/')) {
      toast.error('Invalid ChatGPT share link format');
      return;
    }

    setIsImporting(true);
    try {
      const response = await fetch('/api/import/chatgpt-share', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ shareLink }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process share link');
      }

      if (!data.success && data.requiresManualCopy) {
        // Show paste dialog for manual copy
        setShowPasteDialog(true);
        toast.info('Please copy the conversation text from ChatGPT');
      } else if (data.success && data.prompts) {
        // Format prompts to match ExtractedPrompt interface
        const formattedPrompts = data.prompts.map((prompt: any) => ({
          name: prompt.text.slice(0, 50) + (prompt.text.length > 50 ? '...' : ''),
          content: prompt.text,
          metadata: {
            source: 'chatgpt' as const,
            conversationId: data.conversationId || `share-${Date.now()}`,
            conversationTitle: 'Imported from Share Link',
            timestamp: new Date(prompt.timestamp || Date.now()).getTime(),
            model: 'gpt-4'
          }
        }));
        
        // Process the extracted prompts
        const { unique, duplicates } = PromptImporter.detectDuplicates(formattedPrompts, existingPrompts);
        
        // Pre-select all unique prompts
        const preSelected = new Set(unique.map((_, index) => index));
        setSelectedPrompts(preSelected);
        
        setImportResult({
          all: formattedPrompts,
          unique,
          duplicates,
        });
        
        toast.success(`Found ${data.prompts.length} prompts from ChatGPT`);
      } else {
        // Fallback to export tab
        toast.info(data.message || 'Please use the export method');
        setActiveTab('export');
      }
    } catch (error) {
      console.error('Share link error:', error);
      toast.error('Failed to process share link');
    } finally {
      setIsImporting(false);
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    console.log('onDrop triggered with files:', acceptedFiles);
    if (acceptedFiles.length === 0) {
      console.log('No files accepted');
      return;
    }

    const file = acceptedFiles[0];
    console.log('Processing file:', file.name, file.type, file.size);
    setIsImporting(true);
    setImportResult(null);

    try {
      // First upload the file to get its content
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

      // Create a temporary file object with the content for the importer
      const tempFile = new File([content], file.name, { type: file.type });
      const result = await PromptImporter.importFromFile(tempFile, 'chatgpt');
      console.log('Import result:', result);
      
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

  const { getRootProps, getInputProps, isDragActive, acceptedFiles, fileRejections } = useDropzone({
    onDrop,
    accept: {
      'application/json': ['.json'],
    },
    maxFiles: 1,
    onDropAccepted: (files) => {
      console.log('Files accepted:', files);
    },
    onDropRejected: (fileRejections) => {
      console.log('Files rejected:', fileRejections);
      fileRejections.forEach(({ file, errors }) => {
        errors.forEach(error => {
          if (error.code === 'file-invalid-type') {
            toast.error(`Invalid file type: ${file.type}. Please upload a JSON file.`);
          } else {
            toast.error(error.message);
          }
        });
      });
    },
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
          source: 'chatgpt',
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

      // Call parent callback
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
            <MessageSquare className="w-6 h-6 text-green-600" />
            <h2 className="text-xl font-semibold">Import from ChatGPT</h2>
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
                    Export File
                    {activeTab === 'export' && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400" />
                    )}
                  </button>
                </div>
              </div>

              <div className="p-6">
                {activeTab === 'share' ? (
                  <div className="space-y-6">

                    <div>
                      <h3 className="font-medium mb-4">How to share a ChatGPT conversation:</h3>
                      
                      <div className="space-y-4">
                        <div className="flex items-start space-x-3">
                          <Monitor className="w-5 h-5 text-gray-600 dark:text-gray-400 mt-0.5" />
                          <div>
                            <p className="font-medium mb-1">Desktop</p>
                            <ol className="text-sm text-gray-600 dark:text-gray-400 space-y-1 list-decimal list-inside">
                              <li>Open the ChatGPT conversation you want to share</li>
                              <li>Click the share icon in the top right</li>
                              <li>Click &quot;Share Link&quot; to generate a public link</li>
                              <li>Copy the link and paste it below</li>
                            </ol>
                          </div>
                        </div>

                        <div className="flex items-start space-x-3">
                          <Smartphone className="w-5 h-5 text-gray-600 dark:text-gray-400 mt-0.5" />
                          <div>
                            <p className="font-medium mb-1">Mobile</p>
                            <ol className="text-sm text-gray-600 dark:text-gray-400 space-y-1 list-decimal list-inside">
                              <li>Open the ChatGPT app</li>
                              <li>Long press on the conversation</li>
                              <li>Tap &quot;Share&quot; and then &quot;Share Link&quot;</li>
                              <li>Copy the link and paste it below</li>
                            </ol>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">ChatGPT Share Link</label>
                      <div className="flex space-x-2">
                        <input
                          type="text"
                          value={shareLink}
                          onChange={(e) => setShareLink(e.target.value)}
                          placeholder="https://chatgpt.com/share/..."
                          className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                        />
                        <button
                          onClick={handleShareLink}
                          disabled={isImporting || !shareLink.trim()}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                        >
                          {isImporting ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Link className="w-4 h-4" />
                          )}
                          <span>Import</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div>
                      <h3 className="font-medium mb-4">How to export your ChatGPT data:</h3>
                      <ol className="text-sm text-gray-600 dark:text-gray-400 space-y-2 list-decimal list-inside">
                        <li>Go to <a href="https://chatgpt.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">chatgpt.com</a></li>
                        <li>Click on your profile picture → Settings</li>
                        <li>Go to Data Controls → Export data</li>
                        <li>Click &quot;Export&quot; and confirm</li>
                        <li>You&apos;ll receive an email with a download link (may take a few minutes)</li>
                        <li>Download and extract the ZIP file</li>
                        <li>Upload the <code className="bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded">conversations.json</code> file below</li>
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
                        {isDragActive ? 'Drop the file here' : 'Drag & drop your conversations.json file'}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                        or click to select the file
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500">
                        Only JSON files from ChatGPT export are supported
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="p-6 space-y-4">
              {/* Summary */}
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-green-900 dark:text-green-100">
                      Found {importResult.all.length} prompts from ChatGPT
                    </p>
                    <p className="text-sm text-green-800 dark:text-green-200">
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
                            {prompt.metadata?.model && (
                              <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded">
                                {prompt.metadata.model}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                            {prompt.content}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                            From: {prompt.metadata.conversationTitle || 'Untitled Chat'}
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

      {/* Paste Conversation Dialog */}
      <AnimatePresence>
        {showPasteDialog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[60]">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col"
            >
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <h3 className="text-lg font-semibold">Paste ChatGPT Conversation</h3>
                <button
                  onClick={() => {
                    setShowPasteDialog(false);
                    setConversationText('');
                  }}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 p-6 overflow-y-auto">
                <div className="space-y-4">
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      1. Open the ChatGPT share link: <a href={shareLink} target="_blank" rel="noopener noreferrer" className="underline">{shareLink}</a>
                    </p>
                    <p className="text-sm text-blue-800 dark:text-blue-200 mt-2">
                      2. Select all text on the page (Ctrl+A or Cmd+A)
                    </p>
                    <p className="text-sm text-blue-800 dark:text-blue-200 mt-2">
                      3. Copy the text (Ctrl+C or Cmd+C)
                    </p>
                    <p className="text-sm text-blue-800 dark:text-blue-200 mt-2">
                      4. Paste it in the text area below
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Conversation Text</label>
                    <textarea
                      value={conversationText}
                      onChange={(e) => setConversationText(e.target.value)}
                      placeholder="Paste the entire ChatGPT conversation here..."
                      className="w-full h-64 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 resize-none"
                    />
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <button
                  onClick={() => {
                    setShowPasteDialog(false);
                    setConversationText('');
                  }}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConversationText}
                  disabled={isImporting || !conversationText.trim()}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {isImporting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <span>Extract Prompts</span>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}