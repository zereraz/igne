import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Download, Check, Search, Moon, Sun, Loader2 } from 'lucide-react';

interface CommunityTheme {
  name: string;
  author: string;
  repo: string;
  screenshot: string;
  modes: ('dark' | 'light')[];
  legacy?: boolean;
}

interface ThemeBrowserProps {
  vaultPath: string | null;
  currentTheme: string;
  onThemeInstalled: (themeName: string) => void;
}

export function ThemeBrowser({ vaultPath, currentTheme, onThemeInstalled }: ThemeBrowserProps) {
  const [themes, setThemes] = useState<CommunityTheme[]>([]);
  const [filteredThemes, setFilteredThemes] = useState<CommunityTheme[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [modeFilter, setModeFilter] = useState<'all' | 'dark' | 'light'>('all');
  const [installingTheme, setInstallingTheme] = useState<string | null>(null);
  const [installedThemes, setInstalledThemes] = useState<Set<string>>(new Set());
  const [installError, setInstallError] = useState<string | null>(null);

  // Fetch community themes list
  useEffect(() => {
    async function fetchThemes() {
      try {
        const response = await fetch(
          'https://raw.githubusercontent.com/obsidianmd/obsidian-releases/master/community-css-themes.json'
        );
        if (!response.ok) throw new Error('Failed to fetch themes');
        const data: CommunityTheme[] = await response.json();
        // Filter out legacy themes
        const activeThemes = data.filter(t => !t.legacy);
        setThemes(activeThemes);
        setFilteredThemes(activeThemes);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load themes');
      } finally {
        setLoading(false);
      }
    }

    fetchThemes();
  }, []);

  // Check which themes are already installed
  useEffect(() => {
    async function checkInstalled() {
      if (!vaultPath) return;

      try {
        const themesPath = `${vaultPath}/.obsidian/themes`;
        const entries = await invoke<Array<{ name: string; is_dir: boolean }>>('read_directory', {
          path: themesPath,
        });
        const installed = new Set(entries.filter(e => e.is_dir).map(e => e.name));
        setInstalledThemes(installed);
      } catch {
        // No themes folder yet
      }
    }

    checkInstalled();
  }, [vaultPath]);

  // Filter themes based on search and mode
  useEffect(() => {
    let filtered = themes;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        t => t.name.toLowerCase().includes(query) || t.author.toLowerCase().includes(query)
      );
    }

    if (modeFilter !== 'all') {
      filtered = filtered.filter(t => t.modes.includes(modeFilter));
    }

    setFilteredThemes(filtered);
  }, [themes, searchQuery, modeFilter]);

  const installTheme = async (theme: CommunityTheme) => {
    if (!vaultPath) return;

    setInstallingTheme(theme.name);
    setInstallError(null);

    try {
      // Try multiple branch names
      const branches = ['HEAD', 'main', 'master'];
      let css: string | null = null;

      for (const branch of branches) {
        const cssUrl = `https://raw.githubusercontent.com/${theme.repo}/${branch}/theme.css`;
        try {
          const response = await fetch(cssUrl);
          if (response.ok) {
            css = await response.text();
            break;
          }
        } catch {
          continue;
        }
      }

      if (!css) {
        throw new Error(`Could not download ${theme.name}`);
      }

      // Create themes directory if needed
      const themesPath = `${vaultPath}/.obsidian/themes`;
      try {
        await invoke('create_directory', { path: themesPath });
      } catch {
        // Directory might already exist
      }

      // Create theme folder and save CSS
      const themePath = `${themesPath}/${theme.name}`;
      await invoke('create_directory', { path: themePath });
      await invoke('write_file', {
        path: `${themePath}/theme.css`,
        content: css
      });

      // Also save manifest.json for metadata
      const manifest = {
        name: theme.name,
        author: theme.author,
        version: '1.0.0',
      };
      await invoke('write_file', {
        path: `${themePath}/manifest.json`,
        content: JSON.stringify(manifest, null, 2),
      });

      // Update installed themes set
      setInstalledThemes(prev => new Set([...prev, theme.name]));

      // Notify parent
      onThemeInstalled(theme.name);
    } catch (e) {
      console.error('Failed to install theme:', e);
      setInstallError(e instanceof Error ? e.message : 'Failed to install theme');
      // Clear error after 5 seconds
      setTimeout(() => setInstallError(null), 5000);
    } finally {
      setInstallingTheme(null);
    }
  };

  const getScreenshotUrl = (theme: CommunityTheme) => {
    return `https://raw.githubusercontent.com/${theme.repo}/HEAD/${theme.screenshot}`;
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px',
        color: 'var(--text-muted)',
      }}>
        <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} />
        <span style={{ marginLeft: '12px', fontFamily: 'var(--font-interface)' }}>Loading themes...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        padding: '24px',
        color: 'var(--color-red)',
        fontFamily: 'var(--font-interface)',
        textAlign: 'center',
        minHeight: '200px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
      }}>
        <div>{error}</div>
        <button
          onClick={() => {
            setError(null);
            setLoading(true);
            fetch('https://raw.githubusercontent.com/obsidianmd/obsidian-releases/master/community-css-themes.json')
              .then(res => res.json())
              .then((data: CommunityTheme[]) => {
                const activeThemes = data.filter(t => !t.legacy);
                setThemes(activeThemes);
                setFilteredThemes(activeThemes);
              })
              .catch(e => setError(e instanceof Error ? e.message : 'Failed to load themes'))
              .finally(() => setLoading(false));
          }}
          style={{
            padding: '8px 16px',
            fontSize: '12px',
            fontFamily: 'var(--font-interface)',
            backgroundColor: 'var(--background-secondary)',
            color: 'var(--text-muted)',
            border: '1px solid var(--background-modifier-border)',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Search and Filter Bar */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 12px',
          backgroundColor: 'var(--background-secondary)',
          border: '1px solid var(--background-modifier-border)',
          borderRadius: '4px',
        }}>
          <Search size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          <input
            type="text"
            placeholder="Search themes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              flex: 1,
              border: 'none',
              background: 'transparent',
              color: 'var(--text-normal)',
              fontSize: '13px',
              fontFamily: 'var(--font-interface)',
            }}
          />
        </div>

        {/* Mode Filter */}
        <div style={{ display: 'flex', gap: '4px' }}>
          {(['all', 'dark', 'light'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setModeFilter(mode)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '6px 12px',
                fontSize: '12px',
                fontFamily: 'var(--font-interface)',
                backgroundColor: modeFilter === mode ? 'var(--color-accent)' : 'var(--background-secondary)',
                color: modeFilter === mode ? 'var(--text-on-accent)' : 'var(--text-muted)',
                border: '1px solid var(--background-modifier-border)',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              {mode === 'dark' && <Moon size={12} />}
              {mode === 'light' && <Sun size={12} />}
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Results count */}
      <div style={{
        fontSize: '12px',
        color: 'var(--text-muted)',
        fontFamily: 'var(--font-interface)',
      }}>
        {filteredThemes.length} themes found
      </div>

      {/* Install error banner */}
      {installError && (
        <div style={{
          padding: '8px 12px',
          backgroundColor: 'var(--background-modifier-error)',
          border: '1px solid var(--color-red)',
          borderRadius: '4px',
          color: 'var(--color-red)',
          fontSize: '12px',
          fontFamily: 'var(--font-interface)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span>{installError}</span>
          <button
            onClick={() => setInstallError(null)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-red)',
              cursor: 'pointer',
              padding: '0 4px',
              fontSize: '16px',
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* Theme Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '16px',
        maxHeight: '400px',
        overflowY: 'auto',
        padding: '4px',
      }}>
        {filteredThemes.map((theme) => {
          const isInstalled = installedThemes.has(theme.name);
          const isInstalling = installingTheme === theme.name;
          const isActive = currentTheme === theme.name;

          return (
            <div
              key={theme.repo}
              style={{
                backgroundColor: 'var(--background-secondary)',
                border: isActive ? '2px solid var(--color-accent)' : '1px solid var(--background-modifier-border)',
                borderRadius: '8px',
                overflow: 'hidden',
                transition: 'border-color 100ms ease',
              }}
            >
              {/* Screenshot */}
              <div style={{
                height: '140px',
                backgroundColor: 'var(--background-primary)',
                backgroundImage: `url(${getScreenshotUrl(theme)})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center top',
              }} />

              {/* Info */}
              <div style={{ padding: '12px' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '4px',
                }}>
                  <h4 style={{
                    margin: 0,
                    fontSize: '14px',
                    fontWeight: 600,
                    color: 'var(--text-normal)',
                    fontFamily: 'var(--font-interface)',
                  }}>
                    {theme.name}
                  </h4>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {theme.modes.includes('dark') && (
                      <Moon size={12} style={{ color: 'var(--text-faint)' }} />
                    )}
                    {theme.modes.includes('light') && (
                      <Sun size={12} style={{ color: 'var(--text-faint)' }} />
                    )}
                  </div>
                </div>
                <div style={{
                  fontSize: '12px',
                  color: 'var(--text-muted)',
                  fontFamily: 'var(--font-interface)',
                  marginBottom: '12px',
                }}>
                  by {theme.author}
                </div>

                {/* Install/Use Button */}
                <button
                  onClick={() => {
                    if (isInstalling) return;
                    if (isInstalled) {
                      // Apply the installed theme
                      onThemeInstalled(theme.name);
                    } else {
                      installTheme(theme);
                    }
                  }}
                  disabled={isInstalling || isActive}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '8px',
                    fontSize: '12px',
                    fontFamily: 'var(--font-interface)',
                    fontWeight: 500,
                    backgroundColor: isActive ? 'var(--background-tertiary)' : isInstalled ? 'var(--color-accent)' : 'var(--background-secondary)',
                    color: isActive ? 'var(--text-muted)' : isInstalled ? 'var(--text-on-accent)' : 'var(--text-normal)',
                    border: isActive ? 'none' : '1px solid var(--background-modifier-border)',
                    borderRadius: '4px',
                    cursor: isActive ? 'default' : 'pointer',
                    opacity: isInstalling ? 0.7 : 1,
                  }}
                >
                  {isInstalling ? (
                    <>
                      <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                      Installing...
                    </>
                  ) : isActive ? (
                    <>
                      <Check size={14} />
                      Active
                    </>
                  ) : isInstalled ? (
                    <>
                      <Check size={14} />
                      Use Theme
                    </>
                  ) : (
                    <>
                      <Download size={14} />
                      Install
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* CSS for spinner animation */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
