"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, Loader2, CreditCard, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { TIERS } from "@/lib/tiers";

interface BillingClientProps {
  currentTier: string;
  hasSubscription: boolean;
  promptCount: number;
}

export default function BillingClient({ currentTier, hasSubscription, promptCount }: BillingClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState<string | null>(null);

  useEffect(() => {
    // Check for success/cancel params
    if (searchParams.get("success") === "true") {
      toast.success("Subscription activated successfully!");
      router.replace("/settings/billing");
    } else if (searchParams.get("canceled") === "true") {
      toast.info("Subscription canceled");
      router.replace("/settings/billing");
    }
  }, [searchParams, router]);

  const handleUpgrade = async (tier: 'pro' | 'enterprise') => {
    setIsLoading(tier);
    try {
      const response = await fetch("/api/billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier }),
      });

      if (!response.ok) {
        throw new Error("Failed to create checkout session");
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error("Upgrade error:", error);
      toast.error("Failed to start upgrade process");
      setIsLoading(null);
    }
  };

  const handleManageBilling = async () => {
    setIsLoading('manage');
    try {
      const response = await fetch("/api/billing");

      if (!response.ok) {
        throw new Error("Failed to access billing portal");
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error("Billing portal error:", error);
      toast.error("Failed to access billing portal");
      setIsLoading(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Current Plan */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Current Plan</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold capitalize">{currentTier}</p>
            <p className="text-gray-600 dark:text-gray-400">
              {hasSubscription ? "Active subscription" : "No active subscription"}
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Using {promptCount} of {TIERS[currentTier as keyof typeof TIERS].limits.prompts === -1 ? 'unlimited' : TIERS[currentTier as keyof typeof TIERS].limits.prompts} prompts
            </p>
          </div>
          {hasSubscription && (
            <Button
              onClick={handleManageBilling}
              variant="outline"
              disabled={isLoading === 'manage'}
            >
              {isLoading === 'manage' ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4 mr-2" />
                  Manage Billing
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Pricing Tiers */}
      <div>
        <h2 className="text-xl font-semibold mb-6">Available Plans</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {/* Free Tier */}
          <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 ${currentTier === 'free' ? 'ring-2 ring-blue-600' : ''}`}>
            <h3 className="text-lg font-semibold mb-2">Free</h3>
            <p className="text-3xl font-bold mb-4">
              $0<span className="text-sm font-normal">/month</span>
            </p>
            <ul className="space-y-2 mb-6">
              <li className="flex items-center text-sm">
                <Check className="w-4 h-4 mr-2 text-green-600" />
                Up to 50 prompts
              </li>
              <li className="flex items-center text-sm">
                <Check className="w-4 h-4 mr-2 text-green-600" />
                Basic organization
              </li>
              <li className="flex items-center text-sm">
                <Check className="w-4 h-4 mr-2 text-green-600" />
                Version history
              </li>
              <li className="flex items-center text-sm text-gray-400">
                <AlertCircle className="w-4 h-4 mr-2" />
                No AI optimization
              </li>
            </ul>
            {currentTier === 'free' && (
              <Button variant="outline" disabled className="w-full">
                Current Plan
              </Button>
            )}
          </div>

          {/* Pro Tier */}
          <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 ${currentTier === 'pro' ? 'ring-2 ring-blue-600' : ''} relative`}>
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-3 py-1 rounded-full text-sm">
              Popular
            </div>
            <h3 className="text-lg font-semibold mb-2">Pro</h3>
            <p className="text-3xl font-bold mb-4">
              $9<span className="text-sm font-normal">/month</span>
            </p>
            <ul className="space-y-2 mb-6">
              <li className="flex items-center text-sm">
                <Check className="w-4 h-4 mr-2 text-green-600" />
                Unlimited prompts
              </li>
              <li className="flex items-center text-sm">
                <Check className="w-4 h-4 mr-2 text-green-600" />
                AI optimization
              </li>
              <li className="flex items-center text-sm">
                <Check className="w-4 h-4 mr-2 text-green-600" />
                Team collaboration (5 members)
              </li>
              <li className="flex items-center text-sm">
                <Check className="w-4 h-4 mr-2 text-green-600" />
                Priority support
              </li>
            </ul>
            {currentTier === 'pro' ? (
              <Button variant="outline" disabled className="w-full">
                Current Plan
              </Button>
            ) : currentTier === 'free' ? (
              <Button
                onClick={() => handleUpgrade('pro')}
                disabled={isLoading === 'pro'}
                className="w-full"
              >
                {isLoading === 'pro' ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Upgrade to Pro'
                )}
              </Button>
            ) : (
              <Button variant="outline" disabled className="w-full">
                Contact for Downgrade
              </Button>
            )}
          </div>

          {/* Enterprise Tier */}
          <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 ${currentTier === 'enterprise' ? 'ring-2 ring-blue-600' : ''}`}>
            <h3 className="text-lg font-semibold mb-2">Enterprise</h3>
            <p className="text-3xl font-bold mb-4">
              $29<span className="text-sm font-normal">/month</span>
            </p>
            <ul className="space-y-2 mb-6">
              <li className="flex items-center text-sm">
                <Check className="w-4 h-4 mr-2 text-green-600" />
                Everything in Pro
              </li>
              <li className="flex items-center text-sm">
                <Check className="w-4 h-4 mr-2 text-green-600" />
                Unlimited team members
              </li>
              <li className="flex items-center text-sm">
                <Check className="w-4 h-4 mr-2 text-green-600" />
                Advanced analytics
              </li>
              <li className="flex items-center text-sm">
                <Check className="w-4 h-4 mr-2 text-green-600" />
                Custom integrations
              </li>
            </ul>
            {currentTier === 'enterprise' ? (
              <Button variant="outline" disabled className="w-full">
                Current Plan
              </Button>
            ) : currentTier === 'free' ? (
              <Button
                onClick={() => handleUpgrade('enterprise')}
                disabled={isLoading === 'enterprise'}
                className="w-full"
              >
                {isLoading === 'enterprise' ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Upgrade to Enterprise'
                )}
              </Button>
            ) : (
              <Button
                onClick={() => handleUpgrade('enterprise')}
                disabled={isLoading === 'enterprise'}
                className="w-full"
              >
                {isLoading === 'enterprise' ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Upgrade to Enterprise'
                )}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Frequently Asked Questions</h2>
        <div className="space-y-4">
          <div>
            <h3 className="font-medium mb-1">Can I cancel anytime?</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Yes, you can cancel your subscription at any time. You&apos;ll continue to have access until the end of your billing period.
            </p>
          </div>
          <div>
            <h3 className="font-medium mb-1">What happens to my prompts if I downgrade?</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Your prompts remain safe. If you exceed the free tier limit, you won&apos;t be able to create new prompts until you upgrade or delete some existing ones.
            </p>
          </div>
          <div>
            <h3 className="font-medium mb-1">Do you offer refunds?</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              We offer a 7-day money-back guarantee for new subscriptions. Contact support for assistance.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}