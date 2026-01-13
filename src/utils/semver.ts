/**
 * Semantic Versioning Utilities
 *
 * Provides semver comparison functionality without external dependencies.
 * Based on semver.org specification.
 */

/**
 * The pinned Obsidian API compatibility version
 * Igne supports plugins compatible with this version or earlier
 */
export const OBSIDIAN_COMPAT_VERSION = '1.11.4';

/**
 * Parsed semantic version components
 */
interface SemVer {
  major: number;
  minor: number;
  patch: number;
  prerelease: (string | number)[];
  build: string[];
}

/**
 * Parse a semver string into its components
 *
 * @param version - Semver string (e.g., "1.11.4", "2.0.0-beta.1")
 * @returns Parsed SemVer object or null if invalid
 */
export function parseSemver(version: string): SemVer | null {
  let trimmed = version.trim();

  // Strip optional 'v' prefix (common in manifests)
  if (trimmed.startsWith('v')) {
    trimmed = trimmed.slice(1);
  }

  // Main version pattern: major.minor.patch
  const mainPattern = /^(\d+)\.(\d+)\.(\d+)/;
  const mainMatch = trimmed.match(mainPattern);

  if (!mainMatch) {
    // Partial version pattern: major, major.minor, major.minor.patch
    const partialPattern = /^(\d+)(?:\.(\d+))?(?:\.(\d+))?$/;
    const partialMatch = trimmed.match(partialPattern);

    if (partialMatch) {
      const major = parseInt(partialMatch[1], 10);
      const minor = partialMatch[2] ? parseInt(partialMatch[2], 10) : 0;
      const patch = partialMatch[3] ? parseInt(partialMatch[3], 10) : 0;

      return { major, minor, patch, prerelease: [], build: [] };
    }

    return null;
  }

  const major = parseInt(mainMatch[1], 10);
  const minor = parseInt(mainMatch[2], 10);
  const patch = parseInt(mainMatch[3], 10);

  // Check for prerelease and build metadata
  const remainder = trimmed.slice(mainMatch[0].length);

  let prerelease: (string | number)[] = [];
  let build: string[] = [];

  if (remainder.length > 0) {
    // Prerelease: -1.2.3-alpha.1 or -1.2.3-alpha
    const prereleasePattern = /^-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)/;
    const prereleaseMatch = remainder.match(prereleasePattern);

    if (prereleaseMatch) {
      prerelease = prereleaseMatch[1].split('.').map((part) => {
        // Numeric identifiers are compared as numbers
        const num = parseInt(part, 10);
        return isNaN(num) ? part : num;
      });

      // Check for build metadata after prerelease
      const buildPattern = /^\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)/;
      const buildRemainder = remainder.slice(prereleaseMatch[0].length);
      const buildMatch = buildRemainder.match(buildPattern);

      if (buildMatch) {
        build = buildMatch[1].split('.');
      }
    } else {
      // Build metadata only: +build.1
      const buildPattern = /^\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)/;
      const buildMatch = remainder.match(buildPattern);

      if (buildMatch) {
        build = buildMatch[1].split('.');
      }
    }
  }

  return { major, minor, patch, prerelease, build };
}

/**
 * Compare two semantic version strings
 *
 * @param a - First version string
 * @param b - Second version string
 * @returns -1 if a < b, 0 if a == b, 1 if a > b
 *
 * @example
 * compareVersions("1.11.4", "1.11.5") // returns -1
 * compareVersions("1.11.4", "1.11.4") // returns 0
 * compareVersions("1.11.5", "1.11.4") // returns 1
 */
export function compareVersions(a: string, b: string): number {
  const semverA = parseSemver(a);
  const semverB = parseSemver(b);

  if (!semverA || !semverB) {
    throw new Error(`Invalid semver strings: "${a}" and "${b}"`);
  }

  // Compare major, minor, patch
  if (semverA.major !== semverB.major) {
    return semverA.major < semverB.major ? -1 : 1;
  }

  if (semverA.minor !== semverB.minor) {
    return semverA.minor < semverB.minor ? -1 : 1;
  }

  if (semverA.patch !== semverB.patch) {
    return semverA.patch < semverB.patch ? -1 : 1;
  }

  // Compare prerelease
  const hasPreA = semverA.prerelease.length > 0;
  const hasPreB = semverB.prerelease.length > 0;

  // Versions with prerelease are lower than without
  if (hasPreA && !hasPreB) {
    return -1;
  }
  if (!hasPreA && hasPreB) {
    return 1;
  }

  // Both have prerelease, compare each identifier
  const maxLength = Math.max(semverA.prerelease.length, semverB.prerelease.length);

  for (let i = 0; i < maxLength; i++) {
    const idA = semverA.prerelease[i] ?? 0;
    const idB = semverB.prerelease[i] ?? 0;

    if (typeof idA === 'number' && typeof idB === 'number') {
      if (idA !== idB) {
        return idA < idB ? -1 : 1;
      }
    } else if (typeof idA === 'number' && typeof idB === 'string') {
      // Numbers are lower than strings
      return -1;
    } else if (typeof idA === 'string' && typeof idB === 'number') {
      return 1;
    } else {
      // Both strings, compare lexicographically
      const comparison = String(idA).localeCompare(String(idB));
      if (comparison !== 0) {
        return comparison < 0 ? -1 : 1;
      }
    }
  }

  // Build metadata does not affect precedence
  return 0;
}

/**
 * Check if version A is greater than version B
 */
export function gt(a: string, b: string): boolean {
  return compareVersions(a, b) > 0;
}

/**
 * Check if version A is less than version B
 */
export function lt(a: string, b: string): boolean {
  return compareVersions(a, b) < 0;
}

/**
 * Check if version A equals version B
 */
export function eq(a: string, b: string): boolean {
  return compareVersions(a, b) === 0;
}

/**
 * Check if version A is greater than or equal to version B
 */
export function gte(a: string, b: string): boolean {
  return compareVersions(a, b) >= 0;
}

/**
 * Check if version A is less than or equal to version B
 */
export function lte(a: string, b: string): boolean {
  return compareVersions(a, b) <= 0;
}

/**
 * Check if a version satisfies a minimum version requirement
 * @param version - The version to check
 * @param minVersion - The minimum required version
 * @returns true if version >= minVersion
 */
export function satisfiesMinVersion(version: string, minVersion: string): boolean {
  return gte(version, minVersion);
}

/**
 * Check if a plugin's minimum app version is compatible with Igne
 * @param minAppVersion - The plugin's minimum Obsidian version requirement
 * @returns true if the plugin is compatible
 */
export function isPluginCompatible(minAppVersion: string): boolean {
  // Plugin is compatible if it requires Igne's baseline version or earlier
  return lte(minAppVersion, OBSIDIAN_COMPAT_VERSION);
}
