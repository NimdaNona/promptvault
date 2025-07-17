"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Upload, Zap, ArrowRight, X, FileText, MessageSquare, Code2, ChevronRight, Brain, Loader2 } from "lucide-react";
import { toast } from "sonner";
import ImportDialog from "@/components/import-dialog/index";

interface OnboardingWizardProps {
  userId: string;
  email: string;
  name: string;
}

type UserType = "developer" | "marketer" | "researcher" | "writer" | "other";
type ImportSource = "chatgpt" | "claude" | "gemini" | "cline" | "cursor" | "file" | "none";

const USER_TYPES = [
  { id: "developer" as UserType, label: "Developer", icon: Code2, description: "Code generation, debugging, documentation" },
  { id: "marketer" as UserType, label: "Marketer", icon: Zap, description: "Content creation, campaigns, social media" },
  { id: "researcher" as UserType, label: "Researcher", icon: Brain, description: "Analysis, summarization, data insights" },
  { id: "writer" as UserType, label: "Writer", icon: FileText, description: "Creative writing, blogs, storytelling" },
  { id: "other" as UserType, label: "Other", icon: MessageSquare, description: "General purpose prompt management" },
];

const IMPORT_SOURCES = [
  { id: "chatgpt" as ImportSource, label: "ChatGPT", description: "Import from ChatGPT export" },
  { id: "claude" as ImportSource, label: "Claude", description: "Import from Claude conversations" },
  { id: "gemini" as ImportSource, label: "Google Gemini", description: "Import from Gemini chats" },
  { id: "cline" as ImportSource, label: "Cline (VSCode)", description: "Import from Cline extension" },
  { id: "cursor" as ImportSource, label: "Cursor IDE", description: "Import from Cursor chat history" },
  { id: "file" as ImportSource, label: "File Upload", description: "Import from text/JSON files" },
  { id: "none" as ImportSource, label: "Skip Import", description: "Start fresh without importing" },
];

export default function OnboardingWizard({ userId, email, name }: OnboardingWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [userType, setUserType] = useState<UserType | null>(null);
  const [importSource, setImportSource] = useState<ImportSource | null>(null);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState("");
  const [isGettingSuggestion, setIsGettingSuggestion] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);

  const skipOnboarding = async () => {
    setIsCreatingUser(true);
    try {
      // Create user without initial prompt
      const response = await fetch("/api/onboarding/skip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, email, name }),
      });

      if (!response.ok) throw new Error("Failed to complete setup");
      
      toast.success("Welcome to PromptVault!");
      router.push("/dashboard");
    } catch (error) {
      console.error("Onboarding error:", error);
      toast.error("Failed to complete setup. Please try again.");
    } finally {
      setIsCreatingUser(false);
    }
  };

  const handleUserTypeSelect = async (type: UserType) => {
    setUserType(type);
    setStep(2);
    
    // Get AI suggestion based on user type
    setIsGettingSuggestion(true);
    try {
      const response = await fetch("/api/ai/onboarding-suggestion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userType: type }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setAiSuggestion(data.suggestion);
      }
    } catch (error) {
      console.error("Failed to get AI suggestion:", error);
    } finally {
      setIsGettingSuggestion(false);
    }
  };

  const handleImportSelect = (source: ImportSource) => {
    setImportSource(source);
    if (source === "none") {
      skipOnboarding();
    } else {
      setShowImportDialog(true);
    }
  };

  const handleImportComplete = async (prompts: any[]) => {
    setIsCreatingUser(true);
    try {
      // Create user first
      const userResponse = await fetch("/api/onboarding/skip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, email, name }),
      });

      if (!userResponse.ok) throw new Error("Failed to create user");

      // Then import prompts
      const importResponse = await fetch("/api/import/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompts: prompts.map(p => ({
            name: p.name,
            content: p.content,
            folder: userType ? USER_TYPES.find(t => t.id === userType)?.label : undefined,
            metadata: p.metadata,
          })),
          source: importSource,
        }),
      });

      if (!importResponse.ok) throw new Error("Failed to import prompts");

      const result = await importResponse.json();
      toast.success(`Successfully imported ${result.imported} prompts!`);
      router.push("/dashboard");
    } catch (error) {
      console.error("Import error:", error);
      toast.error("Failed to complete import. Please try again.");
    } finally {
      setIsCreatingUser(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Welcome to PromptVault Pro
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Let&apos;s personalize your experience
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {USER_TYPES.map((type) => (
                <button
                  key={type.id}
                  onClick={() => handleUserTypeSelect(type.id)}
                  className="p-6 bg-white dark:bg-gray-800 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 transition-all duration-200 text-left group"
                >
                  <div className="flex items-start space-x-4">
                    <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg group-hover:bg-blue-200 dark:group-hover:bg-blue-900/50 transition-colors">
                      <type.icon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-1">{type.label}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{type.description}</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors mt-1" />
                  </div>
                </button>
              ))}
            </div>

            <div className="flex justify-between items-center pt-4">
              <button
                onClick={skipOnboarding}
                disabled={isCreatingUser}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors flex items-center space-x-2"
              >
                <X className="w-4 h-4" />
                <span>Skip Setup</span>
              </button>
            </div>
          </motion.div>
        );

      case 2:
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-bold">Import Your Prompts</h2>
              <p className="text-gray-600 dark:text-gray-400">
                Bring your existing prompts into PromptVault
              </p>
            </div>

            {aiSuggestion && !isGettingSuggestion && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg border border-blue-200 dark:border-blue-800"
              >
                <div className="flex items-start space-x-3">
                  <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">AI Tip</p>
                    <p className="text-sm text-blue-800 dark:text-blue-200">{aiSuggestion}</p>
                  </div>
                </div>
              </motion.div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {IMPORT_SOURCES.map((source) => (
                <button
                  key={source.id}
                  onClick={() => handleImportSelect(source.id)}
                  className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 transition-all duration-200 text-left group"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium mb-1">{source.label}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{source.description}</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors" />
                  </div>
                </button>
              ))}
            </div>

            <div className="flex justify-between items-center pt-4">
              <button
                onClick={() => setStep(1)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
              >
                ← Back
              </button>
              <button
                onClick={skipOnboarding}
                disabled={isCreatingUser}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors flex items-center space-x-2"
              >
                <X className="w-4 h-4" />
                <span>Skip Setup</span>
              </button>
            </div>
          </motion.div>
        );

    }
  };

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <div className="max-w-3xl w-full">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
            {/* Progress indicator */}
            <div className="flex items-center justify-center mb-8">
              <div className="flex items-center space-x-4">
                {[1, 2].map((i) => (
                  <div
                    key={i}
                    className={`w-3 h-3 rounded-full transition-colors ${
                      i <= step ? "bg-blue-600" : "bg-gray-300 dark:bg-gray-600"
                    }`}
                  />
                ))}
              </div>
            </div>

            <AnimatePresence mode="wait">
              {renderStep()}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Import Dialog */}
      {showImportDialog && importSource && importSource !== "none" && (
        <ImportDialog
          source={importSource}
          onClose={() => setShowImportDialog(false)}
          onImport={handleImportComplete}
          existingPrompts={[]}
        />
      )}
    </>
  );
}