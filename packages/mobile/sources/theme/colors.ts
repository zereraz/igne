import { useColorScheme } from 'react-native';

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

const dark: Colors = {
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
};

const light: Colors = {
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
};

export function useColors(): Colors & { isDark: boolean } {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  return { ...(isDark ? dark : light), isDark };
}
