// =============================================================================
// Semver Utility Tests
// =============================================================================

import { describe, it, expect } from 'vitest';
import { parseSemver, compareVersions, satisfiesMinVersion, isPluginCompatible, OBSIDIAN_COMPAT_VERSION } from '../semver';

describe('parseSemver', () => {
  it('should parse simple version', () => {
    const result = parseSemver('1.11.4');
    expect(result.major).toBe(1);
    expect(result.minor).toBe(11);
    expect(result.patch).toBe(4);
    expect(result.prerelease).toEqual([]);
    expect(result.build).toEqual([]);
  });

  it('should parse version with v prefix', () => {
    const result = parseSemver('v1.11.4');
    expect(result.major).toBe(1);
    expect(result.minor).toBe(11);
    expect(result.patch).toBe(4);
  });

  it('should parse version with prerelease', () => {
    const result = parseSemver('1.11.4-beta.1');
    expect(result.major).toBe(1);
    expect(result.minor).toBe(11);
    expect(result.patch).toBe(4);
    expect(result.prerelease).toEqual(['beta', 1]);
  });

  it('should parse version with build metadata', () => {
    const result = parseSemver('1.11.4+build.123');
    expect(result.major).toBe(1);
    expect(result.minor).toBe(11);
    expect(result.patch).toBe(4);
    expect(result.build).toEqual(['build', '123']);
  });

  it('should handle missing minor/patch', () => {
    const result = parseSemver('1');
    expect(result.major).toBe(1);
    expect(result.minor).toBe(0);
    expect(result.patch).toBe(0);
  });
});

describe('compareVersions', () => {
  it('should return -1 when a < b', () => {
    expect(compareVersions('1.11.4', '1.11.5')).toBe(-1);
    expect(compareVersions('1.11.4', '1.12.0')).toBe(-1);
    expect(compareVersions('1.11.4', '2.0.0')).toBe(-1);
  });

  it('should return 1 when a > b', () => {
    expect(compareVersions('1.11.5', '1.11.4')).toBe(1);
    expect(compareVersions('1.12.0', '1.11.4')).toBe(1);
    expect(compareVersions('2.0.0', '1.11.4')).toBe(1);
  });

  it('should return 0 when a === b', () => {
    expect(compareVersions('1.11.4', '1.11.4')).toBe(0);
    expect(compareVersions('1.0.0', '1.0.0')).toBe(0);
  });

  it('should handle prerelease versions', () => {
    // Prerelease is lower than release
    expect(compareVersions('1.11.4-alpha', '1.11.4')).toBe(-1);
    expect(compareVersions('1.11.4', '1.11.4-alpha')).toBe(1);

    // Compare prerelease identifiers
    expect(compareVersions('1.11.4-alpha.1', '1.11.4-alpha.2')).toBe(-1);
    expect(compareVersions('1.11.4-beta', '1.11.4-alpha')).toBe(1);
  });

  it('should handle numeric vs string prerelease identifiers', () => {
    // Numeric identifiers have lower precedence
    expect(compareVersions('1.11.4-1', '1.11.4-alpha')).toBe(-1);
    expect(compareVersions('1.11.4-alpha', '1.11.4-1')).toBe(1);
  });
});

describe('satisfiesMinVersion', () => {
  it('should return true when version meets minimum', () => {
    expect(satisfiesMinVersion('1.11.4', '1.11.4')).toBe(true);
    expect(satisfiesMinVersion('1.11.5', '1.11.4')).toBe(true);
    expect(satisfiesMinVersion('1.12.0', '1.11.4')).toBe(true);
  });

  it('should return false when version is below minimum', () => {
    expect(satisfiesMinVersion('1.11.3', '1.11.4')).toBe(false);
    expect(satisfiesMinVersion('1.10.0', '1.11.4')).toBe(false);
    expect(satisfiesMinVersion('0.15.0', '1.0.0')).toBe(false);
  });
});

describe('isPluginCompatible', () => {
  it('should return true for plugins requiring <= baseline', () => {
    expect(isPluginCompatible('1.11.4')).toBe(true);
    expect(isPluginCompatible('1.11.3')).toBe(true);
    expect(isPluginCompatible('1.0.0')).toBe(true);
    expect(isPluginCompatible('0.15.0')).toBe(true);
  });

  it('should return false for plugins requiring > baseline', () => {
    expect(isPluginCompatible('1.11.5')).toBe(false);
    expect(isPluginCompatible('1.12.0')).toBe(false);
    expect(isPluginCompatible('2.0.0')).toBe(false);
  });

  it('should work with the pinned baseline', () => {
    expect(OBSIDIAN_COMPAT_VERSION).toBe('1.11.4');
  });
});
