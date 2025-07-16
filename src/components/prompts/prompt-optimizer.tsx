"use client";

import { useState } from "react";
import { Sparkles, Loader2, Copy, RefreshCw, TestTube } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface PromptOptimizerProps {
  prompt: string;
  onOptimize?: (optimizedPrompt: string) => void;
  disabled?: boolean;
}

export default function PromptOptimizer({ prompt, onOptimize, disabled }: PromptOptimizerProps) {
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'optimized' | 'evaluation' | 'variants'>('optimized');
  const [variants, setVariants] = useState<string[]>([]);

  const handleOptimize = async () => {
    setIsOptimizing(true);
    try {
      const response = await fetch("/api/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, action: 'optimize' }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Failed to optimize prompt" }));
        throw new Error(errorData.message || errorData.error || "Failed to optimize prompt");
      }

      const data = await response.json();
      setResults(data);
      setShowResults(true);
      setActiveTab('optimized');
    } catch (error) {
      console.error("Optimization error:", error);
      const message = error instanceof Error ? error.message : "Failed to optimize prompt";
      toast.error(message);
      if (message.includes("upgrade")) {
        setTimeout(() => {
          window.location.href = "/settings/billing";
        }, 2000);
      }
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleEvaluate = async () => {
    setIsOptimizing(true);
    try {
      const response = await fetch("/api/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, action: 'evaluate' }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Failed to evaluate prompt" }));
        throw new Error(errorData.message || errorData.error || "Failed to evaluate prompt");
      }

      const data = await response.json();
      setResults({ ...results, evaluation: data });
      setActiveTab('evaluation');
    } catch (error) {
      console.error("Evaluation error:", error);
      const message = error instanceof Error ? error.message : "Failed to evaluate prompt";
      toast.error(message);
      if (message.includes("upgrade")) {
        setTimeout(() => {
          window.location.href = "/settings/billing";
        }, 2000);
      }
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleGenerateVariants = async () => {
    setIsOptimizing(true);
    try {
      const response = await fetch("/api/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, action: 'variants', variantCount: 3 }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Failed to generate variants" }));
        throw new Error(errorData.message || errorData.error || "Failed to generate variants");
      }

      const data = await response.json();
      setVariants(data.variants || []);
      setActiveTab('variants');
    } catch (error) {
      console.error("Variant generation error:", error);
      const message = error instanceof Error ? error.message : "Failed to generate variants";
      toast.error(message);
      if (message.includes("upgrade")) {
        setTimeout(() => {
          window.location.href = "/settings/billing";
        }, 2000);
      }
    } finally {
      setIsOptimizing(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  const applyOptimization = () => {
    if (results?.optimizedPrompt && onOptimize) {
      onOptimize(results.optimizedPrompt);
      toast.success("Optimization applied!");
      setShowResults(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button
          onClick={handleOptimize}
          disabled={disabled || isOptimizing || !prompt}
          variant="outline"
          size="sm"
        >
          {isOptimizing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Optimizing...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Optimize with AI
            </>
          )}
        </Button>
      </div>

      {showResults && results && (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-4">
          {/* Tabs */}
          <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setActiveTab('optimized')}
              className={`px-3 py-2 text-sm font-medium transition-colors ${
                activeTab === 'optimized'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Optimized
            </button>
            <button
              onClick={() => {
                if (!results.evaluation) handleEvaluate();
                else setActiveTab('evaluation');
              }}
              className={`px-3 py-2 text-sm font-medium transition-colors ${
                activeTab === 'evaluation'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <TestTube className="w-4 h-4 inline mr-1" />
              Evaluation
            </button>
            <button
              onClick={() => {
                if (variants.length === 0) handleGenerateVariants();
                else setActiveTab('variants');
              }}
              className={`px-3 py-2 text-sm font-medium transition-colors ${
                activeTab === 'variants'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <RefreshCw className="w-4 h-4 inline mr-1" />
              Variants
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === 'optimized' && (
            <div className="space-y-4">
              {/* Score Display */}
              {results.score && (
                <div className="grid grid-cols-4 gap-2">
                  <div className="text-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
                    <div className="text-2xl font-bold text-blue-600">{results.score.overall}</div>
                    <div className="text-xs text-gray-600">Overall</div>
                  </div>
                  <div className="text-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
                    <div className="text-2xl font-bold text-green-600">{results.score.clarity}</div>
                    <div className="text-xs text-gray-600">Clarity</div>
                  </div>
                  <div className="text-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
                    <div className="text-2xl font-bold text-purple-600">{results.score.specificity}</div>
                    <div className="text-xs text-gray-600">Specificity</div>
                  </div>
                  <div className="text-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
                    <div className="text-2xl font-bold text-orange-600">{results.score.effectiveness}</div>
                    <div className="text-xs text-gray-600">Effectiveness</div>
                  </div>
                </div>
              )}

              {/* Optimized Prompt */}
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Optimized Prompt:</h4>
                <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg relative">
                  <pre className="whitespace-pre-wrap text-sm">{results.optimizedPrompt}</pre>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="absolute top-2 right-2"
                    onClick={() => copyToClipboard(results.optimizedPrompt)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Suggestions */}
              {results.suggestions && results.suggestions.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Suggestions:</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {results.suggestions.map((suggestion: string, index: number) => (
                      <li key={index} className="text-sm text-gray-600 dark:text-gray-400">
                        {suggestion}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button onClick={applyOptimization} size="sm">
                  Apply Optimization
                </Button>
                <Button
                  onClick={() => setShowResults(false)}
                  variant="outline"
                  size="sm"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {activeTab === 'evaluation' && results.evaluation && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-sm mb-2 text-green-600">Strengths</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {results.evaluation.strengths.map((strength: string, index: number) => (
                      <li key={index} className="text-sm text-gray-600">
                        {strength}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-sm mb-2 text-red-600">Weaknesses</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {results.evaluation.weaknesses.map((weakness: string, index: number) => (
                      <li key={index} className="text-sm text-gray-600">
                        {weakness}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-sm mb-2 text-blue-600">Improvements</h4>
                <ul className="list-disc list-inside space-y-1">
                  {results.evaluation.improvements.map((improvement: string, index: number) => (
                    <li key={index} className="text-sm text-gray-600">
                      {improvement}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'variants' && variants.length > 0 && (
            <div className="space-y-4">
              {variants.map((variant, index) => (
                <div key={index} className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg relative">
                  <div className="text-xs text-gray-500 mb-1">Variant {index + 1}</div>
                  <pre className="whitespace-pre-wrap text-sm">{variant}</pre>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="absolute top-2 right-2"
                    onClick={() => copyToClipboard(variant)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}