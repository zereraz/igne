// =============================================================================
// Plugin Version Resolver Tests
// =============================================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  resolveCompatibleVersion,
  PluginRelease,
  VersionResolution,
  clearVersionsJsonCache,
} from '../pluginVersionResolver';

describe('resolveCompatibleVersion', () => {
  it('should select latest version when compatible', () => {
    const latestRelease: PluginRelease = {
      version: '2.0.0',
      minAppVersion: '1.11.4',
      downloadUrl: 'https://example.com/plugin-2.0.0.zip',
    };

    const versionsJson = {
      '1.0.0': '0.15.0',
      '1.5.0': '1.0.0',
      '2.0.0': '1.11.4',
    };

    const result = resolveCompatibleVersion(latestRelease, versionsJson);

    expect(result.version).toBe('2.0.0');
    expect(result.minAppVersion).toBe('1.11.4');
    expect(result.reason).toContain('Latest version 2.0.0 is compatible');
  });

  it('should fallback to older version when latest is incompatible', () => {
    const latestRelease: PluginRelease = {
      version: '2.0.0',
      minAppVersion: '1.11.5',
      downloadUrl: 'https://example.com/plugin-2.0.0.zip',
    };

    const versionsJson = {
      '1.0.0': '0.15.0',
      '1.5.0': '1.0.0',
      '2.0.0': '1.11.5',
    };

    const result = resolveCompatibleVersion(latestRelease, versionsJson);

    expect(result.version).toBe('1.5.0');
    expect(result.minAppVersion).toBe('1.0.0');
    expect(result.reason).toContain('Installing compatible version 1.5.0 instead');
  });

  it('should return null when no compatible version exists', () => {
    const latestRelease: PluginRelease = {
      version: '2.0.0',
      minAppVersion: '1.12.0',
      downloadUrl: 'https://example.com/plugin-2.0.0.zip',
    };

    const versionsJson = {
      '2.0.0': '1.12.0',
      '1.9.0': '1.11.5',
    };

    const result = resolveCompatibleVersion(latestRelease, versionsJson);

    expect(result.version).toBeNull();
    expect(result.minAppVersion).toBe('1.12.0');
    expect(result.reason).toContain('No compatible version found');
  });

  it('should select newest compatible version when multiple exist', () => {
    const latestRelease: PluginRelease = {
      version: '3.0.0',
      minAppVersion: '1.12.0',
      downloadUrl: 'https://example.com/plugin-3.0.0.zip',
    };

    const versionsJson = {
      '1.0.0': '0.15.0',
      '1.5.0': '1.0.0',
      '2.0.0': '1.11.4',
      '2.5.0': '1.11.4',
      '3.0.0': '1.12.0',
    };

    const result = resolveCompatibleVersion(latestRelease, versionsJson);

    // Should select 2.5.0 as it's the newest compatible version
    expect(result.version).toBe('2.5.0');
    expect(result.minAppVersion).toBe('1.11.4');
  });

  it('should handle empty versions.json', () => {
    const latestRelease: PluginRelease = {
      version: '2.0.0',
      minAppVersion: '1.12.0',
      downloadUrl: 'https://example.com/plugin-2.0.0.zip',
    };

    const versionsJson = {};

    const result = resolveCompatibleVersion(latestRelease, versionsJson);

    expect(result.version).toBeNull();
    expect(result.reason).toContain('No compatible version found');
  });

  it('should handle versions with prerelease identifiers', () => {
    const latestRelease: PluginRelease = {
      version: '2.0.0-beta',
      minAppVersion: '1.11.5',
      downloadUrl: 'https://example.com/plugin-2.0.0-beta.zip',
    };

    const versionsJson = {
      '1.0.0': '0.15.0',
      '2.0.0-beta': '1.11.5',
    };

    const result = resolveCompatibleVersion(latestRelease, versionsJson);

    expect(result.version).toBe('1.0.0');
    expect(result.minAppVersion).toBe('0.15.0');
  });
});

describe('versions.json cache', () => {
  beforeEach(() => {
    clearVersionsJsonCache();
  });

  it('should clear cache', () => {
    // This is a basic test to ensure the cache clear function exists
    // More detailed cache testing would require mocking fetch
    expect(() => clearVersionsJsonCache()).not.toThrow();
  });
});
