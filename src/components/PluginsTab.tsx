import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Puzzle, Power, Settings as SettingsIcon, Check, AlertCircle, AlertTriangle, Shield, Info } from 'lucide-react';
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

            // Check compatibility with pinned baseline
            let compatibilityError: string | undefined;
            if (!isPluginCompatible(manifest.minAppVersion)) {
              compatibilityError = `Plugin requires Obsidian ${manifest.minAppVersion} or later. Igne currently supports Obsidian API ${OBSIDIAN_COMPAT_VERSION} (pinned baseline).`;
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

  const fontFamily = '"IBM Plex Mono", monospace';

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
          <Puzzle size={16} style={{ color: '#a78bfa', flexShrink: 0 }} />
          <label
            style={{
              fontSize: '11px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: '#a1a1aa',
              fontFamily,
            }}
          >
            Installed Plugins
          </label>
        </div>
        <p
          style={{
            fontSize: '12px',
            color: '#71717a',
            margin: 0,
            fontFamily,
            lineHeight: 1.5,
          }}
        >
          Manage your Obsidian community plugins. Place plugins in{' '}
          <code
            style={{
              backgroundColor: '#27272a',
              padding: '2px 6px',
              borderRadius: '2px',
              fontSize: '11px',
            }}
          >
            .obsidian/plugins/
          </code>
        </p>
      </div>

      {/* Status message */}
      {statusMessage && (
        <div
          style={{
            padding: '10px 12px',
            backgroundColor: status === 'error' ? '#450a0a' : '#27272a',
            border: `1px solid ${status === 'error' ? '#dc2626' : '#3f3f46'}`,
            borderRadius: '2px',
            fontSize: '12px',
            color: status === 'error' ? '#fca5a5' : '#a1a1aa',
            fontFamily,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          {status === 'error' ? (
            <AlertCircle size={14} style={{ flexShrink: 0 }} />
          ) : (
            <Check size={14} style={{ flexShrink: 0, color: '#22c55e' }} />
          )}
          {statusMessage}
        </div>
      )}

      {/* Loading state */}
      {status === 'loading' && (
        <div
          style={{
            fontSize: '12px',
            color: '#71717a',
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
            backgroundColor: '#27272a',
            border: '1px dashed #3f3f46',
            borderRadius: '4px',
            textAlign: 'center',
          }}
        >
          <Puzzle size={32} style={{ color: '#3f3f46', marginBottom: '12px' }} />
          <p
            style={{
              fontSize: '13px',
              color: '#71717a',
              margin: '0 0 8px 0',
              fontFamily,
            }}
          >
            No plugins installed
          </p>
          <p
            style={{
              fontSize: '11px',
              color: '#52525b',
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
                backgroundColor: '#27272a',
                border: plugin.error
                  ? '1px solid #dc2626'
                  : plugin.isEnabled
                    ? '1px solid #7c3aed'
                    : '1px solid #3f3f46',
                borderRadius: '4px',
                transition: 'border-color 100ms ease',
              }}
              onMouseEnter={(e) => {
                if (!plugin.error && !plugin.isEnabled) {
                  e.currentTarget.style.borderColor = '#52525b';
                }
              }}
              onMouseLeave={(e) => {
                if (!plugin.error && !plugin.isEnabled) {
                  e.currentTarget.style.borderColor = '#3f3f46';
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
                        color: plugin.error ? '#fca5a5' : '#e4e4e7',
                        margin: 0,
                        fontFamily,
                      }}
                    >
                      {plugin.manifest.name}
                    </h3>
                    <span
                      style={{
                        fontSize: '10px',
                        color: '#71717a',
                        backgroundColor: '#18181b',
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
                          color: '#a78bfa',
                          backgroundColor: '#27272a',
                          padding: '2px 6px',
                          borderRadius: '2px',
                          border: '1px solid #3f3f46',
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
                      color: '#71717a',
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
                      color: '#52525b',
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
                            color: '#a78bfa',
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
                    backgroundColor: plugin.isEnabled ? '#7c3aed' : '#18181b',
                    border: plugin.isEnabled ? '1px solid #7c3aed' : '1px solid #3f3f46',
                    borderRadius: '2px',
                    cursor: plugin.error || (plugin.tierInfo?.blockedReasons.length ?? 0) > 0 ? 'not-allowed' : 'pointer',
                    color: plugin.isEnabled ? 'white' : '#a1a1aa',
                    opacity: plugin.error || (plugin.tierInfo?.blockedReasons.length ?? 0) > 0 ? 0.5 : 1,
                    transition: 'all 100ms ease',
                    flexShrink: 0,
                  }}
                  onMouseEnter={(e) => {
                    if (!plugin.error && !(plugin.tierInfo?.blockedReasons.length ?? 0) && !plugin.isEnabled) {
                      e.currentTarget.style.backgroundColor = '#27272a';
                      e.currentTarget.style.borderColor = '#52525b';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!plugin.error && !(plugin.tierInfo?.blockedReasons.length ?? 0) && !plugin.isEnabled) {
                      e.currentTarget.style.backgroundColor = '#18181b';
                      e.currentTarget.style.borderColor = '#3f3f46';
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
                    borderTop: '1px solid #3f3f46',
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
                        backgroundColor: '#450a0a',
                        border: '1px solid #dc2626',
                        borderRadius: '2px',
                        marginBottom: plugin.tierInfo.permissions.length > 0 ? '8px' : 0,
                      }}
                    >
                      <AlertTriangle size={14} style={{ color: '#fca5a5', flexShrink: 0, marginTop: '2px' }} />
                      <div>
                        <p
                          style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            color: '#fca5a5',
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
                              color: '#fca5a5',
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
                        backgroundColor: '#451a03',
                        border: '1px solid #f59e0b',
                        borderRadius: '2px',
                      }}
                    >
                      <Info size={14} style={{ color: '#fcd34d', flexShrink: 0, marginTop: '2px' }} />
                      <div>
                        <p
                          style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            color: '#fcd34d',
                            margin: '0 0 4px 0',
                            fontFamily,
                          }}
                        >
                          This plugin requires permissions
                        </p>
                        <p
                          style={{
                            fontSize: '10px',
                            color: '#fcd34d',
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
                              color: '#fcd34d',
                              backgroundColor: '#27272a',
                              padding: '2px 6px',
                              borderRadius: '2px',
                              border: '1px solid #3f3f46',
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

              {/* Settings button (for plugins with settings) */}
              {plugin.isEnabled && plugin.hasSettings && (
                <div
                  style={{
                    paddingTop: '8px',
                    borderTop: '1px solid #3f3f46',
                    marginTop: '8px',
                  }}
                >
                  <button
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 10px',
                      fontSize: '11px',
                      fontWeight: 500,
                      fontFamily,
                      backgroundColor: 'transparent',
                      border: '1px solid #3f3f46',
                      borderRadius: '2px',
                      cursor: 'pointer',
                      color: '#a1a1aa',
                      transition: 'all 100ms ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#27272a';
                      e.currentTarget.style.borderColor = '#52525b';
                      e.currentTarget.style.color = '#e4e4e7';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.borderColor = '#3f3f46';
                      e.currentTarget.style.color = '#a1a1aa';
                    }}
                  >
                    <SettingsIcon size={12} />
                    Plugin Settings
                  </button>
                  <p
                    style={{
                      fontSize: '10px',
                      color: '#52525b',
                      margin: '4px 0 0 0',
                      fontFamily,
                    }}
                  >
                    Plugin configuration not yet supported in Igne
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
