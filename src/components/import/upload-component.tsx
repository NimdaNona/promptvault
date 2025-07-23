'use client';

import { useState, useCallback } from 'react';
import { upload } from '@vercel/blob/client';
import { useAuth } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Upload, CheckCircle, XCircle } from 'lucide-react';
import { ImportPlatform } from '@/lib/types/import';

interface UploadComponentProps {
  platform: ImportPlatform;
  onUploadComplete: (blobUrl: string, importSessionId: string) => void;
  onError: (error: string) => void;
}

export function UploadComponent({ platform, onUploadComplete, onError }: UploadComponentProps) {
  const { userId } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'processing' | 'complete' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');

  const handleUpload = useCallback(async (file: File) => {
    if (!userId) {
      onError('User not authenticated');
      return;
    }

    // Validate file size (max 500MB for Vercel Blob)
    const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB
    if (file.size > MAX_FILE_SIZE) {
      onError('File size exceeds 500MB limit');
      return;
    }

    // Validate file type
    const validTypes = ['application/json', 'text/plain', 'text/markdown', 'text/csv'];
    if (!validTypes.includes(file.type) && !file.name.endsWith('.md')) {
      onError('Invalid file type. Please upload JSON, TXT, MD, or CSV files.');
      return;
    }

    setIsUploading(true);
    setUploadStatus('uploading');
    setStatusMessage('Uploading file...');

    try {
      // Step 1: Create import session
      const sessionResponse = await fetch('/api/import/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform,
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type || 'text/plain'
        })
      });

      if (!sessionResponse.ok) {
        throw new Error('Failed to create import session');
      }

      const { sessionId } = await sessionResponse.json();

      // Step 2: Upload file to Vercel Blob with multipart support
      const blob = await upload(file.name, file, {
        access: 'public',
        handleUploadUrl: '/api/import/upload-handler',
        clientPayload: JSON.stringify({ sessionId, platform }),
        onUploadProgress: (progress) => {
          setUploadProgress(Math.round((progress.loaded / progress.total) * 100));
          setStatusMessage(`Uploading... ${Math.round((progress.loaded / progress.total) * 100)}%`);
        }
      });

      // Step 3: Trigger background processing
      setUploadStatus('processing');
      setStatusMessage('Processing file...');
      setUploadProgress(100);

      const processResponse = await fetch('/api/import/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          blobUrl: blob.url,
          platform
        })
      });

      if (!processResponse.ok) {
        throw new Error('Failed to start processing');
      }

      setUploadStatus('complete');
      setStatusMessage('Upload complete! Processing in background...');
      onUploadComplete(blob.url, sessionId);

    } catch (error) {
      console.error('Upload error:', error);
      setUploadStatus('error');
      setStatusMessage(error instanceof Error ? error.message : 'Upload failed');
      onError(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  }, [userId, platform, onUploadComplete, onError]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleUpload(file);
    }
  }, [handleUpload]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleUpload(file);
    }
  }, [handleUpload]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  return (
    <div className="space-y-4">
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isUploading ? 'border-gray-300 bg-gray-50' : 'border-gray-400 hover:border-gray-500'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <input
          type="file"
          id="file-upload"
          className="hidden"
          accept=".json,.txt,.md,.csv"
          onChange={handleFileSelect}
          disabled={isUploading}
        />
        
        {uploadStatus === 'idle' && (
          <>
            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <label
              htmlFor="file-upload"
              className={`cursor-pointer ${isUploading ? 'opacity-50' : ''}`}
            >
              <Button variant="outline" disabled={isUploading} data-upload-trigger>
                Choose File
              </Button>
            </label>
            <p className="mt-2 text-sm text-gray-600">
              or drag and drop your {platform} export file here
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Supports JSON, TXT, MD, CSV up to 500MB
            </p>
          </>
        )}

        {uploadStatus === 'uploading' && (
          <>
            <Loader2 className="mx-auto h-12 w-12 text-blue-500 animate-spin mb-4" />
            <p className="text-sm font-medium text-gray-900">{statusMessage}</p>
            <Progress value={uploadProgress} className="mt-4 max-w-xs mx-auto" />
          </>
        )}

        {uploadStatus === 'processing' && (
          <>
            <Loader2 className="mx-auto h-12 w-12 text-green-500 animate-spin mb-4" />
            <p className="text-sm font-medium text-gray-900">{statusMessage}</p>
          </>
        )}

        {uploadStatus === 'complete' && (
          <>
            <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-4" />
            <p className="text-sm font-medium text-green-700">{statusMessage}</p>
          </>
        )}

        {uploadStatus === 'error' && (
          <>
            <XCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
            <p className="text-sm font-medium text-red-700">{statusMessage}</p>
            <Button
              variant="outline"
              onClick={() => {
                setUploadStatus('idle');
                setUploadProgress(0);
                setStatusMessage('');
              }}
              className="mt-4"
            >
              Try Again
            </Button>
          </>
        )}
      </div>

      {uploadStatus === 'processing' || uploadStatus === 'complete' ? (
        <Alert>
          <AlertDescription>
            Your file is being processed in the background. You can navigate away from this page.
            We&apos;ll notify you when the import is complete.
          </AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}