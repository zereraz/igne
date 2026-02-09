import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { openDailyNote, loadDailyNotesConfig, parseDateFromFileName, formatDate } from '../utils/dailyNotes';

interface DailyNotesNavProps {
  vaultPath: string | null;
  currentFilePath: string | null;
  onNoteOpen: (path: string, content: string) => void;
}

export function DailyNotesNav({ vaultPath, currentFilePath, onNoteOpen }: DailyNotesNavProps) {
  const [currentDate, setCurrentDate] = useState<Date | null>(null);
  const [isDailyNote, setIsDailyNote] = useState(false);

  // Check if current file is a daily note
  useEffect(() => {
    if (!vaultPath || !currentFilePath) {
      setIsDailyNote(false);
      setCurrentDate(null);
      return;
    }

    const checkIfDailyNote = async () => {
      const config = await loadDailyNotesConfig();
      const fileName = currentFilePath.replace(`${vaultPath}/${config.folder}/`, '').replace('.md', '');
      const date = parseDateFromFileName(fileName, config.format);

      if (date) {
        setCurrentDate(date);
        setIsDailyNote(true);
      } else {
        setIsDailyNote(false);
        setCurrentDate(null);
      }
    };

    checkIfDailyNote();
  }, [vaultPath, currentFilePath]);

  const handleNavigate = async (offset: number) => {
    if (!vaultPath || !currentDate) return;

    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + offset);

    const config = await loadDailyNotesConfig();
    const { path: notePath, content } = await openDailyNote(newDate, vaultPath, config);

    onNoteOpen(notePath, content);
  };

  if (!isDailyNote || !currentDate) {
    return null;
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '6px 12px',
        backgroundColor: 'var(--background-secondary)',
        borderBottom: '1px solid var(--background-modifier-border)',
      }}
    >
      <Calendar size={14} style={{ color: 'var(--text-faint)', flexShrink: 0 }} />
      <span
        style={{
          flex: 1,
          fontSize: '11px',
          color: 'var(--text-muted)',
          fontFamily: 'var(--font-monospace-theme, var(--font-monospace))',
          textAlign: 'center',
        }}
      >
        {formatDate(currentDate, 'YYYY-MM-DD')}
      </span>
      <button
        onClick={() => handleNavigate(-1)}
        style={{
          padding: '4px',
          backgroundColor: 'transparent',
          border: '1px solid var(--background-modifier-border)',
          borderRadius: '2px',
          color: 'var(--text-muted)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--background-modifier-border)';
          e.currentTarget.style.color = 'var(--text-normal)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
          e.currentTarget.style.color = 'var(--text-muted)';
        }}
        title="Previous day (Ctrl+Shift+Left)"
      >
        <ChevronLeft size={14} />
      </button>
      <button
        onClick={() => handleNavigate(1)}
        style={{
          padding: '4px',
          backgroundColor: 'transparent',
          border: '1px solid var(--background-modifier-border)',
          borderRadius: '2px',
          color: 'var(--text-muted)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--background-modifier-border)';
          e.currentTarget.style.color = 'var(--text-normal)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
          e.currentTarget.style.color = 'var(--text-muted)';
        }}
        title="Next day (Ctrl+Shift+Right)"
      >
        <ChevronRight size={14} />
      </button>
    </div>
  );
}
