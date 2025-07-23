/**
 * Feature flag system for controlling feature rollout
 */

export interface FeatureFlag {
  name: string;
  enabled: boolean;
  description: string;
  rolloutPercentage?: number;
  allowedUsers?: string[];
  blockedUsers?: string[];
}

export class FeatureFlags {
  private static flags: Map<string, FeatureFlag> = new Map();

  static {
    // Initialize default flags
    this.register({
      name: 'cline_import',
      enabled: process.env.DISABLE_CLINE_IMPORT !== 'true',
      description: 'Enable Cline VSCode extension import feature',
      rolloutPercentage: 100,
    });

    this.register({
      name: 'cline_import_analytics',
      enabled: true,
      description: 'Enable analytics tracking for Cline imports',
    });

    this.register({
      name: 'cline_import_folder_scan',
      enabled: true,
      description: 'Enable folder scanning for Cline imports',
    });

    this.register({
      name: 'cline_import_performance_monitor',
      enabled: true,
      description: 'Show performance metrics during Cline imports',
    });
  }

  /**
   * Register a new feature flag
   */
  static register(flag: FeatureFlag): void {
    this.flags.set(flag.name, flag);
  }

  /**
   * Check if a feature is enabled for a user
   */
  static isEnabled(flagName: string, userId?: string): boolean {
    const flag = this.flags.get(flagName);
    if (!flag) return false;

    // Check if globally disabled
    if (!flag.enabled) return false;

    // Check blocked users
    if (userId && flag.blockedUsers?.includes(userId)) return false;

    // Check allowed users (if specified, only these users have access)
    if (flag.allowedUsers && flag.allowedUsers.length > 0) {
      return userId ? flag.allowedUsers.includes(userId) : false;
    }

    // Check rollout percentage
    if (flag.rolloutPercentage !== undefined && flag.rolloutPercentage < 100) {
      if (!userId) return false;
      
      // Simple hash-based rollout
      const hash = this.hashString(userId);
      const userPercentage = (hash % 100) + 1;
      return userPercentage <= flag.rolloutPercentage;
    }

    return true;
  }

  /**
   * Get all flags (for admin dashboard)
   */
  static getAllFlags(): FeatureFlag[] {
    return Array.from(this.flags.values());
  }

  /**
   * Update a flag (admin only)
   */
  static updateFlag(flagName: string, updates: Partial<FeatureFlag>): void {
    const flag = this.flags.get(flagName);
    if (flag) {
      this.flags.set(flagName, { ...flag, ...updates });
    }
  }

  /**
   * Simple string hash for consistent rollout
   */
  private static hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }
}

/**
 * React hook for feature flags
 */
export function useFeatureFlag(flagName: string, userId?: string): boolean {
  return FeatureFlags.isEnabled(flagName, userId);
}

/**
 * Server-side feature flag check
 */
export async function checkFeatureFlag(
  flagName: string,
  userId?: string
): Promise<boolean> {
  // Could fetch from database or external service
  // For now, use in-memory flags
  return FeatureFlags.isEnabled(flagName, userId);
}