import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Puzzle, Power, Check, AlertCircle, AlertTriangle, Shield, Info } from 'lucide-react';
import { isPluginCompatible, OBSIDIAN_COMPAT_VERSION, compareVersions } from '../utils/semver';
import { detectPluginTier, getTierName, getTierColor, getPermissionName, type PluginTier, type PluginTierInfo } from '../utils/plugin-tiers';

interface PluginManifest {
  id: string;
  name: string;
  version: string;
  minAppVersion: string;
  description: string;
  author: string;
  authorUrl: string;
  isDesktopOnly: boolean;
}

interface DiscoveredPlugin {
  id: string;
  manifest: PluginManifest;
  isEnabled: boolean;
  hasSettings: boolean;
  error?: string;
  compatibilityError?: string;
  tierInfo?: PluginTierInfo;
}

interface PluginsTabProps {
  vaultPath: string | null;
}

type PluginStatus = 'loading' | 'loaded' | 'error';

export function PluginsTab({ vaultPath }: PluginsTabProps) {
  const [plugins, setPlugins] = useState<DiscoveredPlugin[]>([]);
  const [enabledPlugins, setEnabledPlugins] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState<PluginStatus>('loading');
  const [statusMessage, setStatusMessage] = useState<string>('');

  // Load plugins when vault path changes
  useEffect(() => {
    async function loadPlugins() {
      if (!vaultPath) {
        setStatus('loaded');
        setPlugins([]);
        return;
      }

      setStatus('loading');
      setStatusMessage('Discovering plugins...');

      try {
        // First, load the list of enabled plugins
        const enabledList = await loadEnabledPlugins();
        setEnabledPlugins(new Set(enabledList));

        // Discover all plugins in the plugins directory
        const pluginsDir = `${vaultPath}/.obsidian/plugins`;
        const entries = await invoke<Array<{ name: string; is_dir: boolean }>>('read_directory', {
          path: pluginsDir,
        });

        const discovered: DiscoveredPlugin[] = [];

        for (const entry of entries) {
          if (!entry.is_dir) continue;

          const pluginId = entry.name;

          try {
            // Read manifest.json
            const manifestPath = `${pluginsDir}/${pluginId}/manifest.json`;
            const manifestContent = await invoke<string>('read_file', { path: manifestPath });
            const manifest: PluginManifest = JSON.parse(manifestContent);

            // Check compatibility with the supported baseline
            let compatibilityError: string | undefined;
            if (!isPluginCompatible(manifest.minAppVersion)) {
              compatibilityError = `Plugin requires Obsidian ${manifest.minAppVersion} or later. Igne currently supports Obsidian API ${OBSIDIAN_COMPAT_VERSION}.`;
            }

            // Check if plugin has settings (main.js exists)
            const mainJsPath = `${pluginsDir}/${pluginId}/main.js`;
            const meta = await invoke<{ exists: boolean }>('stat_path', { path: mainJsPath });
            const hasMainJs = meta.exists;

            // Detect plugin tier by analyzing main.js
            let tierInfo: PluginTierInfo | undefined;
            if (hasMainJs && !compatibilityError) {
              try {
                const mainJsContent = await invoke<string>('read_file', { path: mainJsPath });
                tierInfo = await detectPluginTier(mainJsContent);
              } catch (error) {
                console.warn(`[PluginsTab] Failed to analyze tier for ${pluginId}:`, error);
                tierInfo = {
                  tier: 0,
                  permissions: [],
                  blockedReasons: [],
                  isCompatible: true,
                };
              }
            }

            discovered.push({
              id: pluginId,
              manifest,
              isEnabled: enabledList.includes(pluginId),
              hasSettings: hasMainJs,
              compatibilityError,
              tierInfo,
            });
          } catch (error) {
            console.warn(`[PluginsTab] Failed to load plugin ${pluginId}:`, error);
            discovered.push({
              id: pluginId,
              manifest: {
                id: pluginId,
                name: pluginId,
                version: 'unknown',
                minAppVersion: '0.0.0',
                description: `Failed to load manifest: ${(error as Error).message}`,
                author: 'Unknown',
                authorUrl: '',
                isDesktopOnly: false,
              },
              isEnabled: false,
              hasSettings: false,
              error: (error as Error).message,
            });
          }
        }

        // Sort by name
        discovered.sort((a, b) => a.manifest.name.localeCompare(b.manifest.name));

        setPlugins(discovered);
        setStatus('loaded');
        setStatusMessage('');
      } catch (error) {
        console.error('[PluginsTab] Failed to discover plugins:', error);
        setStatus('error');
        setStatusMessage(`Failed to load plugins: ${(error as Error).message}`);
      }
    }

    loadPlugins();
  }, [vaultPath]);

  // Load enabled plugins from community-plugins.json
  async function loadEnabledPlugins(): Promise<string[]> {
    if (!vaultPath) return [];

    try {
      const pluginsJsonPath = `${vaultPath}/.obsidian/community-plugins.json`;
      const content = await invoke<string>('read_file', { path: pluginsJsonPath });
      const data = JSON.parse(content);
      return Array.isArray(data) ? data : [];
    } catch {
      // File doesn't exist or is invalid - return empty array
      return [];
    }
  }

  // Save enabled plugins to community-plugins.json
  async function saveEnabledPlugins(enabled: string[]): Promise<void> {
    if (!vaultPath) throw new Error('No vault path');

    const pluginsJsonPath = `${vaultPath}/.obsidian/community-plugins.json`;
    const content = JSON.stringify(enabled, null, 2);
    await invoke('write_file', { path: pluginsJsonPath, content });
  }

  // Toggle plugin enabled state
  async function togglePlugin(pluginId: string) {
    const newEnabled = new Set(enabledPlugins);

    if (newEnabled.has(pluginId)) {
      // Disable
      newEnabled.delete(pluginId);
    } else {
      // Enable
      newEnabled.add(pluginId);
    }

    setEnabledPlugins(newEnabled);

    // Update UI state immediately for responsiveness
    setPlugins((prev) =>
      prev.map((p) => (p.id === pluginId ? { ...p, isEnabled: newEnabled.has(pluginId) } : p))
    );

    // Save to file
    try {
      await saveEnabledPlugins(Array.from(newEnabled));
      setStatusMessage(`Plugin ${newEnabled.has(pluginId) ? 'enabled' : 'disabled'} successfully`);
      setTimeout(() => setStatusMessage(''), 2000);
    } catch (error) {
      console.error('[PluginsTab] Failed to save enabled plugins:', error);
      setStatusMessage(`Failed to save: ${(error as Error).message}`);
      setTimeout(() => setStatusMessage(''), 3000);
    }
  }

  const fontFamily = 'var(--font-monospace-theme, var(--font-monospace))';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
      }}
    >
      {/* Header */}
      <div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '8px',
          }}
        >
          <Puzzle size={16} style={{ color: 'var(--color-accent)', flexShrink: 0 }} />
          <label
            style={{
              fontSize: '11px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: 'var(--text-muted)',
              fontFamily,
            }}
          >
            Installed Plugins
          </label>
        </div>
        <p
          style={{
            fontSize: '12px',
            color: 'var(--text-faint)',
            margin: 0,
            fontFamily,
            lineHeight: 1.5,
          }}
        >
          View and toggle Obsidian community plugins. Igne does not run plugin code — toggling
          here updates{' '}
          <code
            style={{
              backgroundColor: 'var(--background-secondary)',
              padding: '2px 6px',
              borderRadius: '2px',
              fontSize: '11px',
            }}
          >
            community-plugins.json
          </code>{' '}
          so plugins stay enabled/disabled when you open this vault in Obsidian.
        </p>
      </div>

      {/* Status message */}
      {statusMessage && (
        <div
          style={{
            padding: '10px 12px',
            backgroundColor: status === 'error' ? 'rgba(var(--color-red-rgb, 220, 38, 38), 0.15)' : 'var(--background-secondary)',
            border: `1px solid ${status === 'error' ? 'var(--color-red)' : 'var(--background-modifier-border)'}`,
            borderRadius: '2px',
            fontSize: '12px',
            color: status === 'error' ? 'var(--color-red)' : 'var(--text-muted)',
            fontFamily,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          {status === 'error' ? (
            <AlertCircle size={14} style={{ flexShrink: 0 }} />
          ) : (
            <Check size={14} style={{ flexShrink: 0, color: 'var(--color-green)' }} />
          )}
          {statusMessage}
        </div>
      )}

      {/* Loading state */}
      {status === 'loading' && (
        <div
          style={{
            fontSize: '12px',
            color: 'var(--text-faint)',
            fontFamily,
            padding: '24px',
            textAlign: 'center',
          }}
        >
          Loading plugins...
        </div>
      )}

      {/* Empty state */}
      {status === 'loaded' && plugins.length === 0 && (
        <div
          style={{
            padding: '48px 24px',
            backgroundColor: 'var(--background-secondary)',
            border: '1px dashed var(--background-modifier-border)',
            borderRadius: '4px',
            textAlign: 'center',
          }}
        >
          <Puzzle size={32} style={{ color: 'var(--background-modifier-border)', marginBottom: '12px' }} />
          <p
            style={{
              fontSize: '13px',
              color: 'var(--text-faint)',
              margin: '0 0 8px 0',
              fontFamily,
            }}
          >
            No plugins installed
          </p>
          <p
            style={{
              fontSize: '11px',
              color: 'var(--interactive-normal)',
              margin: 0,
              fontFamily,
            }}
          >
            Place community plugins in .obsidian/plugins/ to manage them here
          </p>
        </div>
      )}

      {/* Plugin list */}
      {status === 'loaded' && plugins.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          {plugins.map((plugin) => (
            <div
              key={plugin.id}
              style={{
                padding: '16px',
                backgroundColor: 'var(--background-secondary)',
                border: plugin.error
                  ? '1px solid var(--color-red)'
                  : plugin.isEnabled
                    ? '1px solid var(--color-accent)'
                    : '1px solid var(--background-modifier-border)',
                borderRadius: '4px',
                transition: 'border-color 100ms ease',
              }}
              onMouseEnter={(e) => {
                if (!plugin.error && !plugin.isEnabled) {
                  e.currentTarget.style.borderColor = 'var(--interactive-normal)';
                }
              }}
              onMouseLeave={(e) => {
                if (!plugin.error && !plugin.isEnabled) {
                  e.currentTarget.style.borderColor = 'var(--background-modifier-border)';
                }
              }}
            >
              {/* Header row */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: '12px',
                  marginBottom: '8px',
                }}
              >
                {/* Plugin info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '4px',
                    }}
                  >
                    <h3
                      style={{
                        fontSize: '14px',
                        fontWeight: 600,
                        color: plugin.error ? 'var(--color-red)' : 'var(--text-normal)',
                        margin: 0,
                        fontFamily,
                      }}
                    >
                      {plugin.manifest.name}
                    </h3>
                    <span
                      style={{
                        fontSize: '10px',
                        color: 'var(--text-faint)',
                        backgroundColor: 'var(--background-primary)',
                        padding: '2px 6px',
                        borderRadius: '2px',
                        fontFamily,
                      }}
                    >
                      v{plugin.manifest.version}
                    </span>
                    {plugin.manifest.isDesktopOnly && (
                      <span
                        style={{
                          fontSize: '10px',
                          color: 'var(--color-accent)',
                          backgroundColor: 'var(--background-secondary)',
                          padding: '2px 6px',
                          borderRadius: '2px',
                          border: '1px solid var(--background-modifier-border)',
                          fontFamily,
                        }}
                      >
                        Desktop only
                      </span>
                    )}
                    {plugin.tierInfo && (
                      <span
                        style={{
                          fontSize: '10px',
                          color: getTierColor(plugin.tierInfo.tier).text,
                          backgroundColor: getTierColor(plugin.tierInfo.tier).bg,
                          padding: '2px 6px',
                          borderRadius: '2px',
                          border: `1px solid ${getTierColor(plugin.tierInfo.tier).border}`,
                          fontFamily,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <Shield size={10} />
                        {getTierName(plugin.tierInfo.tier)}
                      </span>
                    )}
                  </div>
                  <p
                    style={{
                      fontSize: '12px',
                      color: 'var(--text-faint)',
                      margin: '0 0 4px 0',
                      fontFamily,
                      lineHeight: 1.4,
                    }}
                  >
                    {plugin.manifest.description}
                  </p>
                  <p
                    style={{
                      fontSize: '11px',
                      color: 'var(--interactive-normal)',
                      margin: 0,
                      fontFamily,
                    }}
                  >
                    by {plugin.manifest.author}
                    {plugin.manifest.authorUrl && (
                      <>
                        {' '}
                        •{' '}
                        <a
                          href={plugin.manifest.authorUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            color: 'var(--color-accent)',
                            textDecoration: 'none',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.textDecoration = 'underline';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.textDecoration = 'none';
                          }}
                        >
                          Website
                        </a>
                      </>
                    )}
                  </p>
                </div>

                {/* Enable/disable toggle */}
                <button
                  onClick={() => !plugin.error && !plugin.tierInfo?.blockedReasons.length && togglePlugin(plugin.id)}
                  disabled={!!plugin.error || (plugin.tierInfo?.blockedReasons.length ?? 0) > 0}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '8px 12px',
                    fontSize: '12px',
                    fontWeight: 500,
                    fontFamily,
                    backgroundColor: plugin.isEnabled ? 'var(--color-accent)' : 'var(--background-primary)',
                    border: plugin.isEnabled ? '1px solid var(--color-accent)' : '1px solid var(--background-modifier-border)',
                    borderRadius: '2px',
                    cursor: plugin.error || (plugin.tierInfo?.blockedReasons.length ?? 0) > 0 ? 'not-allowed' : 'pointer',
                    color: plugin.isEnabled ? 'var(--text-on-accent)' : 'var(--text-muted)',
                    opacity: plugin.error || (plugin.tierInfo?.blockedReasons.length ?? 0) > 0 ? 0.5 : 1,
                    transition: 'all 100ms ease',
                    flexShrink: 0,
                  }}
                  onMouseEnter={(e) => {
                    if (!plugin.error && !(plugin.tierInfo?.blockedReasons.length ?? 0) && !plugin.isEnabled) {
                      e.currentTarget.style.backgroundColor = 'var(--background-secondary)';
                      e.currentTarget.style.borderColor = 'var(--interactive-normal)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!plugin.error && !(plugin.tierInfo?.blockedReasons.length ?? 0) && !plugin.isEnabled) {
                      e.currentTarget.style.backgroundColor = 'var(--background-primary)';
                      e.currentTarget.style.borderColor = 'var(--background-modifier-border)';
                    }
                  }}
                >
                  <Power size={12} />
                  {plugin.isEnabled ? 'Enabled' : 'Disabled'}
                </button>
              </div>

              {/* Tier details */}
              {plugin.tierInfo && (plugin.tierInfo.blockedReasons.length > 0 || plugin.tierInfo.permissions.length > 0) && (
                <div
                  style={{
                    paddingTop: '8px',
                    borderTop: '1px solid var(--background-modifier-border)',
                    marginTop: '8px',
                  }}
                >
                  {plugin.tierInfo.blockedReasons.length > 0 && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '8px',
                        padding: '8px',
                        backgroundColor: 'rgba(var(--color-red-rgb, 220, 38, 38), 0.15)',
                        border: '1px solid var(--color-red)',
                        borderRadius: '2px',
                        marginBottom: plugin.tierInfo.permissions.length > 0 ? '8px' : 0,
                      }}
                    >
                      <AlertTriangle size={14} style={{ color: 'var(--color-red)', flexShrink: 0, marginTop: '2px' }} />
                      <div>
                        <p
                          style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            color: 'var(--color-red)',
                            margin: '0 0 4px 0',
                            fontFamily,
                          }}
                        >
                          This plugin is blocked
                        </p>
                        {plugin.tierInfo.blockedReasons.map((reason, i) => (
                          <p
                            key={i}
                            style={{
                              fontSize: '10px',
                              color: 'var(--color-red)',
                              margin: i === 0 ? '0' : '4px 0 0 0',
                              fontFamily,
                              lineHeight: 1.4,
                            }}
                          >
                            • {reason}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}

                  {plugin.tierInfo.permissions.length > 0 && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '8px',
                        padding: '8px',
                        backgroundColor: 'rgba(var(--color-yellow-rgb, 245, 158, 11), 0.15)',
                        border: '1px solid var(--color-yellow)',
                        borderRadius: '2px',
                      }}
                    >
                      <Info size={14} style={{ color: 'var(--color-yellow)', flexShrink: 0, marginTop: '2px' }} />
                      <div>
                        <p
                          style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            color: 'var(--color-yellow)',
                            margin: '0 0 4px 0',
                            fontFamily,
                          }}
                        >
                          This plugin requires permissions
                        </p>
                        <p
                          style={{
                            fontSize: '10px',
                            color: 'var(--color-yellow)',
                            margin: '0 0 4px 0',
                            fontFamily,
                          }}
                        >
                          When enabled, this plugin will request access to:
                        </p>
                        {plugin.tierInfo.permissions.map((permission) => (
                          <span
                            key={permission}
                            style={{
                              display: 'inline-block',
                              fontSize: '10px',
                              color: 'var(--color-yellow)',
                              backgroundColor: 'var(--background-secondary)',
                              padding: '2px 6px',
                              borderRadius: '2px',
                              border: '1px solid var(--background-modifier-border)',
                              fontFamily,
                              marginRight: '4px',
                              marginBottom: '4px',
                            }}
                          >
                            {getPermissionName(permission)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

            </div>
          ))}
        </div>
      )}
    </div>
  );
}
