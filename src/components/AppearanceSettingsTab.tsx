import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Sun, Moon, Palette, Type } from 'lucide-react';
import type { AppearanceSettings } from '../types';

interface AppearanceSettingsTabProps {
  settings: AppearanceSettings;
  onChange: (settings: Partial<AppearanceSettings>) => void;
  vaultPath: string | null;
}

export function AppearanceSettingsTab({ settings, onChange, vaultPath }: AppearanceSettingsTabProps) {
  const [availableThemes, setAvailableThemes] = useState<string[]>([]);
  const [availableSnippets, setAvailableSnippets] = useState<string[]>([]);
  const [loadingThemes, setLoadingThemes] = useState(true);

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
    // Apply immediately for live preview
    document.documentElement.style.setProperty('--color-accent', color);
  };

  const handleFontSizeChange = (size: number) => {
    handleUpdate({ baseFontSize: size });
    // Apply immediately for live preview
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

    // Apply immediately for live preview
    if (value) {
      document.documentElement.style.setProperty(cssVar, value);
    } else {
      document.documentElement.style.removeProperty(cssVar);
    }
  };

  const handleThemeSelect = (theme: string) => {
    // Trigger onChange to handle theme loading through ThemeManager in App.tsx
    onChange({ cssTheme: theme });
  };

  const handleSnippetToggle = (snippet: string, enabled: boolean) => {
    const currentSnippets = settings.enabledCssSnippets || [];
    const updatedSnippets = enabled
      ? [...currentSnippets, snippet]
      : currentSnippets.filter((s) => s !== snippet);

    // Trigger onChange to handle snippet loading through ThemeManager in App.tsx
    onChange({ enabledCssSnippets: updatedSnippets });
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
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
      }}
    >
      {/* Theme Mode */}
      <div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '12px',
          }}
        >
          <Palette size={16} style={{ color: '#a78bfa', flexShrink: 0 }} />
          <label
            style={{
              fontSize: '11px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: '#a1a1aa',
              fontFamily: "'IBM Plex Mono', monospace",
            }}
          >
            Base Theme
          </label>
        </div>
        <div
          style={{
            display: 'flex',
            gap: '8px',
          }}
        >
          <button
            onClick={() => {
              handleUpdate({ baseTheme: 'dark' });
              // Apply theme mode immediately for live preview
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
              fontFamily: "'IBM Plex Mono', monospace",
              backgroundColor: settings.baseTheme === 'dark' ? '#7c3aed' : '#27272a',
              border: settings.baseTheme === 'dark' ? '1px solid #7c3aed' : '1px solid #3f3f46',
              borderRadius: '2px',
              cursor: 'pointer',
              color: settings.baseTheme === 'dark' ? 'white' : '#a1a1aa',
              transition: 'all 100ms ease',
            }}
            onMouseEnter={(e) => {
              if (settings.baseTheme !== 'dark') {
                e.currentTarget.style.backgroundColor = '#3f3f46';
                e.currentTarget.style.borderColor = '#52525b';
              }
            }}
            onMouseLeave={(e) => {
              if (settings.baseTheme !== 'dark') {
                e.currentTarget.style.backgroundColor = '#27272a';
                e.currentTarget.style.borderColor = '#3f3f46';
              }
            }}
          >
            <Moon size={14} />
            Dark
          </button>
          <button
            onClick={() => {
              handleUpdate({ baseTheme: 'light' });
              // Apply theme mode immediately for live preview
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
              fontFamily: "'IBM Plex Mono', monospace",
              backgroundColor: settings.baseTheme === 'light' ? '#7c3aed' : '#27272a',
              border: settings.baseTheme === 'light' ? '1px solid #7c3aed' : '1px solid #3f3f46',
              borderRadius: '2px',
              cursor: 'pointer',
              color: settings.baseTheme === 'light' ? 'white' : '#a1a1aa',
              transition: 'all 100ms ease',
            }}
            onMouseEnter={(e) => {
              if (settings.baseTheme !== 'light') {
                e.currentTarget.style.backgroundColor = '#3f3f46';
                e.currentTarget.style.borderColor = '#52525b';
              }
            }}
            onMouseLeave={(e) => {
              if (settings.baseTheme !== 'light') {
                e.currentTarget.style.backgroundColor = '#27272a';
                e.currentTarget.style.borderColor = '#3f3f46';
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
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '12px',
          }}
        >
          <Palette size={16} style={{ color: '#a78bfa', flexShrink: 0 }} />
          <label
            style={{
              fontSize: '11px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: '#a1a1aa',
              fontFamily: "'IBM Plex Mono', monospace",
            }}
          >
            Accent Color
          </label>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <input
            type="color"
            value={settings.accentColor || '#7c3aed'}
            onChange={(e) => handleAccentColorChange(e.target.value)}
            style={{
              width: '48px',
              height: '36px',
              border: '1px solid #3f3f46',
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
            style={{
              flex: 1,
              padding: '8px 12px',
              fontSize: '13px',
              fontFamily: "'IBM Plex Mono', monospace",
              backgroundColor: '#27272a',
              border: '1px solid #3f3f46',
              borderRadius: '2px',
              color: '#e4e4e7',
              outline: 'none',
            }}
            placeholder="#7c3aed"
          />
        </div>
      </div>

      {/* Base Font Size */}
      <div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '12px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Type size={16} style={{ color: '#a78bfa', flexShrink: 0 }} />
            <label
              style={{
                fontSize: '11px',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: '#a1a1aa',
                fontFamily: "'IBM Plex Mono', monospace",
              }}
            >
              Base Font Size
            </label>
          </div>
          <span
            style={{
              fontSize: '12px',
              color: '#a78bfa',
              fontFamily: "'IBM Plex Mono', monospace",
            }}
          >
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
            background: '#3f3f46',
            outline: 'none',
            WebkitAppearance: 'none',
          }}
        />
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: '4px',
            fontSize: '11px',
            color: '#71717a',
            fontFamily: "'IBM Plex Mono', monospace",
          }}
        >
          <span>12px</span>
          <span>18px</span>
          <span>24px</span>
        </div>
      </div>

      {/* Font Family */}
      <div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '12px',
          }}
        >
          <Type size={16} style={{ color: '#a78bfa', flexShrink: 0 }} />
          <label
            style={{
              fontSize: '11px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: '#a1a1aa',
              fontFamily: "'IBM Plex Mono', monospace",
            }}
          >
            Interface Font
          </label>
        </div>
        <select
          value={settings.interfaceFontFamily || ''}
          onChange={(e) => handleFontChange('interfaceFontFamily', e.target.value)}
          style={{
            width: '100%',
            padding: '8px 12px',
            fontSize: '13px',
            fontFamily: "'IBM Plex Mono', monospace",
            backgroundColor: '#27272a',
            border: '1px solid #3f3f46',
            borderRadius: '2px',
            color: '#e4e4e7',
            outline: 'none',
            cursor: 'pointer',
          }}
        >
          <option value="">Default</option>
          {fontOptions.map((font) => (
            <option key={font} value={font}>
              {font || 'Default'}
            </option>
          ))}
        </select>
      </div>

      <div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '12px',
          }}
        >
          <Type size={16} style={{ color: '#a78bfa', flexShrink: 0 }} />
          <label
            style={{
              fontSize: '11px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: '#a1a1aa',
              fontFamily: "'IBM Plex Mono', monospace",
            }}
          >
            Text Font
          </label>
        </div>
        <select
          value={settings.textFontFamily || ''}
          onChange={(e) => handleFontChange('textFontFamily', e.target.value)}
          style={{
            width: '100%',
            padding: '8px 12px',
            fontSize: '13px',
            fontFamily: "'IBM Plex Mono', monospace",
            backgroundColor: '#27272a',
            border: '1px solid #3f3f46',
            borderRadius: '2px',
            color: '#e4e4e7',
            outline: 'none',
            cursor: 'pointer',
          }}
        >
          <option value="">Default</option>
          {fontOptions.map((font) => (
            <option key={font} value={font}>
              {font || 'Default'}
            </option>
          ))}
        </select>
      </div>

      <div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '12px',
          }}
        >
          <Type size={16} style={{ color: '#a78bfa', flexShrink: 0 }} />
          <label
            style={{
              fontSize: '11px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: '#a1a1aa',
              fontFamily: "'IBM Plex Mono', monospace",
            }}
          >
            Monospace Font
          </label>
        </div>
        <select
          value={settings.monospaceFontFamily || ''}
          onChange={(e) => handleFontChange('monospaceFontFamily', e.target.value)}
          style={{
            width: '100%',
            padding: '8px 12px',
            fontSize: '13px',
            fontFamily: "'IBM Plex Mono', monospace",
            backgroundColor: '#27272a',
            border: '1px solid #3f3f46',
            borderRadius: '2px',
            color: '#e4e4e7',
            outline: 'none',
            cursor: 'pointer',
          }}
        >
          <option value="">Default</option>
          {monospaceFontOptions.map((font) => (
            <option key={font} value={font}>
              {font || 'Default'}
            </option>
          ))}
        </select>
      </div>

      {/* Community Themes */}
      <div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '12px',
          }}
        >
          <Palette size={16} style={{ color: '#a78bfa', flexShrink: 0 }} />
          <label
            style={{
              fontSize: '11px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: '#a1a1aa',
              fontFamily: "'IBM Plex Mono', monospace",
            }}
          >
            Community Theme
          </label>
        </div>
        {loadingThemes ? (
          <div
            style={{
              fontSize: '12px',
              color: '#71717a',
              fontFamily: "'IBM Plex Mono', monospace",
            }}
          >
            Loading themes...
          </div>
        ) : (
          <select
            value={settings.cssTheme || ''}
            onChange={(e) => handleThemeSelect(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              fontSize: '13px',
              fontFamily: "'IBM Plex Mono', monospace",
              backgroundColor: '#27272a',
              border: '1px solid #3f3f46',
              borderRadius: '2px',
              color: '#e4e4e7',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="">Built-in (Default)</option>
            {availableThemes.map((theme) => (
              <option key={theme} value={theme}>
                {theme}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* CSS Snippets */}
      <div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '12px',
          }}
        >
          <Type size={16} style={{ color: '#a78bfa', flexShrink: 0 }} />
          <label
            style={{
              fontSize: '11px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: '#a1a1aa',
              fontFamily: "'IBM Plex Mono', monospace",
            }}
          >
            CSS Snippets
          </label>
        </div>
        {availableSnippets.length === 0 ? (
          <div
            style={{
              fontSize: '12px',
              color: '#71717a',
              fontFamily: "'IBM Plex Mono', monospace",
              padding: '12px',
              backgroundColor: '#27272a',
              borderRadius: '2px',
              border: '1px dashed #3f3f46',
            }}
          >
            No CSS snippets found. Place .css files in .obsidian/snippets/
          </div>
        ) : (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            {availableSnippets.map((snippet) => (
              <label
                key={snippet}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px',
                  backgroundColor: '#27272a',
                  border: '1px solid #3f3f46',
                  borderRadius: '2px',
                  cursor: 'pointer',
                  transition: 'border-color 100ms ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#52525b';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#3f3f46';
                }}
              >
                <input
                  type="checkbox"
                  checked={(settings.enabledCssSnippets || []).includes(snippet)}
                  onChange={(e) => handleSnippetToggle(snippet, e.target.checked)}
                  style={{
                    width: '16px',
                    height: '16px',
                    flexShrink: 0,
                    cursor: 'pointer',
                  }}
                />
                <span
                  style={{
                    fontSize: '13px',
                    color: '#e4e4e7',
                    fontFamily: "'IBM Plex Mono', monospace",
                  }}
                >
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
