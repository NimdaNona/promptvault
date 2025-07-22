'use client';

import { useEffect, useState, useCallback } from 'react';
import { ImportProgress } from '@/lib/types/import';

export function useImportProgress(sessionId: string | null) {
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connect = useCallback(() => {
    if (!sessionId) return;

    const eventSource = new EventSource(`/api/import/progress/${sessionId}`);

    eventSource.onopen = () => {
      setIsConnected(true);
      setError(null);
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as ImportProgress;
        setProgress(data);
      } catch (err) {
        console.error('Failed to parse progress data:', err);
      }
    };

    eventSource.onerror = (err) => {
      console.error('SSE error:', err);
      setIsConnected(false);
      setError('Connection lost. Retrying...');
      
      // EventSource will automatically reconnect
      // but we can add custom logic here if needed
    };

    return eventSource;
  }, [sessionId]);

  useEffect(() => {
    const eventSource = connect();

    return () => {
      eventSource?.close();
    };
  }, [connect]);

  return {
    progress,
    isConnected,
    error,
  };
}