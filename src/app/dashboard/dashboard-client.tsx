"use client";

import { useState, useEffect } from "react";
import { Plus, Search, Folder, FileText, Share2, Activity, Crown, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import PromptCard from "@/components/prompts/prompt-card";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { TIERS } from "@/lib/stripe";

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

interface Analytics {
  totalPrompts: number;
  totalVersions: number;
  publicPrompts: number;
  activeShares: number;
  recentActivity: number;
  promptsByFolder: Record<string, number>;
  tier: string;
  promptCount: number;
}

interface DashboardClientProps {
  analytics: Analytics;
}

export default function DashboardClient({ analytics }: DashboardClientProps) {
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

  const tierLimits = TIERS[analytics.tier as keyof typeof TIERS]?.limits || TIERS.free.limits;
  const usagePercentage = tierLimits.prompts === -1 ? 0 : (analytics.promptCount / tierLimits.prompts) * 100;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <Button onClick={handleCreatePrompt}>
          <Plus className="w-4 h-4 mr-2" />
          New Prompt
        </Button>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Prompts */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Prompts</p>
              <p className="text-2xl font-bold mt-1">{analytics.totalPrompts}</p>
              {tierLimits.prompts !== -1 && (
                <p className="text-xs text-gray-500 mt-1">of {tierLimits.prompts} allowed</p>
              )}
            </div>
            <FileText className="w-8 h-8 text-blue-600" />
          </div>
          {tierLimits.prompts !== -1 && (
            <div className="mt-3">
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${
                    usagePercentage >= 90 ? 'bg-red-600' : 
                    usagePercentage >= 75 ? 'bg-yellow-600' : 
                    'bg-green-600'
                  }`}
                  style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Total Versions */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Versions</p>
              <p className="text-2xl font-bold mt-1">{analytics.totalVersions}</p>
              <p className="text-xs text-gray-500 mt-1">across all prompts</p>
            </div>
            <Activity className="w-8 h-8 text-purple-600" />
          </div>
        </div>

        {/* Public & Shared */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Public & Shared</p>
              <p className="text-2xl font-bold mt-1">{analytics.publicPrompts + analytics.activeShares}</p>
              <p className="text-xs text-gray-500 mt-1">
                {analytics.publicPrompts} public, {analytics.activeShares} shared
              </p>
            </div>
            <Share2 className="w-8 h-8 text-green-600" />
          </div>
        </div>

        {/* Current Tier */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Current Tier</p>
              <p className="text-2xl font-bold mt-1 capitalize">{analytics.tier}</p>
              {analytics.tier === 'free' && (
                <button 
                  onClick={() => router.push('/settings/billing')}
                  className="text-xs text-blue-600 hover:underline mt-1"
                >
                  Upgrade for more
                </button>
              )}
            </div>
            <Crown className={`w-8 h-8 ${
              analytics.tier === 'enterprise' ? 'text-purple-600' :
              analytics.tier === 'pro' ? 'text-blue-600' :
              'text-gray-400'
            }`} />
          </div>
        </div>
      </div>

      {/* Folder Distribution */}
      {Object.keys(analytics.promptsByFolder).length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Folder className="w-5 h-5 mr-2" />
            Prompts by Folder
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {Object.entries(analytics.promptsByFolder).map(([folder, count]) => (
              <div key={folder} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <span className="text-sm font-medium truncate">{folder}</span>
                <span className="text-sm text-gray-600 dark:text-gray-400 ml-2">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Activity Indicator */}
      {analytics.recentActivity > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-center">
            <TrendingUp className="w-5 h-5 text-blue-600 mr-2" />
            <p className="text-sm text-blue-800 dark:text-blue-200">
              You've created {analytics.recentActivity} version{analytics.recentActivity !== 1 ? 's' : ''} in the past 7 days. Keep up the great work!
            </p>
          </div>
        </div>
      )}

      <div className="border-t pt-6">
        <h2 className="text-2xl font-bold mb-4">My Prompts</h2>

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
    </div>
  );
}