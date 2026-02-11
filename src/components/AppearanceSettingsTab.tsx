import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Sun, Moon, Palette, Type, Download, ChevronDown, ChevronUp } from 'lucide-react';
import type { AppearanceSettings } from '../types';
import { ThemeBrowser } from './ThemeBrowser';

interface AppearanceSettingsTabProps {
  settings: AppearanceSettings;
  onChange: (settings: Partial<AppearanceSettings>) => void;
  vaultPath: string | null;
}

// Shared styles using CSS variables
const labelStyle = {
  fontSize: '11px',
  fontWeight: 600,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
  color: 'var(--text-muted)',
  fontFamily: 'var(--font-interface)',
};

const inputStyle = {
  width: '100%',
  padding: '8px 12px',
  fontSize: '13px',
  fontFamily: 'var(--font-interface)',
  backgroundColor: 'var(--background-secondary)',
  border: '1px solid var(--background-modifier-border)',
  borderRadius: '2px',
  color: 'var(--text-normal)',
  cursor: 'pointer',
};

export function AppearanceSettingsTab({ settings, onChange, vaultPath }: AppearanceSettingsTabProps) {
  const [availableThemes, setAvailableThemes] = useState<string[]>([]);
  const [availableSnippets, setAvailableSnippets] = useState<string[]>([]);
  const [loadingThemes, setLoadingThemes] = useState(true);
  const [showThemeBrowser, setShowThemeBrowser] = useState(false);

  // Load available themes and snippets
  useEffect(() => {
    async function loadResources() {
      if (!vaultPath) return;

      try {
        // Load themes
        try {
          const themesPath = `${vaultPath}/.obsidian/themes`;
          const entries = await invoke<Array<{ name: string; is_dir: boolean }>>('read_directory', {
            path: themesPath,
          });
          const themes = entries.filter((e) => e.is_dir).map((e) => e.name);
          setAvailableThemes(themes);
        } catch (e) {
          console.log('[AppearanceSettingsTab] No themes folder');
        }

        // Load snippets
        try {
          const snippetsPath = `${vaultPath}/.obsidian/snippets`;
          const entries = await invoke<Array<{ name: string; is_dir: boolean }>>('read_directory', {
            path: snippetsPath,
          });
          const snippets = entries
            .filter((e) => !e.is_dir && e.name.endsWith('.css'))
            .map((e) => e.name.replace('.css', ''));
          setAvailableSnippets(snippets);
        } catch (e) {
          console.log('[AppearanceSettingsTab] No snippets folder');
        }
      } catch (e) {
        console.error('[AppearanceSettingsTab] Failed to load resources:', e);
      } finally {
        setLoadingThemes(false);
      }
    }

    loadResources();
  }, [vaultPath]);

  const handleUpdate = (updates: Partial<AppearanceSettings>) => {
    onChange(updates);
  };

  const handleAccentColorChange = (color: string) => {
    handleUpdate({ accentColor: color });
    document.documentElement.style.setProperty('--color-accent', color);
  };

  const handleFontSizeChange = (size: number) => {
    handleUpdate({ baseFontSize: size });
    document.documentElement.style.setProperty('--font-text-size', `${size}px`);
  };

  const handleFontChange = (
    type: 'interfaceFontFamily' | 'textFontFamily' | 'monospaceFontFamily',
    value: string
  ) => {
    handleUpdate({ [type]: value });

    const cssVar =
      type === 'interfaceFontFamily'
        ? '--font-interface-theme'
        : type === 'textFontFamily'
        ? '--font-text-theme'
        : '--font-monospace-theme';

    if (value) {
      document.documentElement.style.setProperty(cssVar, value);
    } else {
      document.documentElement.style.removeProperty(cssVar);
    }
  };

  const handleThemeSelect = (theme: string) => {
    onChange({ cssTheme: theme });
  };

  const handleSnippetToggle = (snippet: string, enabled: boolean) => {
    const currentSnippets = settings.enabledCssSnippets || [];
    const updatedSnippets = enabled
      ? [...currentSnippets, snippet]
      : currentSnippets.filter((s) => s !== snippet);

    onChange({ enabledCssSnippets: updatedSnippets });
  };

  const handleThemeInstalled = async (themeName: string) => {
    // Add the newly installed theme to the list
    if (!availableThemes.includes(themeName)) {
      setAvailableThemes((prev) => [...prev, themeName].sort());
    }
    // Optionally auto-select the installed theme
    onChange({ cssTheme: themeName });
  };

  const reloadThemes = async () => {
    if (!vaultPath) return;
    try {
      const themesPath = `${vaultPath}/.obsidian/themes`;
      const entries = await invoke<Array<{ name: string; is_dir: boolean }>>('read_directory', {
        path: themesPath,
      });
      const themes = entries.filter((e) => e.is_dir).map((e) => e.name);
      setAvailableThemes(themes);
    } catch {
      // No themes folder
    }
  };

  const fontOptions = [
    '',
    'Inter',
    'system-ui',
    '-apple-system',
    'BlinkMacSystemFont',
    'Segoe UI',
    'Roboto',
    'Helvetica Neue',
    'Arial',
    'sans-serif',
  ];

  const monospaceFontOptions = [
    '',
    "'IBM Plex Mono'",
    "'SF Mono'",
    "'Fira Code'",
    "'JetBrains Mono'",
    "'Source Code Pro'",
    "'Courier New'",
    'monospace',
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Theme Mode */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <Palette size={16} style={{ color: 'var(--color-accent)', flexShrink: 0 }} />
          <label style={labelStyle}>Base Theme</label>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => {
              handleUpdate({ baseTheme: 'dark' });
              document.body.classList.remove('theme-dark', 'theme-light');
              document.body.classList.add('theme-dark');
            }}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '10px 16px',
              fontSize: '13px',
              fontWeight: 500,
              fontFamily: 'var(--font-interface)',
              backgroundColor: settings.baseTheme === 'dark' ? 'var(--color-accent)' : 'var(--background-secondary)',
              border: settings.baseTheme === 'dark' ? '1px solid var(--color-accent)' : '1px solid var(--background-modifier-border)',
              borderRadius: '2px',
              cursor: 'pointer',
              color: settings.baseTheme === 'dark' ? 'var(--text-on-accent)' : 'var(--text-muted)',
              transition: 'all 100ms ease',
            }}
            onMouseEnter={(e) => {
              if (settings.baseTheme !== 'dark') {
                e.currentTarget.style.backgroundColor = 'var(--background-tertiary)';
                e.currentTarget.style.borderColor = 'var(--background-modifier-border-hover)';
              }
            }}
            onMouseLeave={(e) => {
              if (settings.baseTheme !== 'dark') {
                e.currentTarget.style.backgroundColor = 'var(--background-secondary)';
                e.currentTarget.style.borderColor = 'var(--background-modifier-border)';
              }
            }}
          >
            <Moon size={14} />
            Dark
          </button>
          <button
            onClick={() => {
              handleUpdate({ baseTheme: 'light' });
              document.body.classList.remove('theme-dark', 'theme-light');
              document.body.classList.add('theme-light');
            }}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '10px 16px',
              fontSize: '13px',
              fontWeight: 500,
              fontFamily: 'var(--font-interface)',
              backgroundColor: settings.baseTheme === 'light' ? 'var(--color-accent)' : 'var(--background-secondary)',
              border: settings.baseTheme === 'light' ? '1px solid var(--color-accent)' : '1px solid var(--background-modifier-border)',
              borderRadius: '2px',
              cursor: 'pointer',
              color: settings.baseTheme === 'light' ? 'var(--text-on-accent)' : 'var(--text-muted)',
              transition: 'all 100ms ease',
            }}
            onMouseEnter={(e) => {
              if (settings.baseTheme !== 'light') {
                e.currentTarget.style.backgroundColor = 'var(--background-tertiary)';
                e.currentTarget.style.borderColor = 'var(--background-modifier-border-hover)';
              }
            }}
            onMouseLeave={(e) => {
              if (settings.baseTheme !== 'light') {
                e.currentTarget.style.backgroundColor = 'var(--background-secondary)';
                e.currentTarget.style.borderColor = 'var(--background-modifier-border)';
              }
            }}
          >
            <Sun size={14} />
            Light
          </button>
        </div>
      </div>

      {/* Accent Color */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <Palette size={16} style={{ color: 'var(--color-accent)', flexShrink: 0 }} />
          <label style={labelStyle}>Accent Color</label>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <input
            type="color"
            value={settings.accentColor || '#7c3aed'}
            onChange={(e) => handleAccentColorChange(e.target.value)}
            style={{
              width: '48px',
              height: '36px',
              border: '1px solid var(--background-modifier-border)',
              borderRadius: '2px',
              cursor: 'pointer',
              backgroundColor: 'transparent',
            }}
          />
          <input
            type="text"
            value={settings.accentColor || '#7c3aed'}
            onChange={(e) => {
              const color = e.target.value;
              if (/^#[0-9A-Fa-f]{6}$/.test(color)) {
                handleAccentColorChange(color);
              }
            }}
            style={{ ...inputStyle, flex: 1, cursor: 'text' }}
            placeholder="#7c3aed"
          />
        </div>
      </div>

      {/* Base Font Size */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Type size={16} style={{ color: 'var(--color-accent)', flexShrink: 0 }} />
            <label style={labelStyle}>Base Font Size</label>
          </div>
          <span style={{ fontSize: '12px', color: 'var(--color-accent)', fontFamily: 'var(--font-interface)' }}>
            {settings.baseFontSize || 16}px
          </span>
        </div>
        <input
          type="range"
          min="12"
          max="24"
          value={settings.baseFontSize || 16}
          onChange={(e) => handleFontSizeChange(parseInt(e.target.value, 10))}
          style={{
            width: '100%',
            height: '4px',
            borderRadius: '2px',
            background: 'var(--background-modifier-border)',
            WebkitAppearance: 'none',
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '11px', color: 'var(--text-faint)', fontFamily: 'var(--font-interface)' }}>
          <span>12px</span>
          <span>18px</span>
          <span>24px</span>
        </div>
      </div>

      {/* Interface Font */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <Type size={16} style={{ color: 'var(--color-accent)', flexShrink: 0 }} />
          <label style={labelStyle}>Interface Font</label>
        </div>
        <select
          value={settings.interfaceFontFamily || ''}
          onChange={(e) => handleFontChange('interfaceFontFamily', e.target.value)}
          style={inputStyle}
        >
          <option value="">Default</option>
          {fontOptions.map((font) => (
            <option key={font} value={font}>{font || 'Default'}</option>
          ))}
        </select>
      </div>

      {/* Text Font */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <Type size={16} style={{ color: 'var(--color-accent)', flexShrink: 0 }} />
          <label style={labelStyle}>Text Font</label>
        </div>
        <select
          value={settings.textFontFamily || ''}
          onChange={(e) => handleFontChange('textFontFamily', e.target.value)}
          style={inputStyle}
        >
          <option value="">Default</option>
          {fontOptions.map((font) => (
            <option key={font} value={font}>{font || 'Default'}</option>
          ))}
        </select>
      </div>

      {/* Monospace Font */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <Type size={16} style={{ color: 'var(--color-accent)', flexShrink: 0 }} />
          <label style={labelStyle}>Monospace Font</label>
        </div>
        <select
          value={settings.monospaceFontFamily || ''}
          onChange={(e) => handleFontChange('monospaceFontFamily', e.target.value)}
          style={inputStyle}
        >
          <option value="">Default</option>
          {monospaceFontOptions.map((font) => (
            <option key={font} value={font}>{font || 'Default'}</option>
          ))}
        </select>
      </div>

      {/* Community Themes */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <Palette size={16} style={{ color: 'var(--color-accent)', flexShrink: 0 }} />
          <label style={labelStyle}>Community Theme</label>
        </div>
        {loadingThemes ? (
          <div style={{ fontSize: '12px', color: 'var(--text-faint)', fontFamily: 'var(--font-interface)' }}>
            Loading themes...
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <select
                value={settings.cssTheme || ''}
                onChange={(e) => handleThemeSelect(e.target.value)}
                style={{
                  flex: 1,
                  minWidth: 0,
                  padding: '8px 12px',
                  fontSize: '13px',
                  fontFamily: 'var(--font-interface)',
                  backgroundColor: 'var(--background-secondary)',
                  border: '1px solid var(--background-modifier-border)',
                  borderRadius: '2px',
                  color: 'var(--text-normal)',
                  cursor: 'pointer',
                }}
              >
                <option value="">Built-in (Default)</option>
                {availableThemes.map((theme) => (
                  <option key={theme} value={theme}>{theme}</option>
                ))}
              </select>
              <button
                onClick={() => setShowThemeBrowser(!showThemeBrowser)}
                style={{
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 12px',
                  fontSize: '12px',
                  fontFamily: 'var(--font-interface)',
                  fontWeight: 500,
                  backgroundColor: showThemeBrowser ? 'var(--color-accent)' : 'var(--background-secondary)',
                  color: showThemeBrowser ? 'var(--text-on-accent)' : 'var(--text-muted)',
                  border: '1px solid var(--background-modifier-border)',
                  borderRadius: '2px',
                  cursor: 'pointer',
                  transition: 'all 100ms ease',
                }}
                onMouseEnter={(e) => {
                  if (!showThemeBrowser) {
                    e.currentTarget.style.backgroundColor = 'var(--background-tertiary)';
                    e.currentTarget.style.borderColor = 'var(--background-modifier-border-hover)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!showThemeBrowser) {
                    e.currentTarget.style.backgroundColor = 'var(--background-secondary)';
                    e.currentTarget.style.borderColor = 'var(--background-modifier-border)';
                  }
                }}
              >
                <Download size={14} />
                Browse
                {showThemeBrowser ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            </div>

            {/* Theme Browser */}
            {showThemeBrowser && (
              <div style={{
                backgroundColor: 'var(--background-primary)',
                border: '1px solid var(--background-modifier-border)',
                borderRadius: '4px',
                padding: '16px',
              }}>
                <ThemeBrowser
                  vaultPath={vaultPath}
                  currentTheme={settings.cssTheme || ''}
                  onThemeInstalled={handleThemeInstalled}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* CSS Snippets */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <Type size={16} style={{ color: 'var(--color-accent)', flexShrink: 0 }} />
          <label style={labelStyle}>CSS Snippets</label>
        </div>
        {availableSnippets.length === 0 ? (
          <div style={{
            fontSize: '12px',
            color: 'var(--text-faint)',
            fontFamily: 'var(--font-interface)',
            padding: '12px',
            backgroundColor: 'var(--background-secondary)',
            borderRadius: '2px',
            border: '1px dashed var(--background-modifier-border)',
          }}>
            No CSS snippets found. Place .css files in .obsidian/snippets/
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {availableSnippets.map((snippet) => (
              <label
                key={snippet}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px',
                  backgroundColor: 'var(--background-secondary)',
                  border: '1px solid var(--background-modifier-border)',
                  borderRadius: '2px',
                  cursor: 'pointer',
                  transition: 'border-color 100ms ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--background-modifier-border-hover)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--background-modifier-border)';
                }}
              >
                <input
                  type="checkbox"
                  checked={(settings.enabledCssSnippets || []).includes(snippet)}
                  onChange={(e) => handleSnippetToggle(snippet, e.target.checked)}
                  style={{ width: '16px', height: '16px', flexShrink: 0, cursor: 'pointer' }}
                />
                <span style={{ fontSize: '13px', color: 'var(--text-normal)', fontFamily: 'var(--font-interface)' }}>
                  {snippet}
                </span>
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
