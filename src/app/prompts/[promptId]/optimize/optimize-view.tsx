"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Sparkles, Copy, Check } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface OptimizePromptViewProps {
  prompt: {
    id: string;
    title: string;
    content: string;
    description?: string | null;
    category?: string | null;
    tags?: string[] | null;
  };
}

export default function OptimizePromptView({ prompt }: OptimizePromptViewProps) {
  const router = useRouter();
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizedContent, setOptimizedContent] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const handleOptimize = async () => {
    setIsOptimizing(true);
    setError("");
    
    try {
      const response = await fetch("/api/prompts/optimize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          promptId: prompt.id,
          content: prompt.content,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to optimize prompt");
      }

      const data = await response.json();
      setOptimizedContent(data.optimizedContent);
      setSuggestions(data.suggestions || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to optimize prompt");
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(optimizedContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveOptimized = async () => {
    try {
      const response = await fetch(`/api/prompts/${prompt.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: optimizedContent,
        }),
      });

      if (response.ok) {
        router.push(`/prompts/${prompt.id}/edit?saved=true`);
      }
    } catch (err) {
      setError("Failed to save optimized prompt");
    }
  };

  return (
    <>
      {/* Header */}
      <div className="mb-6">
        <Link
          href={`/prompts/${prompt.id}/edit`}
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Edit
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Optimize Prompt
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Use AI to improve your prompt&apos;s effectiveness
        </p>
      </div>

      {/* Original Prompt */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Original Prompt</CardTitle>
          <CardDescription>
            {prompt.title}
            {prompt.category && (
              <Badge variant="secondary" className="ml-2">
                {prompt.category}
              </Badge>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
            {prompt.content}
          </pre>
        </CardContent>
      </Card>

      {/* Optimization */}
      {!optimizedContent ? (
        <Card>
          <CardContent className="text-center py-12">
            <Sparkles className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Ready to Optimize</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
              Our AI will analyze your prompt and suggest improvements for clarity,
              effectiveness, and better results.
            </p>
            <Button
              onClick={handleOptimize}
              disabled={isOptimizing}
              size="lg"
            >
              {isOptimizing ? (
                <>
                  <Sparkles className="w-4 h-4 mr-2 animate-pulse" />
                  Optimizing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Optimize Prompt
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Optimized Result */}
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Optimized Prompt</CardTitle>
                  <CardDescription>AI-enhanced version</CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopy}
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-2" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <pre className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                {optimizedContent}
              </pre>
            </CardContent>
          </Card>

          {/* Suggestions */}
          {suggestions.length > 0 && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Optimization Insights</CardTitle>
                <CardDescription>What we improved</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {suggestions.map((suggestion, index) => (
                    <li key={index} className="flex items-start">
                      <span className="text-green-500 mr-2">✓</span>
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {suggestion}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex gap-4">
            <Button onClick={handleSaveOptimized} className="flex-1">
              Save Optimized Version
            </Button>
            <Button
              variant="outline"
              onClick={handleOptimize}
              disabled={isOptimizing}
            >
              Try Again
            </Button>
          </div>
        </>
      )}

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive" className="mt-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </>
  );
}