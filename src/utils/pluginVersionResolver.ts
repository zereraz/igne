// =============================================================================
// Plugin Version Resolver
// =============================================================================
// Handles versions.json fallback for plugin installation
// Mirrors Obsidian's behavior when installing from plugin repositories

import { compareVersions, OBSIDIAN_COMPAT_VERSION } from './semver';

/**
 * Structure of versions.json from plugin repository
 * Maps plugin version -> minimum Obsidian version required
 *
 * Example:
 * {
 *   "1.0.0": "0.15.0",
 *   "1.1.0": "0.16.0",
 *   "2.0.0": "1.0.0"
 * }
 */
export interface VersionsJson {
  [pluginVersion: string]: string;
}

/**
 * Result of version resolution
 */
export interface VersionResolution {
  /** The selected plugin version (or null if none compatible) */
  version: string | null;
  /** The minimum app version for this plugin version */
  minAppVersion: string;
  /** Human-readable explanation of why this version was selected */
  reason: string;
}

/**
 * Result of plugin release metadata
 */
export interface PluginRelease {
  version: string;
  minAppVersion: string;
  downloadUrl: string;
}

/**
 * Resolve the newest compatible plugin version from versions.json
 *
 * This mimics Obsidian's behavior: if the latest release requires a newer
 * app version than we support, we look for the newest release that is
 * compatible with our supported baseline.
 *
 * @param latestRelease - The latest plugin release from the repository
 * @param versionsJson - The versions.json mapping from the repository
 * @returns Resolution result with selected version and explanation
 */
export function resolveCompatibleVersion(
  latestRelease: PluginRelease,
  versionsJson: VersionsJson
): VersionResolution {
  // First, check if the latest version is compatible
  if (compareVersions(latestRelease.minAppVersion, OBSIDIAN_COMPAT_VERSION) <= 0) {
    return {
      version: latestRelease.version,
      minAppVersion: latestRelease.minAppVersion,
      reason: `Latest version ${latestRelease.version} is compatible with Igne (Obsidian API ${OBSIDIAN_COMPAT_VERSION})`,
    };
  }

  // Latest is not compatible, find the newest compatible version
  const compatibleVersions: Array<{ version: string; minAppVersion: string }> = [];

  for (const [pluginVersion, minAppVersion] of Object.entries(versionsJson)) {
    // Check if this version is compatible with our baseline
    if (compareVersions(minAppVersion, OBSIDIAN_COMPAT_VERSION) <= 0) {
      compatibleVersions.push({ version: pluginVersion, minAppVersion });
    }
  }

  // Sort by version (newest first) using our semver compare
  compatibleVersions.sort((a, b) => compareVersions(b.version, a.version));

  if (compatibleVersions.length === 0) {
    return {
      version: null,
      minAppVersion: latestRelease.minAppVersion,
      reason: `No compatible version found. Latest ${latestRelease.version} requires Obsidian ${latestRelease.minAppVersion}, ` +
        `but Igne only supports Obsidian API ${OBSIDIAN_COMPAT_VERSION}.`,
    };
  }

  const selected = compatibleVersions[0];
  return {
    version: selected.version,
    minAppVersion: selected.minAppVersion,
    reason: `Latest version ${latestRelease.version} requires Obsidian ${latestRelease.minAppVersion}, ` +
      `which is newer than Igne's supported baseline (${OBSIDIAN_COMPAT_VERSION}). ` +
      `Installing compatible version ${selected.version} instead.`,
  };
}

/**
 * Fetch versions.json from a plugin repository URL
 *
 * @param repoUrl - Base URL of the plugin repository
 * @returns The parsed versions.json, or null if fetch fails
 */
export async function fetchVersionsJson(repoUrl: string): Promise<VersionsJson | null> {
  try {
    const versionsUrl = new URL('versions.json', repoUrl).href;
    const response = await fetch(versionsUrl);

    if (!response.ok) {
      console.warn(`[PluginVersionResolver] Failed to fetch versions.json: ${response.status}`);
      return null;
    }

    const data = await response.json();

    // Validate that it's the right structure
    if (typeof data !== 'object' || data === null) {
      console.warn('[PluginVersionResolver] Invalid versions.json: not an object');
      return null;
    }

    return data as VersionsJson;
  } catch (error) {
    console.error('[PluginVersionResolver] Error fetching versions.json:', error);
    return null;
  }
}

/**
 * In-memory cache for versions.json responses
 * Maps repository URL -> versions.json
 */
const versionsJsonCache = new Map<string, VersionsJson>();

/**
 * Fetch versions.json with caching
 *
 * @param repoUrl - Base URL of the plugin repository
 * @param useCache - Whether to use cached response (default: true)
 * @returns The parsed versions.json, or null if fetch fails
 */
export async function fetchVersionsJsonCached(
  repoUrl: string,
  useCache: boolean = true
): Promise<VersionsJson | null> {
  if (useCache && versionsJsonCache.has(repoUrl)) {
    return versionsJsonCache.get(repoUrl)!;
  }

  const data = await fetchVersionsJson(repoUrl);

  if (data !== null) {
    versionsJsonCache.set(repoUrl, data);
  }

  return data;
}

/**
 * Clear the versions.json cache
 */
export function clearVersionsJsonCache(): void {
  versionsJsonCache.clear();
}

/**
 * Resolve plugin version for installation (with cached versions.json)
 *
 * This is the main entry point for plugin installation flow:
 *
 * 1. Fetch plugin metadata (latest release)
 * 2. Fetch versions.json (cached)
 * 3. Resolve compatible version
 * 4. Return result with explanation
 *
 * @param repoUrl - Base URL of the plugin repository
 * @param latestRelease - The latest plugin release from the repository
 * @returns Resolution result
 */
export async function resolvePluginVersionForInstall(
  repoUrl: string,
  latestRelease: PluginRelease
): Promise<VersionResolution> {
  const versionsJson = await fetchVersionsJsonCached(repoUrl);

  if (versionsJson === null) {
    // No versions.json available, can only use latest
    if (compareVersions(latestRelease.minAppVersion, OBSIDIAN_COMPAT_VERSION) <= 0) {
      return {
        version: latestRelease.version,
        minAppVersion: latestRelease.minAppVersion,
        reason: `Latest version ${latestRelease.version} is compatible with Igne (Obsidian API ${OBSIDIAN_COMPAT_VERSION})`,
      };
    }

    return {
      version: null,
      minAppVersion: latestRelease.minAppVersion,
      reason: `Latest version ${latestRelease.version} requires Obsidian ${latestRelease.minAppVersion}, ` +
        `which is newer than Igne's supported baseline (${OBSIDIAN_COMPAT_VERSION}). ` +
        `No versions.json available to find compatible version.`,
    };
  }

  return resolveCompatibleVersion(latestRelease, versionsJson);
}
