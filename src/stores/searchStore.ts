import MiniSearch from 'minisearch';
import Fuse from 'fuse.js';
import { invoke } from '@tauri-apps/api/core';
import type { FileEntry, SearchDocument } from '../types';

class SearchStore {
  private miniSearch: MiniSearch;
  private files: Map<string, SearchDocument>;
  private fuse: Fuse<SearchDocument>;

  constructor() {
    this.files = new Map();
    this.miniSearch = new MiniSearch({
      idField: 'id',
      fields: ['name', 'content'],
      storeFields: ['id', 'path', 'name'],
    });
    this.fuse = new Fuse([], {
      keys: ['name'],
      includeScore: true,
      threshold: 0.3,
    });
  }

  async indexFiles(_vaultPath: string, entries: FileEntry[]) {
    const documents: SearchDocument[] = [];

    for (const entry of this.flattenFileTree(entries)) {
      if (!entry.is_dir && entry.name.endsWith('.md')) {
        try {
          const content = await invoke<string>('read_file', { path: entry.path });
          const doc: SearchDocument = {
            id: entry.path, // Use file path as unique ID
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

    console.log(`[searchStore] Indexed ${documents.length} files`);

    // Clear and rebuild MiniSearch index
    this.miniSearch.removeAll();
    this.miniSearch.addAll(documents);

    // Update Fuse for name-only search
    this.fuse = new Fuse(documents, {
      keys: ['name'],
      includeScore: true,
      threshold: 0.3,
    });
  }

  // Update a single file's content in the index (called when file is saved)
  async updateFile(path: string, content: string) {
    const existing = this.files.get(path);
    const name = path.split(/[/\\]/).pop()?.replace('.md', '') || '';

    const doc: SearchDocument = {
      id: path, // Use file path as unique ID
      path,
      name,
      content,
    };

    this.files.set(path, doc);

    if (existing) {
      // Discard old version and add new
      this.miniSearch.discard(path);
      this.miniSearch.add(doc);
    } else {
      // Add new document
      this.miniSearch.add(doc);
    }

    // Update Fuse instance
    this.fuse = new Fuse(Array.from(this.files.values()), {
      keys: ['name'],
      includeScore: true,
      threshold: 0.3,
    });
  }

  // Remove a file from the index (called when file is deleted)
  async removeFile(path: string) {
    this.files.delete(path);
    this.miniSearch.discard(path);

    this.fuse = new Fuse(Array.from(this.files.values()), {
      keys: ['name'],
      includeScore: true,
      threshold: 0.3,
    });
  }

  // Search by content (MiniSearch) - for full-text search
  search(query: string) {
    if (!query.trim()) return [];

    return this.miniSearch.search(query, {
      fuzzy: 0.2,
      prefix: true,
    });
  }

  // Search by file name (Fuse) - for QuickSwitcher
  searchFiles(query: string): SearchDocument[] {
    // Returns SearchDocument for compatibility, can be mapped to SearchResult
    if (!query.trim()) {
      const allFiles = Array.from(this.files.values());
      console.log(`[searchStore] searchFiles('') returning ${allFiles.length} files`);
      return allFiles;
    }

    const results = this.fuse.search(query);
    console.log(`[searchStore] searchFiles('${query}') found ${results.length} results`);
    return results.map((result) => result.item);
  }

  findBacklinks(filePath: string): SearchDocument[] {
    const fileName = filePath.split(/[/\\]/).pop()?.replace('.md', '') || '';
    const backlinks: SearchDocument[] = [];

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

  resolveWikilink(wikilink: string): SearchDocument | null {
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
