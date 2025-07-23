'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Folder, 
  FileText, 
  Search, 
  AlertCircle, 
  Loader2,
  HardDrive,
  CheckCircle2
} from 'lucide-react';
import { cn, formatBytes } from '@/lib/utils/cn';

interface DirectoryInfo {
  path: string;
  files: Array<{
    name: string;
    path: string;
    size: number;
    modified: string;
    preview?: string;
  }>;
  error?: string;
}

interface ClineFolderImportProps {
  onImport: (files: Array<{ url: string; filename: string; content: string }>) => void;
  onError: (error: string) => void;
}

export function ClineFolderImport({ onImport, onError }: ClineFolderImportProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [directories, setDirectories] = useState<DirectoryInfo[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [platform, setPlatform] = useState<string>('');
  const [isImporting, setIsImporting] = useState(false);

  // Detect platform
  useEffect(() => {
    const detectPlatform = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      if (userAgent.includes('win')) return 'windows';
      if (userAgent.includes('mac')) return 'mac';
      return 'linux';
    };
    setPlatform(detectPlatform());
  }, []);

  const scanDirectories = async () => {
    setIsScanning(true);
    setDirectories([]);
    setSelectedFiles(new Set());

    try {
      const response = await fetch('/api/import/cline/scan-directory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to scan directories');
      }

      const data = await response.json();
      setDirectories(data.directories);

      // Auto-select all files by default
      const allFilePaths = data.directories.flatMap((d: DirectoryInfo) => 
        d.files.map(f => f.path)
      );
      setSelectedFiles(new Set(allFilePaths));

    } catch (error) {
      console.error('Scan error:', error);
      onError(error instanceof Error ? error.message : 'Failed to scan directories');
    } finally {
      setIsScanning(false);
    }
  };

  const toggleFile = (filePath: string) => {
    const newSelected = new Set(selectedFiles);
    if (newSelected.has(filePath)) {
      newSelected.delete(filePath);
    } else {
      newSelected.add(filePath);
    }
    setSelectedFiles(newSelected);
  };

  const toggleDirectory = (dir: DirectoryInfo) => {
    const dirFilePaths = dir.files.map(f => f.path);
    const allSelected = dirFilePaths.every(p => selectedFiles.has(p));
    
    const newSelected = new Set(selectedFiles);
    if (allSelected) {
      dirFilePaths.forEach(p => newSelected.delete(p));
    } else {
      dirFilePaths.forEach(p => newSelected.add(p));
    }
    setSelectedFiles(newSelected);
  };

  const importSelectedFiles = async () => {
    if (selectedFiles.size === 0) {
      onError('No files selected');
      return;
    }

    setIsImporting(true);
    const files: Array<{ url: string; filename: string; content: string }> = [];

    try {
      // Read each selected file
      for (const filePath of selectedFiles) {
        const response = await fetch(`/api/import/cline/scan-directory?path=${encodeURIComponent(filePath)}`);
        
        if (!response.ok) {
          console.error(`Failed to read file: ${filePath}`);
          continue;
        }

        const data = await response.json();
        files.push({
          url: `file://${filePath}`,
          filename: data.name,
          content: data.content,
        });
      }

      if (files.length === 0) {
        throw new Error('No files could be read');
      }

      // Trigger import
      onImport(files);

    } catch (error) {
      console.error('Import error:', error);
      onError(error instanceof Error ? error.message : 'Failed to import files');
    } finally {
      setIsImporting(false);
    }
  };

  const totalSize = directories.reduce((sum, dir) => 
    sum + dir.files.filter(f => selectedFiles.has(f.path)).reduce((s, f) => s + f.size, 0), 0
  );

  return (
    <div className="space-y-4">
      {/* Scan Button */}
      <div className="flex items-center justify-between">
        <Button
          onClick={scanDirectories}
          disabled={isScanning || isImporting}
          className="w-full"
          data-scan-trigger
        >
          {isScanning ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Scanning VSCode directories...
            </>
          ) : (
            <>
              <Search className="mr-2 h-4 w-4" />
              Scan for Cline Tasks
            </>
          )}
        </Button>
      </div>

      {/* Platform Info */}
      {platform && !isScanning && directories.length === 0 && (
        <Alert>
          <HardDrive className="h-4 w-4" />
          <AlertDescription>
            Click &quot;Scan for Cline Tasks&quot; to search your {platform === 'windows' ? 'Windows' : platform === 'mac' ? 'macOS' : 'Linux'} VSCode storage folders.
          </AlertDescription>
        </Alert>
      )}

      {/* Results */}
      {directories.length > 0 && (
        <>
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>
              Found {directories.reduce((sum, d) => sum + d.files.length, 0)} Cline task files in {directories.length} director{directories.length === 1 ? 'y' : 'ies'}
            </AlertDescription>
          </Alert>

          <ScrollArea className="h-[300px] border rounded-lg">
            <div className="p-4 space-y-4">
              {directories.map((dir, idx) => (
                <Card key={idx} className="p-3">
                  <div className="space-y-2">
                    {/* Directory Header */}
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={dir.files.every(f => selectedFiles.has(f.path))}
                        onCheckedChange={() => toggleDirectory(dir)}
                      />
                      <Folder className="h-4 w-4 text-gray-500" />
                      <span className="text-sm font-medium flex-1 truncate" title={dir.path}>
                        {dir.path.split(/[/\\]/).slice(-3).join('/')}
                      </span>
                      <span className="text-xs text-gray-500">
                        {dir.files.length} file{dir.files.length !== 1 ? 's' : ''}
                      </span>
                    </div>

                    {/* Files */}
                    <div className="ml-6 space-y-1">
                      {dir.files.map((file) => (
                        <div key={file.path} className="flex items-start gap-2 py-1">
                          <Checkbox
                            checked={selectedFiles.has(file.path)}
                            onCheckedChange={() => toggleFile(file.path)}
                            className="mt-0.5"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <FileText className="h-3 w-3 text-gray-400 flex-shrink-0" />
                              <span className="text-sm truncate" title={file.name}>
                                {file.name}
                              </span>
                              <span className="text-xs text-gray-500">
                                {formatBytes(file.size)}
                              </span>
                            </div>
                            {file.preview && (
                              <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                                {file.preview}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </ScrollArea>

          {/* Import Button */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">
              {selectedFiles.size} file{selectedFiles.size !== 1 ? 's' : ''} selected
              {totalSize > 0 && ` (${formatBytes(totalSize)})`}
            </span>
            <Button
              onClick={importSelectedFiles}
              disabled={selectedFiles.size === 0 || isImporting}
              variant="default"
            >
              {isImporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importing...
                </>
              ) : (
                <>Import Selected Files</>
              )}
            </Button>
          </div>
        </>
      )}

      {/* No Results */}
      {!isScanning && directories.length === 0 && directories.some(d => d.error) && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No Cline task files found in the default VSCode directories. 
            Make sure Cline is installed and you have exported some tasks.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}