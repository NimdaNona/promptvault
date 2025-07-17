import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { PromptImporter, ImportSource, ExtractedPrompt } from '@/lib/importers';

interface UseFileImportOptions {
  source: ImportSource;
  existingPrompts?: any[];
  onSuccess?: (prompts: ExtractedPrompt[]) => void;
}

interface ImportResult {
  all: ExtractedPrompt[];
  unique: ExtractedPrompt[];
  duplicates: ExtractedPrompt[];
}

export function useFileImport({ source, existingPrompts = [], onSuccess }: UseFileImportOptions) {
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [selectedPrompts, setSelectedPrompts] = useState<Set<number>>(new Set());

  const processFile = useCallback(async (file: File) => {
    setIsImporting(true);
    setImportResult(null);

    try {
      // Upload file to get content
      const formData = new FormData();
      formData.append('file', file);

      const uploadResponse = await fetch('/api/import/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        const error = await uploadResponse.json();
        throw new Error(error.error || 'Failed to upload file');
      }

      const { content } = await uploadResponse.json();

      // Process with importer
      const tempFile = new File([content], file.name, { type: file.type });
      const result = await PromptImporter.importFromFile(tempFile, source);
      
      if (result.errors.length > 0) {
        result.errors.forEach(error => toast.error(error));
        if (result.prompts.length === 0) {
          setIsImporting(false);
          return null;
        }
      }

      result.warnings.forEach(warning => toast.warning(warning));

      // Check for duplicates
      const { unique, duplicates } = PromptImporter.detectDuplicates(result.prompts, existingPrompts);
      
      // Pre-select all unique prompts
      const preSelected = new Set(unique.map((_, index) => index));
      setSelectedPrompts(preSelected);

      const importData = {
        all: result.prompts,
        unique,
        duplicates,
      };

      setImportResult(importData);
      toast.success(`Found ${result.prompts.length} prompts to import`);
      
      if (onSuccess) {
        onSuccess(result.prompts);
      }

      return importData;
    } catch (error) {
      console.error('Import error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to import file');
      return null;
    } finally {
      setIsImporting(false);
    }
  }, [source, existingPrompts, onSuccess]);

  const importSelected = useCallback(async () => {
    if (!importResult) return;

    const promptsToImport = importResult.all.filter((_, index) => 
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
          source,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to import prompts');
      }

      const data = await response.json();
      toast.success(`Successfully imported ${data.imported} prompts`);
      
      if (data.skipped > 0) {
        toast.warning(`Skipped ${data.skipped} prompts due to errors`);
      }

      return data;
    } catch (error) {
      console.error('Import error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to import prompts');
      throw error;
    } finally {
      setIsImporting(false);
    }
  }, [importResult, selectedPrompts, source]);

  const togglePromptSelection = useCallback((index: number) => {
    const newSelection = new Set(selectedPrompts);
    if (newSelection.has(index)) {
      newSelection.delete(index);
    } else {
      newSelection.add(index);
    }
    setSelectedPrompts(newSelection);
  }, [selectedPrompts]);

  const toggleAll = useCallback(() => {
    if (!importResult) return;
    
    if (selectedPrompts.size === importResult.all.length) {
      setSelectedPrompts(new Set());
    } else {
      setSelectedPrompts(new Set(importResult.all.map((_, i) => i)));
    }
  }, [importResult, selectedPrompts]);

  const reset = useCallback(() => {
    setImportResult(null);
    setSelectedPrompts(new Set());
  }, []);

  return {
    isImporting,
    importResult,
    selectedPrompts,
    processFile,
    importSelected,
    togglePromptSelection,
    toggleAll,
    reset,
  };
}