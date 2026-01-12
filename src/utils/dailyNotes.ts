// =============================================================================
// Daily Notes Utility
// =============================================================================

import { invoke } from '@tauri-apps/api/core';
import { readJsonSafe, writeJsonSafe } from './safeJson';

export interface DailyNotesConfig {
  folder: string;
  format: string;
  template: string;
}

const DEFAULT_CONFIG: DailyNotesConfig = {
  folder: 'Daily Notes',
  format: 'YYYY-MM-DD',
  template: `# {{date}}

## Notes



## Tasks


`,
};

export async function loadDailyNotesConfig(): Promise<DailyNotesConfig> {
  const config = await readJsonSafe<DailyNotesConfig>('.obsidian/daily-notes.json');
  if (config) {
    return { ...DEFAULT_CONFIG, ...config };
  }
  return DEFAULT_CONFIG;
}

export async function saveDailyNotesConfig(config: DailyNotesConfig): Promise<void> {
  try {
    await writeJsonSafe('.obsidian/daily-notes.json', config, {
      preserveUnknown: true,
      merge: true,
    });
  } catch (e) {
    console.error('Failed to save daily notes config:', e);
  }
}

export function formatDate(date: Date, format: string): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return format
    .replace('YYYY', String(year))
    .replace('YY', String(year).slice(-2))
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds);
}

export function getDailyNotePath(date: Date, vaultPath: string, config: DailyNotesConfig): string {
  const folder = config.folder;
  const fileName = formatDate(date, config.format);
  return `${vaultPath}/${folder}/${fileName}.md`;
}

export async function applyTemplate(date: Date, config: DailyNotesConfig): Promise<string> {
  let template = config.template;

  if (!template) {
    template = DEFAULT_CONFIG.template;
  }

  // Replace variables
  const variables = {
    date: formatDate(date, config.format),
    time: formatDate(date, 'HH:mm'),
    title: formatDate(date, config.format),
    datetime: formatDate(date, `${config.format} HH:mm`),
    year: String(date.getFullYear()),
    month: String(date.getMonth() + 1).padStart(2, '0'),
    day: String(date.getDate()).padStart(2, '0'),
  };

  let result = template;
  Object.entries(variables).forEach(([key, value]) => {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
  });

  return result;
}

export async function openDailyNote(
  date: Date,
  vaultPath: string,
  config: DailyNotesConfig
): Promise<{ path: string; content: string }> {
  const notePath = getDailyNotePath(date, vaultPath, config);
  const folder = config.folder;

  // Check if folder exists, create if not
  const folderPath = `${vaultPath}/${folder}`;
  try {
    await invoke('create_directory', { path: folderPath });
  } catch (e) {
    // Folder might already exist
  }

  // Check if file exists
  let content = '';
  try {
    content = await invoke('read_file', { path: notePath });
  } catch (e) {
    // File doesn't exist, create from template
    content = await applyTemplate(date, config);
    await invoke('write_file', { path: notePath, content });
  }

  return { path: notePath, content };
}

export function parseDateFromFileName(fileName: string, format: string): Date | null {
  // Simple parsing for YYYY-MM-DD format
  if (format === 'YYYY-MM-DD') {
    const match = fileName.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) {
      const [, year, month, day] = match;
      return new Date(`${year}-${month}-${day}`);
    }
  }

  // Add more format parsing as needed

  return null;
}
