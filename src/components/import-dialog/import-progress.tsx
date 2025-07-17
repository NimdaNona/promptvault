"use client";

import { motion } from "framer-motion";
import { CheckCircle, XCircle, Loader2, FileText, Upload } from "lucide-react";

interface ImportProgressProps {
  stage: 'uploading' | 'parsing' | 'importing' | 'complete' | 'error';
  current?: number;
  total?: number;
  message?: string;
}

export default function ImportProgress({ stage, current = 0, total = 0, message }: ImportProgressProps) {
  const stages = [
    { key: 'uploading', label: 'Uploading file', icon: Upload },
    { key: 'parsing', label: 'Parsing content', icon: FileText },
    { key: 'importing', label: 'Importing prompts', icon: Loader2 },
  ];

  const currentStageIndex = stages.findIndex(s => s.key === stage);

  return (
    <div className="w-full p-6">
      <div className="space-y-4">
        {stages.map((s, index) => {
          const isComplete = index < currentStageIndex || stage === 'complete';
          const isCurrent = s.key === stage && stage !== 'complete' && stage !== 'error';
          const isError = stage === 'error' && index === currentStageIndex;
          
          const Icon = s.icon;

          return (
            <motion.div
              key={s.key}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-center space-x-3"
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors
                  ${isComplete ? 'bg-green-100 dark:bg-green-900/30' :
                    isCurrent ? 'bg-blue-100 dark:bg-blue-900/30' :
                    isError ? 'bg-red-100 dark:bg-red-900/30' :
                    'bg-gray-100 dark:bg-gray-800'
                  }`}
              >
                {isComplete ? (
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                ) : isError ? (
                  <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                ) : isCurrent ? (
                  <Icon className="w-5 h-5 text-blue-600 dark:text-blue-400 animate-pulse" />
                ) : (
                  <Icon className="w-5 h-5 text-gray-400" />
                )}
              </div>
              
              <div className="flex-1">
                <p className={`text-sm font-medium
                  ${isComplete ? 'text-green-700 dark:text-green-300' :
                    isCurrent ? 'text-blue-700 dark:text-blue-300' :
                    isError ? 'text-red-700 dark:text-red-300' :
                    'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {s.label}
                  {isCurrent && current > 0 && total > 0 && (
                    <span className="ml-2">({current}/{total})</span>
                  )}
                </p>
                {isCurrent && message && (
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{message}</p>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {stage === 'complete' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg"
        >
          <p className="text-sm text-green-800 dark:text-green-200 font-medium">
            Import completed successfully!
          </p>
        </motion.div>
      )}

      {stage === 'error' && message && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
        >
          <p className="text-sm text-red-800 dark:text-red-200">
            {message}
          </p>
        </motion.div>
      )}
    </div>
  );
}