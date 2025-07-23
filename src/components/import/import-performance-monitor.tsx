'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { 
  Activity, 
  Zap, 
  Clock, 
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface PerformanceMetrics {
  processedCount: number;
  totalCount: number;
  throughput: number;
  duration: number;
  errors: number;
  memoryUsage?: number;
}

interface ImportPerformanceMonitorProps {
  sessionId: string;
  onMetricsUpdate?: (metrics: PerformanceMetrics) => void;
}

export function ImportPerformanceMonitor({ 
  sessionId, 
  onMetricsUpdate 
}: ImportPerformanceMonitorProps) {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    processedCount: 0,
    totalCount: 0,
    throughput: 0,
    duration: 0,
    errors: 0,
  });
  const [startTime] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      // Update duration
      setMetrics(prev => ({
        ...prev,
        duration: Date.now() - startTime,
      }));
    }, 100);

    return () => clearInterval(interval);
  }, [startTime]);

  useEffect(() => {
    if (!sessionId) return;

    const eventSource = new EventSource(`/api/import/progress/${sessionId}`);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.performance) {
          const newMetrics: PerformanceMetrics = {
            processedCount: data.processedPrompts || 0,
            totalCount: data.totalPrompts || 0,
            throughput: data.performance.throughput || 0,
            duration: Date.now() - startTime,
            errors: data.errors?.length || 0,
            memoryUsage: data.performance.memoryUsage,
          };
          
          setMetrics(newMetrics);
          onMetricsUpdate?.(newMetrics);
        }
      } catch (error) {
        console.error('Failed to parse performance data:', error);
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [sessionId, startTime, onMetricsUpdate]);

  const formatDuration = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${seconds}s`;
  };

  const progress = metrics.totalCount > 0 
    ? (metrics.processedCount / metrics.totalCount) * 100 
    : 0;

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-sm">Performance Metrics</h3>
        <Activity className="h-4 w-4 text-gray-500" />
      </div>

      <div className="space-y-3">
        {/* Progress Bar */}
        <div className="space-y-1">
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between text-xs text-gray-600">
            <span>{metrics.processedCount} / {metrics.totalCount}</span>
            <span>{progress.toFixed(1)}%</span>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-blue-500" />
            <div className="flex-1">
              <p className="text-xs text-gray-600">Throughput</p>
              <p className="text-sm font-medium">
                {metrics.throughput.toFixed(1)} prompts/s
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-green-500" />
            <div className="flex-1">
              <p className="text-xs text-gray-600">Duration</p>
              <p className="text-sm font-medium">
                {formatDuration(metrics.duration)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <div className="flex-1">
              <p className="text-xs text-gray-600">Success Rate</p>
              <p className="text-sm font-medium">
                {metrics.totalCount > 0 
                  ? ((metrics.processedCount / metrics.totalCount) * 100).toFixed(1)
                  : '0'}%
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-500" />
            <div className="flex-1">
              <p className="text-xs text-gray-600">Errors</p>
              <p className="text-sm font-medium">{metrics.errors}</p>
            </div>
          </div>
        </div>

        {/* Memory Usage (if available) */}
        {metrics.memoryUsage !== undefined && (
          <div className="pt-2 border-t">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600">Memory Usage</span>
              <span className="font-medium">
                {(metrics.memoryUsage / 1024 / 1024).toFixed(1)} MB
              </span>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}