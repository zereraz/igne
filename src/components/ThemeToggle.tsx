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
        color: 'var(--text-faint)',
        cursor: 'pointer',
        borderRadius: '2px',
        padding: '0',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = 'var(--background-modifier-hover)';
        e.currentTarget.style.color = 'var(--text-normal)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent';
        e.currentTarget.style.color = 'var(--text-faint)';
      }}
      title={`Toggle to ${isDark ? 'light' : 'dark'} theme`}
    >
      {isDark ? <Sun size={14} /> : <Moon size={14} />}
    </button>
  );
}
