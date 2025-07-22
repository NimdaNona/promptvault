"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  Plus, 
  FolderOpen, 
  Calendar,
  Edit,
  Trash2,
  Copy,
  Share2,
  Sparkles
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TIERS } from "@/lib/tiers";

interface Prompt {
  id: string;
  title: string;
  description?: string | null;
  category?: string | null;
  tags?: string[] | null;
  folderId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface PromptsViewProps {
  userId: string;
  userTier: string;
  promptCount: number;
}

export default function PromptsView({ userId, userTier, promptCount }: PromptsViewProps) {
  const router = useRouter();
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);

  const tierLimits = TIERS[userTier as keyof typeof TIERS].limits;
  const canCreateMore = tierLimits.prompts === -1 || promptCount < tierLimits.prompts;
  const hasAIFeatures = tierLimits.aiOptimizations > 0;

  useEffect(() => {
    fetchPrompts();
  }, [selectedFolder]);

  const fetchPrompts = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedFolder) params.append("folderId", selectedFolder);
      
      const response = await fetch(`/api/prompts?${params}`);
      if (response.ok) {
        const data = await response.json();
        setPrompts(data);
      }
    } catch (error) {
      console.error("Failed to fetch prompts:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (promptId: string) => {
    if (!confirm("Are you sure you want to delete this prompt?")) return;

    try {
      const response = await fetch(`/api/prompts/${promptId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setPrompts(prompts.filter(p => p.id !== promptId));
      }
    } catch (error) {
      console.error("Failed to delete prompt:", error);
    }
  };

  const filteredPrompts = prompts.filter(prompt =>
    prompt.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    prompt.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    prompt.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-48 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            My Prompts
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {prompts.length} prompts • {promptCount} of {tierLimits.prompts === -1 ? "∞" : tierLimits.prompts} used
          </p>
        </div>
        <Button
          onClick={() => router.push("/prompts/new")}
          disabled={!canCreateMore}
          className="mt-4 sm:mt-0"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Prompt
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search prompts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <Button variant="outline">
          <FolderOpen className="w-4 h-4 mr-2" />
          All Folders
        </Button>
      </div>

      {/* Prompts Grid */}
      {filteredPrompts.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            {prompts.length === 0 ? (
              <>
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Plus className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No prompts yet</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Create your first prompt to get started
                </p>
                <Button onClick={() => router.push("/prompts/new")}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Prompt
                </Button>
              </>
            ) : (
              <>
                <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No results found</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Try adjusting your search query
                </p>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPrompts.map((prompt) => (
            <Card key={prompt.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-lg line-clamp-1">
                      {prompt.title}
                    </CardTitle>
                    <CardDescription className="line-clamp-2 mt-1">
                      {prompt.description || "No description"}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  {prompt.category && (
                    <Badge variant="secondary">{prompt.category}</Badge>
                  )}
                  {prompt.tags?.slice(0, 2).map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                  {prompt.tags && prompt.tags.length > 2 && (
                    <span className="text-xs text-gray-500">
                      +{prompt.tags.length - 2}
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-1" />
                    {new Date(prompt.updatedAt).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => router.push(`/prompts/${prompt.id}/edit`)}
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                  {hasAIFeatures && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/prompts/${prompt.id}/optimize`)}
                    >
                      <Sparkles className="w-4 h-4" />
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(prompt.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Upgrade CTA */}
      {!canCreateMore && (
        <Card className="mt-8 border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950">
          <CardContent className="text-center py-8">
            <h3 className="text-lg font-semibold mb-2">Prompt Limit Reached</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              You&apos;ve reached the limit of {tierLimits.prompts} prompts on the {userTier} plan.
            </p>
            <Button onClick={() => router.push("/settings/billing")}>
              Upgrade to Pro
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}