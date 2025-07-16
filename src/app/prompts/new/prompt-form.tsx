"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import PromptOptimizer from "@/components/prompts/prompt-optimizer";
import { toast } from "sonner";
import Link from "next/link";

interface FormData {
  name: string;
  description: string;
  content: string;
  model: string;
  folder: string;
  isPublic: boolean;
  tags: string;
}

export default function PromptForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      model: "gpt-4",
      isPublic: false,
    },
  });

  const currentContent = watch("content");

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    
    try {
      const tags = data.tags ? data.tags.split(",").map(t => t.trim()).filter(Boolean) : [];
      
      const response = await fetch("/api/prompts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
          tags,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || "Failed to create prompt");
      }

      toast.success("Prompt created successfully!");
      router.push("/dashboard");
    } catch (error) {
      console.error("Error creating prompt:", error);
      toast.error(error instanceof Error ? error.message : "Failed to create prompt");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
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
            placeholder="e.g., SEO Blog Post Generator"
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
            placeholder="Brief description of what this prompt does"
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
            rows={8}
            placeholder="Write a comprehensive blog post about [topic]. Include an introduction, main points, and conclusion..."
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 font-mono text-sm"
          />
          {errors.content && (
            <p className="text-red-500 text-sm mt-1">{errors.content.message}</p>
          )}
          
          {/* AI Optimizer */}
          <div className="mt-4">
            <PromptOptimizer 
              prompt={currentContent || ""}
              onOptimize={(optimized) => setValue("content", optimized)}
            />
          </div>
        </div>

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
              placeholder="e.g., marketing/content"
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
            placeholder="content, blog, seo (comma-separated)"
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
                Creating...
              </>
            ) : (
              "Create Prompt"
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
  );
}