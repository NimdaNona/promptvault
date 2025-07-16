"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Loader2, ArrowLeft, GitBranch, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import Link from "next/link";

interface Version {
  id: string;
  version: number;
  content: string;
  changeMessage?: string;
  createdAt: string;
}

interface FormData {
  name: string;
  description: string;
  content: string;
  model: string;
  folder: string;
  isPublic: boolean;
  tags: string;
  changeMessage: string;
}

interface EditPromptFormProps {
  prompt: {
    id: string;
    name: string;
    description?: string;
    content: string;
    model?: string;
    folder?: string;
    isPublic: boolean;
    tags: Array<{ id: string; name: string }>;
    versions: Version[];
  };
}

export default function EditPromptForm({ prompt }: EditPromptFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showVersions, setShowVersions] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<Version | null>(null);
  
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      name: prompt.name,
      description: prompt.description || "",
      content: prompt.content,
      model: prompt.model || "gpt-4",
      folder: prompt.folder || "",
      isPublic: prompt.isPublic,
      tags: prompt.tags.map(t => t.name).join(", "),
      changeMessage: "",
    },
  });

  const currentContent = watch("content");
  const hasContentChanged = currentContent !== prompt.content;

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    
    try {
      const tags = data.tags ? data.tags.split(",").map(t => t.trim()).filter(Boolean) : [];
      
      const response = await fetch(`/api/prompts/${prompt.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
          tags,
          changeMessage: hasContentChanged ? data.changeMessage : undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || "Failed to update prompt");
      }

      toast.success("Prompt updated successfully!");
      router.push("/dashboard");
    } catch (error) {
      console.error("Error updating prompt:", error);
      toast.error(error instanceof Error ? error.message : "Failed to update prompt");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVersionRestore = (version: Version) => {
    setValue("content", version.content);
    setValue("changeMessage", `Restored from version ${version.version}`);
    setSelectedVersion(version);
    toast.info(`Restored content from version ${version.version}`);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <Link href="/dashboard" className="inline-flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Link>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-2">
              Prompt Name *
            </label>
            <input
              {...register("name", { required: "Prompt name is required" })}
              type="text"
              id="name"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
            />
            {errors.name && (
              <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium mb-2">
              Description
            </label>
            <input
              {...register("description")}
              type="text"
              id="description"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
            />
          </div>

          <div>
            <label htmlFor="content" className="block text-sm font-medium mb-2">
              Prompt Content *
            </label>
            <textarea
              {...register("content", { required: "Prompt content is required" })}
              id="content"
              rows={10}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 font-mono text-sm"
            />
            {errors.content && (
              <p className="text-red-500 text-sm mt-1">{errors.content.message}</p>
            )}
            {selectedVersion && (
              <p className="text-sm text-blue-600 mt-1">
                Restored from version {selectedVersion.version}
              </p>
            )}
          </div>

          {hasContentChanged && (
            <div>
              <label htmlFor="changeMessage" className="block text-sm font-medium mb-2">
                Version Message
              </label>
              <input
                {...register("changeMessage")}
                type="text"
                id="changeMessage"
                placeholder="Describe what changed in this version"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
              />
              <p className="text-xs text-gray-500 mt-1">
                A new version will be created since content has changed
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="model" className="block text-sm font-medium mb-2">
                Model
              </label>
              <select
                {...register("model")}
                id="model"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
              >
                <option value="gpt-4">GPT-4</option>
                <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                <option value="claude-3">Claude 3</option>
                <option value="gemini-pro">Gemini Pro</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label htmlFor="folder" className="block text-sm font-medium mb-2">
                Folder
              </label>
              <input
                {...register("folder")}
                type="text"
                id="folder"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
              />
            </div>
          </div>

          <div>
            <label htmlFor="tags" className="block text-sm font-medium mb-2">
              Tags
            </label>
            <input
              {...register("tags")}
              type="text"
              id="tags"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
            />
            <p className="text-xs text-gray-500 mt-1">Separate tags with commas</p>
          </div>

          <div className="flex items-center">
            <input
              {...register("isPublic")}
              type="checkbox"
              id="isPublic"
              className="mr-2"
            />
            <label htmlFor="isPublic" className="text-sm">
              Make this prompt public (visible to other users)
            </label>
          </div>

          <div className="flex gap-4">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Prompt"
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/dashboard")}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>

      {/* Version History Sidebar */}
      <div className="lg:col-span-1">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center">
              <GitBranch className="w-4 h-4 mr-2" />
              Version History
            </h2>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowVersions(!showVersions)}
            >
              {showVersions ? "Hide" : "Show"}
            </Button>
          </div>

          {showVersions && (
            <div className="space-y-3">
              {prompt.versions.length === 0 ? (
                <p className="text-sm text-gray-500">No versions yet</p>
              ) : (
                prompt.versions.map((version) => (
                  <div
                    key={version.id}
                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                    onClick={() => handleVersionRestore(version)}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">
                        Version {version.version}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(version.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    {version.changeMessage && (
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {version.changeMessage}
                      </p>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="mt-2 text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleVersionRestore(version);
                      }}
                    >
                      <History className="w-3 h-3 mr-1" />
                      Restore
                    </Button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}