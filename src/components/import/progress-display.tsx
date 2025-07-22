'use client';

import { useImportProgress } from '@/hooks/use-import-progress';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle, XCircle, Loader2, AlertCircle } from 'lucide-react';

interface ProgressDisplayProps {
  sessionId: string;
  onComplete?: () => void;
}

export function ProgressDisplay({ sessionId, onComplete }: ProgressDisplayProps) {
  const { progress, isConnected, error } = useImportProgress(sessionId);

  if (!isConnected && !progress) {
    return (
      <Alert>
        <Loader2 className="h-4 w-4 animate-spin" />
        <AlertTitle>Connecting...</AlertTitle>
        <AlertDescription>
          Establishing connection to track import progress...
        </AlertDescription>
      </Alert>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Connection Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!progress) {
    return (
      <Alert>
        <Loader2 className="h-4 w-4 animate-spin" />
        <AlertTitle>Waiting for progress...</AlertTitle>
      </Alert>
    );
  }

  const getStatusIcon = () => {
    switch (progress.status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Loader2 className="h-4 w-4 animate-spin" />;
    }
  };

  const getStatusColor = () => {
    switch (progress.status) {
      case 'completed':
        return 'bg-green-50 border-green-200';
      case 'failed':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  // Call onComplete when import is finished
  if (progress.status === 'completed' && onComplete) {
    onComplete();
  }

  return (
    <div className={`rounded-lg border p-4 ${getStatusColor()}`}>
      <div className="flex items-start space-x-3">
        {getStatusIcon()}
        <div className="flex-1">
          <h3 className="font-medium text-gray-900">
            {progress.status === 'completed' && 'Import Complete!'}
            {progress.status === 'failed' && 'Import Failed'}
            {progress.status === 'processing' && 'Processing Import...'}
            {progress.status === 'pending' && 'Preparing Import...'}
          </h3>
          
          <p className="mt-1 text-sm text-gray-600">{progress.message}</p>
          
          {progress.totalPrompts !== undefined && progress.processedPrompts !== undefined && (
            <div className="mt-3">
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>Progress</span>
                <span>
                  {progress.processedPrompts} / {progress.totalPrompts} prompts
                </span>
              </div>
              <Progress value={progress.progress} className="h-2" />
            </div>
          )}

          {progress.errors && progress.errors.length > 0 && (
            <div className="mt-3">
              <h4 className="text-sm font-medium text-red-700">Errors:</h4>
              <ul className="mt-1 text-sm text-red-600 list-disc list-inside">
                {progress.errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}