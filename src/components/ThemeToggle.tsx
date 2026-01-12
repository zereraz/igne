import { Sun, Moon } from 'lucide-react';

interface ThemeToggleProps {
  baseTheme: 'dark' | 'light';
  onThemeChange: (theme: 'dark' | 'light') => void;
}

export function ThemeToggle({ baseTheme, onThemeChange }: ThemeToggleProps) {
  const isDark = baseTheme === 'dark';

  return (
    <button
      onClick={() => onThemeChange(isDark ? 'light' : 'dark')}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '28px',
        height: '28px',
        border: 'none',
        background: 'transparent',
        color: '#71717a',
        cursor: 'pointer',
        borderRadius: '2px',
        padding: '0',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = '#3f3f46';
        e.currentTarget.style.color = '#e4e4e7';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent';
        e.currentTarget.style.color = '#71717a';
      }}
      title={`Toggle to ${isDark ? 'light' : 'dark'} theme`}
    >
      {isDark ? <Sun size={14} /> : <Moon size={14} />}
    </button>
  );
}
