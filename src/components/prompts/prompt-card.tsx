"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Edit, Trash2, GitBranch, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface PromptCardProps {
  prompt: {
    id: string;
    name: string;
    description?: string;
    content: string;
    folder?: string;
    isPublic: boolean;
    updatedAt: string;
    tags?: Array<{ id: string; name: string; color: string }>;
  };
  onDelete?: () => void;
}

export default function PromptCard({ prompt, onDelete }: PromptCardProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(prompt.content);
    toast.success("Prompt copied to clipboard!");
  };

  const handleEdit = () => {
    router.push(`/prompts/${prompt.id}/edit`);
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this prompt?")) {
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/prompts/${prompt.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete prompt");
      }

      toast.success("Prompt deleted successfully");
      onDelete?.();
    } catch (error) {
      console.error("Error deleting prompt:", error);
      toast.error("Failed to delete prompt");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold mb-1">{prompt.name}</h3>
          {prompt.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              {prompt.description}
            </p>
          )}
          {prompt.folder && (
            <p className="text-xs text-gray-500 dark:text-gray-500">
              📁 {prompt.folder}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {prompt.isPublic && (
            <Globe className="w-4 h-4 text-green-600" />
          )}
        </div>
      </div>

      <div className="mb-4">
        <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-3">
          {prompt.content}
        </p>
      </div>

      {prompt.tags && prompt.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {prompt.tags.map((tag) => (
            <span
              key={tag.id}
              className="px-2 py-1 text-xs rounded-full"
              style={{
                backgroundColor: `${tag.color}20`,
                color: tag.color,
              }}
            >
              {tag.name}
            </span>
          ))}
        </div>
      )}

      <div className="flex justify-between items-center">
        <p className="text-xs text-gray-500">
          Updated {new Date(prompt.updatedAt).toLocaleDateString()}
        </p>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={handleCopy}
          >
            <Copy className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleEdit}
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            <Trash2 className="w-4 h-4 text-red-600" />
          </Button>
        </div>
      </div>
    </div>
  );
}