"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Loader2 } from "lucide-react";

interface OnboardingFormProps {
  userId: string;
  email: string;
  name: string;
}

interface FormData {
  promptName: string;
  promptContent: string;
  category: string;
}

export default function OnboardingForm({ userId, email, name }: OnboardingFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>();

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    
    try {
      // Create user and first prompt
      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          email,
          name,
          prompt: {
            name: data.promptName,
            content: data.promptContent,
            folder: data.category,
          },
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to complete onboarding");
      }

      router.push("/dashboard");
    } catch (error) {
      console.error("Onboarding error:", error);
      alert("Failed to complete onboarding. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label htmlFor="promptName" className="block text-sm font-medium mb-1">
          Prompt Name
        </label>
        <input
          {...register("promptName", { required: "Prompt name is required" })}
          type="text"
          id="promptName"
          placeholder="e.g., Blog Post Generator"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
        />
        {errors.promptName && (
          <p className="text-red-500 text-sm mt-1">{errors.promptName.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="promptContent" className="block text-sm font-medium mb-1">
          Prompt Content
        </label>
        <textarea
          {...register("promptContent", { required: "Prompt content is required" })}
          id="promptContent"
          rows={4}
          placeholder="Write a blog post about [topic]..."
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
        />
        {errors.promptContent && (
          <p className="text-red-500 text-sm mt-1">{errors.promptContent.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="category" className="block text-sm font-medium mb-1">
          Category
        </label>
        <select
          {...register("category", { required: "Category is required" })}
          id="category"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
        >
          <option value="">Select a category</option>
          <option value="content">Content Creation</option>
          <option value="code">Code Generation</option>
          <option value="analysis">Analysis</option>
          <option value="creative">Creative Writing</option>
          <option value="other">Other</option>
        </select>
        {errors.category && (
          <p className="text-red-500 text-sm mt-1">{errors.category.message}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Setting up...
          </>
        ) : (
          "Complete Setup"
        )}
      </button>
    </form>
  );
}