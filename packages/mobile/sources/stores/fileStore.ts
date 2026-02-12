import { create } from 'zustand';
import { listMarkdownFiles, readFileContent } from '../sync/icloud';

export interface FileEntry {
  path: string;
  name: string;
  folder: string;
  modifiedTime: number;
  /** First non-heading, non-empty line — shown as preview in the stream */
  preview?: string;
}

interface FileState {
  files: FileEntry[];
  loading: boolean;
  vaultUri: string | null;
  loadFiles: (vaultUri: string) => Promise<void>;
  searchFiles: (query: string) => FileEntry[];
  resolveWikilink: (target: string) => string | null;
}

/** Extract the first meaningful line from markdown content. */
function extractPreview(content: string): string {
  const lines = content.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    // Skip empty lines, headings, frontmatter delimiters, and yaml
    if (!trimmed) continue;
    if (trimmed.startsWith('#')) continue;
    if (trimmed === '---') continue;
    if (trimmed.startsWith('tags:') || trimmed.startsWith('date:')) continue;
    // Strip markdown formatting for cleaner preview
    const clean = trimmed
      .replace(/\*\*(.+?)\*\*/g, '$1')  // bold
      .replace(/\*(.+?)\*/g, '$1')      // italic
      .replace(/\[\[(.+?)(\|(.+?))?\]\]/g, '$3$1') // wikilinks
      .replace(/\[(.+?)\]\(.+?\)/g, '$1') // links
      .replace(/^[>\-\*]\s+/, '')        // blockquotes, list markers
      .replace(/`(.+?)`/g, '$1');        // inline code
    return clean.length > 100 ? clean.slice(0, 100) + '...' : clean;
  }
  return '';
}

export const useFileStore = create<FileState>((set, get) => ({
  files: [],
  loading: false,
  vaultUri: null,

  loadFiles: async (vaultUri: string) => {
    set({ loading: true, vaultUri });
    try {
      const files = await listMarkdownFiles(vaultUri);
      // Sort by name for now (modifiedTime is 0 in SDK 54)
      files.sort((a, b) => a.name.localeCompare(b.name));

      // Load previews for the first 50 files (async, non-blocking)
      const withPreviews = await Promise.all(
        files.slice(0, 50).map(async (f) => {
          try {
            const content = await readFileContent(f.path);
            return { ...f, preview: extractPreview(content) };
          } catch {
            return f;
          }
        })
      );
      // Merge previews back with remaining files
      const remaining = files.slice(50);
      set({ files: [...withPreviews, ...remaining], loading: false });
    } catch (err) {
      console.error('Failed to load files:', err);
      set({ loading: false });
    }
  },

  searchFiles: (query: string) => {
    const { files } = get();
    const lower = query.toLowerCase();
    return files.filter(
      (f) =>
        f.name.toLowerCase().includes(lower) ||
        f.folder.toLowerCase().includes(lower) ||
        (f.preview && f.preview.toLowerCase().includes(lower))
    );
  },

  /** Resolve a wikilink target (e.g. "My Note") to a file path. */
  resolveWikilink: (target: string): string | null => {
    const { files } = get();
    const lower = target.toLowerCase().replace(/\.md$/, '');
    // Exact name match (without extension)
    const exact = files.find(
      (f) => f.name.replace(/\.md$/, '').toLowerCase() === lower
    );
    if (exact) return exact.path;
    // Partial match — target could be "folder/note" or just "note"
    const partial = files.find((f) =>
      f.path.toLowerCase().endsWith(`/${lower}.md`)
    );
    return partial?.path ?? null;
  },
}));
