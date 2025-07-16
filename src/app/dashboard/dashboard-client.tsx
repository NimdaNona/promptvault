"use client";

import { useState, useEffect } from "react";
import { Plus, Search, Folder } from "lucide-react";
import { Button } from "@/components/ui/button";
import PromptCard from "@/components/prompts/prompt-card";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface Prompt {
  id: string;
  name: string;
  description?: string;
  content: string;
  folder?: string;
  isPublic: boolean;
  updatedAt: string;
  tags?: Array<{ id: string; name: string; color: string }>;
}

export default function DashboardClient() {
  const router = useRouter();
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);

  useEffect(() => {
    fetchPrompts();
  }, [searchQuery, selectedFolder]);

  const fetchPrompts = async () => {
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append("search", searchQuery);
      if (selectedFolder) params.append("folder", selectedFolder);

      const response = await fetch(`/api/prompts?${params}`);
      if (!response.ok) throw new Error("Failed to fetch prompts");

      const data = await response.json();
      setPrompts(data);
    } catch (error) {
      console.error("Error fetching prompts:", error);
      toast.error("Failed to load prompts");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreatePrompt = () => {
    router.push("/prompts/new");
  };

  const handlePromptDeleted = () => {
    fetchPrompts();
  };

  // Get unique folders from prompts
  const folders = Array.from(new Set(prompts.map(p => p.folder).filter(Boolean)));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">My Prompts</h1>
        <Button onClick={handleCreatePrompt}>
          <Plus className="w-4 h-4 mr-2" />
          New Prompt
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search prompts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800"
          />
        </div>
        {folders.length > 0 && (
          <select
            value={selectedFolder || ""}
            onChange={(e) => setSelectedFolder(e.target.value || null)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800"
          >
            <option value="">All Folders</option>
            {folders.map((folder) => (
              <option key={folder} value={folder}>
                {folder}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Prompts Grid */}
      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Loading prompts...</p>
        </div>
      ) : prompts.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">
            {searchQuery || selectedFolder
              ? "No prompts found matching your criteria."
              : "You don't have any prompts yet."}
          </p>
          {!searchQuery && !selectedFolder && (
            <Button onClick={handleCreatePrompt}>
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Prompt
            </Button>
          )}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {prompts.map((prompt) => (
            <PromptCard
              key={prompt.id}
              prompt={prompt}
              onDelete={handlePromptDeleted}
            />
          ))}
        </div>
      )}
    </div>
  );
}