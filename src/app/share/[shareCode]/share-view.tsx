"use client";

import { useState } from "react";
import { Copy, Download, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import Link from "next/link";

interface ShareViewProps {
  prompt: {
    name: string;
    description?: string | null;
    content: string;
    model?: string | null;
    folder?: string | null;
    tags: Array<{ id: string; name: string; color: string | null }>;
  };
  sharedBy: string;
  shareDate: Date;
}

export default function ShareView({ prompt, sharedBy, shareDate }: ShareViewProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(prompt.content);
    setCopied(true);
    toast.success("Prompt copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadAsText = () => {
    const blob = new Blob([prompt.content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${prompt.name.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Prompt downloaded!");
  };

  const downloadAsJSON = () => {
    const data = {
      name: prompt.name,
      description: prompt.description,
      content: prompt.content,
      model: prompt.model,
      folder: prompt.folder,
      tags: prompt.tags.map(t => t.name),
      sharedBy,
      shareDate,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${prompt.name.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Prompt downloaded as JSON!");
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <Link
          href="/"
          className="inline-flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Link>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">{prompt.name}</h1>
          {prompt.description && (
            <p className="text-gray-600 dark:text-gray-400 mb-4">{prompt.description}</p>
          )}
          
          <div className="flex flex-wrap gap-4 text-sm text-gray-500">
            <span>Shared by {sharedBy}</span>
            <span>•</span>
            <span>{new Date(shareDate).toLocaleDateString()}</span>
            {prompt.model && (
              <>
                <span>•</span>
                <span>Model: {prompt.model}</span>
              </>
            )}
            {prompt.folder && (
              <>
                <span>•</span>
                <span>📁 {prompt.folder}</span>
              </>
            )}
          </div>
        </div>

        {/* Tags */}
        {prompt.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {prompt.tags.map((tag) => (
              <span
                key={tag.id}
                className="px-3 py-1 text-sm rounded-full"
                style={{
                  backgroundColor: tag.color ? `${tag.color}20` : '#3B82F620',
                  color: tag.color || '#3B82F6',
                }}
              >
                {tag.name}
              </span>
            ))}
          </div>
        )}

        {/* Content */}
        <div className="mb-6">
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6 relative">
            <pre className="whitespace-pre-wrap font-mono text-sm text-gray-800 dark:text-gray-200">
              {prompt.content}
            </pre>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-3">
          <Button onClick={copyToClipboard} variant={copied ? "default" : "outline"}>
            <Copy className="w-4 h-4 mr-2" />
            {copied ? "Copied!" : "Copy Prompt"}
          </Button>
          <Button onClick={downloadAsText} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Download as Text
          </Button>
          <Button onClick={downloadAsJSON} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Download as JSON
          </Button>
        </div>

        {/* CTA */}
        <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-2">Want to manage your own prompts?</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Join PromptVault to store, organize, and optimize your AI prompts.
            </p>
            <Link href="/">
              <Button>
                Get Started Free
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}