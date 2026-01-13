/**
 * Plugin tier detection and analysis
 *
 * Tiers:
 * - Tier 0: Browser-only + Obsidian API (fully supported)
 * - Tier 1: Limited extra capabilities (network, clipboard, notifications) - supported with permissions
 * - Tier 2: Node/Electron APIs (NOT SUPPORTED)
 */

export type PluginTier = 0 | 1 | 2;

export interface PluginTierInfo {
  tier: PluginTier;
  permissions: string[];
  blockedReasons: string[];
  isCompatible: boolean;
}

/**
 * Detect plugin tier by analyzing the plugin's main.js content
 */
export async function detectPluginTier(mainJsContent: string): Promise<PluginTierInfo> {
  const permissions: string[] = [];
  const blockedReasons: string[] = [];
  let tier: PluginTier = 0;

  // Check for Tier 2 (blocked) patterns
  const tier2Patterns = [
    { pattern: /require\s*\(\s*['"(]fs['")]/, name: 'Node.js filesystem API (fs)' },
    { pattern: /require\s*\(\s*['"(]child_process['")]/, name: 'Node.js child_process API' },
    { pattern: /require\s*\(\s*['"(]electron['")]/, name: 'Electron API' },
    { pattern: /require\s*\(\s*['"(]path['")]/, name: 'Node.js path API (path)' },
    { pattern: /require\s*\(\s*['"(]os['")]/, name: 'Node.js OS API (os)' },
    { pattern: /require\s*\(\s*['"(]crypto['")]/, name: 'Node.js crypto API' },
    { pattern: /require\s*\(\s*['"(]util['")]/, name: 'Node.js util API' },
    { pattern: /@electron\/remote/, name: 'Electron remote API' },
  ];

  for (const { pattern, name } of tier2Patterns) {
    if (pattern.test(mainJsContent)) {
      tier = 2;
      blockedReasons.push(`Requires ${name}`);
    }
  }

  // If Tier 2, no need to check for Tier 1 permissions
  if (tier === 2) {
    return {
      tier: 2,
      permissions: [],
      blockedReasons,
      isCompatible: false,
    };
  }

  // Check for Tier 1 capabilities
  if (/fetch\s*\(/.test(mainJsContent) || /axios/i.test(mainJsContent)) {
    permissions.push('network');
  }

  if (/navigator\.clipboard/.test(mainJsContent)) {
    permissions.push('clipboard');
  }

  if (/new Notification\s*\(/.test(mainJsContent)) {
    permissions.push('notifications');
  }

  // Determine tier based on permissions
  if (permissions.length > 0) {
    tier = 1;
  }

  return {
    tier,
    permissions,
    blockedReasons,
    isCompatible: true, // tier 2 plugins return early, so reaching here means compatible
  };
}

/**
 * Get tier display name
 */
export function getTierName(tier: PluginTier): string {
  switch (tier) {
    case 0:
      return 'Tier 0: Full Support';
    case 1:
      return 'Tier 1: Limited Support';
    case 2:
      return 'Tier 2: Not Supported';
  }
}

/**
 * Get tier badge color
 */
export function getTierColor(tier: PluginTier): { bg: string; border: string; text: string } {
  switch (tier) {
    case 0:
      return {
        bg: '#14532d',
        border: '#22c55e',
        text: '#86efac',
      };
    case 1:
      return {
        bg: '#451a03',
        border: '#f59e0b',
        text: '#fcd34d',
      };
    case 2:
      return {
        bg: '#450a0a',
        border: '#dc2626',
        text: '#fca5a5',
      };
  }
}

/**
 * Get permission display name
 */
export function getPermissionName(permission: string): string {
  switch (permission) {
    case 'network':
      return 'Network Access';
    case 'clipboard':
      return 'Clipboard Access';
    case 'notifications':
      return 'Notifications';
    default:
      return permission;
  }
}

/**
 * Get permission description
 */
export function getPermissionDescription(permission: string): string {
  switch (permission) {
    case 'network':
      return 'Allow this plugin to make HTTP/HTTPS requests to external servers.';
    case 'clipboard':
      return 'Allow this plugin to read from and write to your system clipboard.';
    case 'notifications':
      return 'Allow this plugin to show system notifications.';
    default:
      return `Allow ${permission} access.`;
  }
}
