import { useColorScheme } from 'react-native';
import { create } from 'zustand';
import { createMMKV } from 'react-native-mmkv';

// ── Color palette interface ──────────────────────────────────────────

export interface Colors {
  bg: string;
  surface: string;
  surfaceHover: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  accent: string;
  border: string;
  dirty: string;
  red: string;
}

export interface Theme {
  id: string;
  label: string;
  isDark: boolean;
  colors: Colors;
}

// ── Themes ───────────────────────────────────────────────────────────

export const themes: Theme[] = [
  {
    id: 'catppuccin-mocha',
    label: 'Catppuccin Mocha',
    isDark: true,
    colors: {
      bg: '#1e1e2e',
      surface: '#181825',
      surfaceHover: '#313244',
      text: '#cdd6f4',
      textSecondary: '#a6adc8',
      textMuted: '#6c7086',
      accent: '#89b4fa',
      border: '#45475a',
      dirty: '#fab387',
      red: '#f38ba8',
    },
  },
  {
    id: 'catppuccin-latte',
    label: 'Catppuccin Latte',
    isDark: false,
    colors: {
      bg: '#eff1f5',
      surface: '#e6e9ef',
      surfaceHover: '#dce0e8',
      text: '#4c4f69',
      textSecondary: '#5c5f77',
      textMuted: '#9ca0b0',
      accent: '#1e66f5',
      border: '#ccd0da',
      dirty: '#fe640b',
      red: '#d20f39',
    },
  },
  {
    id: 'nord-dark',
    label: 'Nord',
    isDark: true,
    colors: {
      bg: '#2e3440',
      surface: '#3b4252',
      surfaceHover: '#434c5e',
      text: '#eceff4',
      textSecondary: '#d8dee9',
      textMuted: '#7b88a1',
      accent: '#88c0d0',
      border: '#4c566a',
      dirty: '#ebcb8b',
      red: '#bf616a',
    },
  },
  {
    id: 'nord-light',
    label: 'Nord Light',
    isDark: false,
    colors: {
      bg: '#eceff4',
      surface: '#e5e9f0',
      surfaceHover: '#d8dee9',
      text: '#2e3440',
      textSecondary: '#3b4252',
      textMuted: '#7b88a1',
      accent: '#5e81ac',
      border: '#d8dee9',
      dirty: '#d08770',
      red: '#bf616a',
    },
  },
  {
    id: 'solarized-dark',
    label: 'Solarized Dark',
    isDark: true,
    colors: {
      bg: '#002b36',
      surface: '#073642',
      surfaceHover: '#0a4050',
      text: '#839496',
      textSecondary: '#93a1a1',
      textMuted: '#586e75',
      accent: '#268bd2',
      border: '#094554',
      dirty: '#cb4b16',
      red: '#dc322f',
    },
  },
  {
    id: 'solarized-light',
    label: 'Solarized Light',
    isDark: false,
    colors: {
      bg: '#fdf6e3',
      surface: '#eee8d5',
      surfaceHover: '#e6dfcb',
      text: '#657b83',
      textSecondary: '#586e75',
      textMuted: '#93a1a1',
      accent: '#268bd2',
      border: '#e6dfcb',
      dirty: '#cb4b16',
      red: '#dc322f',
    },
  },
  {
    id: 'rosepine',
    label: 'Rose Pine',
    isDark: true,
    colors: {
      bg: '#191724',
      surface: '#1f1d2e',
      surfaceHover: '#26233a',
      text: '#e0def4',
      textSecondary: '#908caa',
      textMuted: '#6e6a86',
      accent: '#c4a7e7',
      border: '#403d52',
      dirty: '#f6c177',
      red: '#eb6f92',
    },
  },
  {
    id: 'rosepine-dawn',
    label: 'Rose Pine Dawn',
    isDark: false,
    colors: {
      bg: '#faf4ed',
      surface: '#fffaf3',
      surfaceHover: '#f2e9e1',
      text: '#575279',
      textSecondary: '#797593',
      textMuted: '#9893a5',
      accent: '#907aa9',
      border: '#dfdad9',
      dirty: '#ea9d34',
      red: '#b4637a',
    },
  },
  {
    id: 'minimal-dark',
    label: 'Minimal Dark',
    isDark: true,
    colors: {
      bg: '#121212',
      surface: '#1a1a1a',
      surfaceHover: '#242424',
      text: '#e0e0e0',
      textSecondary: '#b0b0b0',
      textMuted: '#666666',
      accent: '#82aaff',
      border: '#2a2a2a',
      dirty: '#ffcb6b',
      red: '#f07178',
    },
  },
  {
    id: 'minimal-light',
    label: 'Minimal Light',
    isDark: false,
    colors: {
      bg: '#ffffff',
      surface: '#f8f8f8',
      surfaceHover: '#f0f0f0',
      text: '#1e1e2e',
      textSecondary: '#5c5f77',
      textMuted: '#9399b2',
      accent: '#1e66f5',
      border: '#e6e6e6',
      dirty: '#fe640b',
      red: '#d20f39',
    },
  },
];

// ── Theme store (persisted via MMKV) ─────────────────────────────────

let _themeStorage: ReturnType<typeof createMMKV> | null = null;
function getThemeStorage() {
  if (!_themeStorage) _themeStorage = createMMKV({ id: 'igne-theme' });
  return _themeStorage;
}

interface ThemeState {
  themeId: string; // 'system' or a theme id
  setTheme: (id: string) => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  themeId: getThemeStorage().getString('themeId') || 'system',
  setTheme: (id: string) => {
    getThemeStorage().set('themeId', id);
    set({ themeId: id });
  },
}));

// ── Hook ─────────────────────────────────────────────────────────────

export function useColors(): Colors & { isDark: boolean } {
  const systemScheme = useColorScheme();
  const themeId = useThemeStore((s) => s.themeId);

  if (themeId === 'system') {
    const isDark = systemScheme === 'dark';
    const t = isDark
      ? themes.find((t) => t.id === 'catppuccin-mocha')!
      : themes.find((t) => t.id === 'minimal-light')!;
    return { ...t.colors, isDark: t.isDark };
  }

  const t = themes.find((t) => t.id === themeId) ?? themes[0];
  return { ...t.colors, isDark: t.isDark };
}
