"use client";

import { useState } from "react";
import { Share2, Copy, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface ShareDialogProps {
  promptId: string;
  promptName: string;
}

export default function ShareDialog({ promptId, promptName }: ShareDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [expiresIn, setExpiresIn] = useState(0); // 0 means no expiration

  const createShareLink = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          promptId,
          expiresIn: expiresIn > 0 ? expiresIn : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create share link");
      }

      const data = await response.json();
      setShareUrl(data.shareUrl);
    } catch (error) {
      console.error("Share error:", error);
      toast.error("Failed to create share link");
    } finally {
      setIsLoading(false);
    }
  };

  const copyShareLink = () => {
    navigator.clipboard.writeText(shareUrl);
    toast.success("Share link copied to clipboard!");
  };

  const openDialog = () => {
    setIsOpen(true);
    if (!shareUrl) {
      createShareLink();
    }
  };

  const closeDialog = () => {
    setIsOpen(false);
  };

  return (
    <>
      <Button
        size="sm"
        variant="ghost"
        onClick={openDialog}
        title="Share prompt"
      >
        <Share2 className="w-4 h-4" />
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={closeDialog}
          />

          {/* Dialog */}
          <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
            <button
              onClick={closeDialog}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-semibold mb-4">Share "{promptName}"</h2>

            {/* Expiration Options */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Link expires in:</label>
              <select
                value={expiresIn}
                onChange={(e) => {
                  setExpiresIn(Number(e.target.value));
                  setShareUrl(""); // Reset URL when expiration changes
                }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
              >
                <option value={0}>Never</option>
                <option value={1}>1 hour</option>
                <option value={24}>24 hours</option>
                <option value={168}>7 days</option>
                <option value={720}>30 days</option>
              </select>
            </div>

            {/* Share Link */}
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              </div>
            ) : shareUrl ? (
              <div className="space-y-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={shareUrl}
                    readOnly
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-900 text-sm"
                  />
                  <Button onClick={copyShareLink} variant="outline">
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Anyone with this link can view your prompt.
                  {expiresIn > 0 && ` Link expires in ${expiresIn} hours.`}
                </p>

                <Button
                  onClick={createShareLink}
                  variant="outline"
                  className="w-full"
                >
                  Generate New Link
                </Button>
              </div>
            ) : (
              <Button
                onClick={createShareLink}
                className="w-full"
                disabled={isLoading}
              >
                Create Share Link
              </Button>
            )}
          </div>
        </div>
      )}
    </>
  );
}