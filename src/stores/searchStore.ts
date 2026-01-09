import MiniSearch from 'minisearch';
import Fuse from 'fuse.js';
import { invoke } from '@tauri-apps/api/core';
import { FileEntry } from '../types';

interface Document {
  id: string;
  path: string;
  name: string;
  content: string;
}

interface SearchResult {
  id: string;
  path: string;
  name: string;
  score: number;
  match?: {
    key: string;
    indices: number[][];
    value: string;
  };
}

class SearchStore {
  private miniSearch: MiniSearch;
  private files: Map<string, Document>;
  private fuse: Fuse<Document>;
  private vaultPath: string | null = null;

  constructor() {
    this.miniSearch = new MiniSearch({
      fields: ['name', 'content'],
      storeFields: ['id', 'path', 'name'],
      searchOptions: {
        fuzzy: 0.2,
        prefix: true,
      },
    });
    this.files = new Map();
    this.fuse = new Fuse([], {
      keys: ['name'],
      includeScore: true,
      threshold: 0.3,
    });
  }

  async indexFiles(vaultPath: string, entries: FileEntry[]) {
    this.vaultPath = vaultPath;
    const documents: Document[] = [];

    for (const entry of this.flattenFileTree(entries)) {
      if (!entry.is_dir && entry.name.endsWith('.md')) {
        try {
          const content = await invoke<string>('read_file', { path: entry.path });
          const doc: Document = {
            id: entry.path,
            path: entry.path,
            name: entry.name.replace('.md', ''),
            content,
          };
          documents.push(doc);
          this.files.set(entry.path, doc);
        } catch (error) {
          console.error(`Failed to read file ${entry.path}:`, error);
        }
      }
    }

    this.miniSearch.removeAll();
    this.miniSearch.add(documents);
    this.fuse = new Fuse(Array.from(this.files.values()), {
      keys: ['name'],
      includeScore: true,
      threshold: 0.3,
    });
  }

  search(query: string): SearchResult[] {
    if (!query.trim()) return [];

    const results = this.miniSearch.search(query);
    return results.map((result: any) => ({
      id: result.id,
      path: result.path,
      name: result.name,
      score: result.score,
    }));
  }

  searchFiles(query: string): Document[] {
    if (!query.trim()) return [];

    const results = this.fuse.search(query);
    return results.map((result) => result.item);
  }

  findBacklinks(filePath: string): Document[] {
    const fileName = filePath.split(/[/\\]/).pop()?.replace('.md', '') || '';
    const backlinks: Document[] = [];

    for (const doc of this.files.values()) {
      const wikilinkPattern = new RegExp(
        `\\[\\[${fileName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\|[^\\]]+)?\\]\\]`,
        'g'
      );

      if (doc.path !== filePath && wikilinkPattern.test(doc.content)) {
        backlinks.push(doc);
      }
    }

    return backlinks;
  }

  resolveWikilink(wikilink: string): Document | null {
    const match = wikilink.match(/\[\[([^\]|]+)(\|([^\]]+))?\]\]/);
    if (!match) return null;

    const targetName = match[1];
    const exactMatch = Array.from(this.files.values()).find(
      (doc) => doc.name.toLowerCase() === targetName.toLowerCase()
    );

    return exactMatch || null;
  }

  getAllNoteNames(): string[] {
    return Array.from(this.files.values()).map((doc) => doc.name);
  }

  noteExists(name: string): boolean {
    return Array.from(this.files.values()).some(
      (doc) => doc.name.toLowerCase() === name.toLowerCase()
    );
  }

  getFilePathByName(name: string): string | null {
    const doc = Array.from(this.files.values()).find(
      (doc) => doc.name.toLowerCase() === name.toLowerCase()
    );
    return doc?.path || null;
  }

  private flattenFileTree(entries: FileEntry[]): FileEntry[] {
    const result: FileEntry[] = [];

    function traverse(entries: FileEntry[]) {
      for (const entry of entries) {
        result.push(entry);
        if (entry.children) {
          traverse(entry.children);
        }
      }
    }

    traverse(entries);
    return result;
  }
}

export const searchStore = new SearchStore();
