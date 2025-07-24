"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { FileText, MessageSquare, Brain, Code, Terminal, Upload, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@clerk/nextjs";
import { useFeatureFlag } from "@/lib/features/flags";
import ImportDialog from "@/components/import-dialog";
import type { ImportSource } from "@/lib/importers";

export default function ImportPage() {
  const { userId } = useAuth();
  const clineImportEnabled = useFeatureFlag('cline_import', userId || undefined);
  const [selectedSource, setSelectedSource] = useState<ImportSource | null>(null);
  const [showImportDialog, setShowImportDialog] = useState(false);
  
  // Base import options that are always available
  const baseImportOptions = [
    {
      id: "chatgpt" as ImportSource,
      name: "ChatGPT",
      icon: MessageSquare,
      description: "Import conversations from ChatGPT",
      status: "available",
      formats: ["JSON export"]
    },
    {
      id: "claude" as ImportSource,
      name: "Claude",
      icon: Brain,
      description: "Import conversations from Claude",
      status: "available",
      formats: ["JSON export"]
    },
    {
      id: "gemini" as ImportSource,
      name: "Google Gemini",
      icon: MessageSquare,
      description: "Import conversations from Google Gemini",
      status: "available",
      formats: ["JSON export"]
    },
    {
      id: "cursor" as ImportSource,
      name: "Cursor",
      icon: Terminal,
      description: "Import AI coding sessions from Cursor",
      status: "available",
      formats: ["JSON export", "Markdown"]
    }
  ];
  
  // Conditionally add Cline import option based on feature flag
  const importOptions = clineImportEnabled 
    ? [...baseImportOptions.slice(0, 3), {
        id: "cline" as ImportSource,
        name: "Cline",
        icon: Code,
        description: "Import AI coding sessions from Cline VSCode extension",
        status: "available",
        formats: ["Markdown export", "VSCode storage folder"]
      }, baseImportOptions[3]]
    : baseImportOptions;
  const [recentImports, setRecentImports] = useState<Array<{
    id: string;
    platform: string;
    status: string;
    promptsFound: number;
    date: string;
  }>>([]); // Start with empty array - no fake data

  const getStatusIcon = (status: string) => {
    switch(status) {
      case "completed":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "processing":
        return <Clock className="w-4 h-4 text-yellow-500 animate-pulse" />;
      case "failed":
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Import Hub
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Import your AI conversations and prompts from various platforms
        </p>
      </div>

      {/* Import Options Grid */}
      <div className="mb-12">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Available Import Sources
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {importOptions.map((option) => {
            const Icon = option.icon;
            return (
              <Card 
                key={option.id} 
                className="hover:shadow-lg transition-shadow cursor-pointer h-full"
                onClick={() => {
                  setSelectedSource(option.id);
                  setShowImportDialog(true);
                }}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <Icon className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                    <Badge variant="secondary">
                      {option.status === "available" ? "Available" : "Coming Soon"}
                    </Badge>
                  </div>
                  <CardTitle className="mt-4">{option.name}</CardTitle>
                  <CardDescription>{option.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    <p>Supported formats:</p>
                    <ul className="mt-1">
                      {option.formats.map((format) => (
                        <li key={format} className="ml-4">• {format}</li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Recent Imports */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Recent Imports
        </h2>
        {recentImports.length > 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Source
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Prompts Found
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {recentImports.map((import_) => (
                  <tr key={import_.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {import_.platform}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(import_.status)}
                        <span className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                          {import_.status}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      {import_.status === "processing" ? "-" : import_.promptsFound}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      {new Date(import_.date).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">
                No imports yet. Choose a platform above to get started.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Import Dialog */}
      {showImportDialog && selectedSource && (
        <ImportDialog
          source={selectedSource}
          onClose={() => {
            setShowImportDialog(false);
            setSelectedSource(null);
          }}
          onImport={async (prompts) => {
            try {
              // Import prompts via bulk import API
              const response = await fetch('/api/import/bulk', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  prompts: prompts.map(p => ({
                    name: p.name,
                    content: p.content,
                    folder: p.folder,
                    metadata: p.metadata,
                  })),
                  source: selectedSource,
                }),
              });

              if (!response.ok) {
                throw new Error('Failed to import prompts');
              }

              const result = await response.json();
              
              // Update recent imports to show the new import
              setRecentImports(prev => [{
                id: Date.now().toString(),
                platform: importOptions.find(opt => opt.id === selectedSource)?.name || selectedSource,
                status: 'completed',
                promptsFound: result.imported,
                date: new Date().toISOString(),
              }, ...prev]);

              // Show success message
              const { toast } = await import('sonner');
              toast.success(`Successfully imported ${result.imported} prompts!`);
              
              // Close dialog
              setShowImportDialog(false);
              setSelectedSource(null);
            } catch (error) {
              console.error('Import error:', error);
              const { toast } = await import('sonner');
              toast.error('Failed to import prompts. Please try again.');
            }
          }}
          existingPrompts={[]}
        />
      )}
    </div>
  );
}