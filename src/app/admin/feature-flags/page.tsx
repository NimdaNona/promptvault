'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, 
  Users, 
  Percent, 
  Save,
  RefreshCw,
  Code,
  BarChart3,
  FolderOpen,
  Activity,
} from 'lucide-react';
import { FeatureFlags, FeatureFlag } from '@/lib/features/flags';
import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export default function FeatureFlagsPage() {
  const { userId } = useAuth();
  const router = useRouter();
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Check admin access
    const checkAccess = async () => {
      try {
        const response = await fetch('/api/admin/check-access');
        if (!response.ok) {
          router.push('/dashboard');
          return;
        }
      } catch (error) {
        router.push('/dashboard');
        return;
      }
    };

    checkAccess();
    loadFlags();
  }, [router]);

  const loadFlags = () => {
    setLoading(true);
    // Load flags from FeatureFlags class
    const allFlags = FeatureFlags.getAllFlags();
    setFlags(allFlags);
    setLoading(false);
  };

  const handleToggle = (flagName: string, enabled: boolean) => {
    FeatureFlags.updateFlag(flagName, { enabled });
    loadFlags();
  };

  const handleRolloutChange = (flagName: string, percentage: number) => {
    FeatureFlags.updateFlag(flagName, { rolloutPercentage: percentage });
    loadFlags();
  };

  const handleAddAllowedUser = (flagName: string, userId: string) => {
    const flag = flags.find(f => f.name === flagName);
    if (flag) {
      const allowedUsers = [...(flag.allowedUsers || []), userId];
      FeatureFlags.updateFlag(flagName, { allowedUsers });
      loadFlags();
    }
  };

  const handleRemoveAllowedUser = (flagName: string, userId: string) => {
    const flag = flags.find(f => f.name === flagName);
    if (flag) {
      const allowedUsers = (flag.allowedUsers || []).filter(u => u !== userId);
      FeatureFlags.updateFlag(flagName, { allowedUsers });
      loadFlags();
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // In a real implementation, this would persist to database
      toast.success('Feature flags updated successfully');
    } catch (error) {
      toast.error('Failed to save feature flags');
    } finally {
      setSaving(false);
    }
  };

  const getFlagIcon = (flagName: string) => {
    switch (flagName) {
      case 'cline_import':
        return <Code className="h-5 w-5" />;
      case 'cline_import_analytics':
        return <BarChart3 className="h-5 w-5" />;
      case 'cline_import_folder_scan':
        return <FolderOpen className="h-5 w-5" />;
      case 'cline_import_performance_monitor':
        return <Activity className="h-5 w-5" />;
      default:
        return <Shield className="h-5 w-5" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Feature Flags Management
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Control feature rollout and availability across the platform
        </p>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-4 mb-6">
        <Button
          variant="outline"
          onClick={loadFlags}
          disabled={loading}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
        <Button
          onClick={handleSave}
          disabled={saving}
        >
          <Save className="mr-2 h-4 w-4" />
          Save Changes
        </Button>
      </div>

      {/* Feature Flags Grid */}
      <div className="grid gap-6">
        {flags.map((flag) => (
          <Card key={flag.name}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getFlagIcon(flag.name)}
                  <div>
                    <CardTitle className="text-xl">
                      {flag.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </CardTitle>
                    <CardDescription>{flag.description}</CardDescription>
                  </div>
                </div>
                <Switch
                  checked={flag.enabled}
                  onCheckedChange={(checked) => handleToggle(flag.name, checked)}
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Rollout Percentage */}
              {flag.rolloutPercentage !== undefined && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2">
                      <Percent className="h-4 w-4" />
                      Rollout Percentage
                    </Label>
                    <span className="text-sm font-medium">{flag.rolloutPercentage}%</span>
                  </div>
                  <Slider
                    value={[flag.rolloutPercentage]}
                    onValueChange={([value]) => handleRolloutChange(flag.name, value)}
                    max={100}
                    step={5}
                    className="w-full"
                    disabled={!flag.enabled}
                  />
                </div>
              )}

              {/* Allowed Users */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Allowed Users
                </Label>
                <div className="flex flex-wrap gap-2">
                  {flag.allowedUsers?.map((userId) => (
                    <Badge
                      key={userId}
                      variant="secondary"
                      className="cursor-pointer"
                      onClick={() => handleRemoveAllowedUser(flag.name, userId)}
                    >
                      {userId}
                      <span className="ml-1 text-xs">×</span>
                    </Badge>
                  ))}
                  <Input
                    placeholder="Add user ID"
                    className="w-48 h-6 text-sm"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        const input = e.target as HTMLInputElement;
                        if (input.value) {
                          handleAddAllowedUser(flag.name, input.value);
                          input.value = '';
                        }
                      }
                    }}
                    disabled={!flag.enabled}
                  />
                </div>
              </div>

              {/* Feature-specific info */}
              {flag.name === 'cline_import' && (
                <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    <strong>Note:</strong> This flag controls the visibility of the Cline import option
                    on the imports page. When disabled, users won't see the Cline import card.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}