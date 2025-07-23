'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, RefreshCw, FileText, HelpCircle, SkipForward } from 'lucide-react';
import { ClineImportError, ClineErrorHandler } from '@/lib/importers/cline-error-handler';
import { ClineImportAnalytics } from '@/lib/analytics/cline-import-analytics';

interface ErrorRecoveryDialogProps {
  error: ClineImportError | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRetry: () => void;
  onSkip: () => void;
  onViewGuide?: () => void;
  sessionId?: string;
}

export function ErrorRecoveryDialog({
  error,
  open,
  onOpenChange,
  onRetry,
  onSkip,
  onViewGuide,
  sessionId,
}: ErrorRecoveryDialogProps) {
  const [isRetrying, setIsRetrying] = useState(false);

  if (!error) return null;

  const actions = ClineErrorHandler.getRecoveryActions(error);
  const formattedError = ClineErrorHandler.formatErrorForUser(error);

  const handleAction = async (action: string) => {
    // Track analytics
    if (sessionId) {
      const actionMap: Record<string, 'retry' | 'skip' | 'view_help' | 'cancel'> = {
        'retry': 'retry',
        'skip': 'skip', 
        'view_guide': 'view_help',
        'support': 'view_help',
      };
      
      const trackAction = actionMap[action];
      if (trackAction) {
        ClineImportAnalytics.trackUserAction(sessionId, trackAction);
      }
    }
    
    switch (action) {
      case 'retry':
        setIsRetrying(true);
        await onRetry();
        setIsRetrying(false);
        break;
      
      case 'skip':
        onSkip();
        onOpenChange(false);
        break;
      
      case 'view_guide':
        onViewGuide?.();
        break;
      
      case 'support':
        window.open('/support', '_blank');
        break;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            Import Error
          </DialogTitle>
          <DialogDescription>
            {error.recoverable 
              ? 'An error occurred during import, but it may be recoverable.'
              : 'An error occurred that requires manual intervention.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert variant={error.recoverable ? 'default' : 'destructive'}>
            <AlertDescription className="whitespace-pre-wrap text-sm">
              {formattedError}
            </AlertDescription>
          </Alert>

          {/* Error details */}
          {(error.file || error.line) && (
            <div className="bg-gray-50 rounded-md p-3 text-sm">
              {error.file && (
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-600">File:</span>
                  <code className="text-gray-900">{error.file}</code>
                </div>
              )}
              {error.line && (
                <div className="mt-1">
                  <span className="text-gray-600">Line:</span>
                  <code className="text-gray-900 ml-1">{error.line}</code>
                </div>
              )}
            </div>
          )}

          {/* Recovery suggestions */}
          {error.suggestion && (
            <div className="flex gap-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <HelpCircle className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-blue-800">{error.suggestion}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <div className="flex gap-2 flex-wrap">
            {actions.map((action) => (
              <Button
                key={action.action}
                variant={action.primary ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleAction(action.action)}
                disabled={isRetrying && action.action === 'retry'}
              >
                {action.action === 'retry' && <RefreshCw className="h-4 w-4 mr-1" />}
                {action.action === 'skip' && <SkipForward className="h-4 w-4 mr-1" />}
                {action.action === 'view_guide' && <FileText className="h-4 w-4 mr-1" />}
                {action.action === 'support' && <HelpCircle className="h-4 w-4 mr-1" />}
                {action.label}
              </Button>
            ))}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function useErrorRecovery() {
  const [error, setError] = useState<ClineImportError | null>(null);
  const [showDialog, setShowDialog] = useState(false);

  const handleError = (err: Error, context?: { file?: string; line?: number }) => {
    const analyzedError = ClineErrorHandler.analyzeError(err, context);
    ClineErrorHandler.logError(analyzedError);
    setError(analyzedError);
    setShowDialog(true);
  };

  const clearError = () => {
    setError(null);
    setShowDialog(false);
  };

  return {
    error,
    showDialog,
    setShowDialog,
    handleError,
    clearError,
  };
}