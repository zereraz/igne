import MiniSearch from 'minisearch';
import Fuse from 'fuse.js';
import { invoke } from '@tauri-apps/api/core';
import type { FileEntry, SearchDocument } from '../types';
import { toVaultPath, toOsPath, getVaultBasename } from '../utils/vaultPaths';

class SearchStore {
  private miniSearch: MiniSearch;
  private files: Map<string, SearchDocument>;
  private fuse: Fuse<SearchDocument>;
  private vaultPath: string = '';

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

  /**
   * Set the vault path for OS path conversion
   * The search store stores vault-absolute paths internally
   */
  setVaultPath(vaultPath: string): void {
    this.vaultPath = vaultPath;
  }

  /**
   * Convert OS path to vault-absolute path for storage
   */
  private toVaultPath(osPath: string): string {
    if (!this.vaultPath) {
      // Fallback: return as-is if vault path not set
      return osPath;
    }
    return toVaultPath(osPath, this.vaultPath);
  }

  /**
   * Convert vault-absolute path to OS path for file I/O
   */
  private toOsPathForIo(vaultPath: string): string {
    if (!this.vaultPath) {
      // Fallback: return as-is if vault path not set
      return vaultPath;
    }
    return toOsPath(vaultPath, this.vaultPath);
  }

  async indexFiles(vaultPath: string, entries: FileEntry[], signal?: AbortSignal) {
    this.vaultPath = vaultPath;
    const documents: SearchDocument[] = [];

    for (const entry of this.flattenFileTree(entries)) {
      // Check if aborted
      if (signal?.aborted) {
        console.log('[searchStore] Indexing aborted');
        return;
      }

      if (!entry.is_dir && entry.name.endsWith('.md')) {
        try {
          // Use OS path for reading file
          const content = await invoke<string>('read_file', { path: entry.path });

          // Check again after async operation
          if (signal?.aborted) {
            console.log('[searchStore] Indexing aborted after file read');
            return;
          }

          // Convert to vault-absolute path for storage
          const vaultAbsolutePath = this.toVaultPath(entry.path);

          const doc: SearchDocument = {
            id: vaultAbsolutePath, // Use vault path as unique ID
            path: vaultAbsolutePath,
            name: entry.name.replace('.md', ''),
            content,
          };
          documents.push(doc);
          this.files.set(vaultAbsolutePath, doc);
        } catch (error) {
          // Ignore errors if aborted
          if (signal?.aborted) return;
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
  // Accepts either OS path or vault path
  async updateFile(path: string, content: string) {
    // Normalize to vault path for internal storage
    const vaultPath = this.toVaultPath(path);
    const existing = this.files.get(vaultPath);
    const name = getVaultBasename(vaultPath).replace('.md', '') || '';

    const doc: SearchDocument = {
      id: vaultPath, // Use vault path as unique ID
      path: vaultPath,
      name,
      content,
    };

    this.files.set(vaultPath, doc);

    if (existing) {
      // Discard old version and add new
      this.miniSearch.discard(vaultPath);
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
  // Accepts either OS path or vault path
  async removeFile(path: string) {
    const vaultPath = this.toVaultPath(path);
    this.files.delete(vaultPath);
    this.miniSearch.discard(vaultPath);

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

  // Advanced search with operators (tag:, file:, path:)
  advancedSearch(query: string) {
    if (!query.trim()) return [];

    // Parse search operators
    const operators = this.parseSearchOperators(query);
    const { searchText, filters } = operators;

    // Get base results from text search
    let results = searchText
      ? this.miniSearch.search(searchText, {
          fuzzy: 0.2,
          prefix: true,
        })
      : Array.from(this.files.values()).map(doc => ({ ...doc }));

    // Apply filters
    results = this.applyFilters(results, filters);

    return results;
  }

  private parseSearchOperators(query: string) {
    const filters: {
      tags?: string[];
      file?: string;
      path?: string;
    } = {};

    let searchText = query;

    // Extract tag: operator
    const tagMatches = query.matchAll(/tag:(\S+)/g);
    const tags: string[] = [];
    for (const match of tagMatches) {
      tags.push(match[1]);
      searchText = searchText.replace(match[0], '');
    }
    if (tags.length > 0) {
      filters.tags = tags;
    }

    // Extract #tag syntax
    const hashTagMatches = query.matchAll(/#(\w+)/g);
    for (const match of hashTagMatches) {
      tags.push(match[1]);
      searchText = searchText.replace(match[0], '');
    }
    if (tags.length > 0) {
      filters.tags = tags;
    }

    // Extract file: operator
    const fileMatch = query.match(/file:(\S+)/);
    if (fileMatch) {
      filters.file = fileMatch[1];
      searchText = searchText.replace(fileMatch[0], '');
    }

    // Extract path: operator
    const pathMatch = query.match(/path:(\S+)/);
    if (pathMatch) {
      filters.path = pathMatch[1];
      searchText = searchText.replace(pathMatch[0], '');
    }

    return {
      searchText: searchText.trim(),
      filters,
    };
  }

  private applyFilters(
    results: any[],
    filters: { tags?: string[]; file?: string; path?: string }
  ) {
    let filtered = results;

    // Filter by tags
    if (filters.tags && filters.tags.length > 0) {
      filtered = filtered.filter((result) => {
        const doc = this.files.get(result.id);
        if (!doc) return false;

        const content = doc.content.toLowerCase();
        return filters.tags!.some((tag) => {
          const tagLower = tag.toLowerCase();
          // Check both #tag and tag: syntax
          return (
            content.includes(`#${tagLower}`) ||
            content.includes(`tag:${tagLower}`)
          );
        });
      });
    }

    // Filter by file name
    if (filters.file) {
      const fileLower = filters.file.toLowerCase();
      filtered = filtered.filter((result) => {
        const doc = this.files.get(result.id);
        if (!doc) return false;
        return doc.name.toLowerCase().includes(fileLower);
      });
    }

    // Filter by path
    if (filters.path) {
      const pathLower = filters.path.toLowerCase();
      filtered = filtered.filter((result) => {
        const doc = this.files.get(result.id);
        if (!doc) return false;
        return doc.path.toLowerCase().includes(pathLower);
      });
    }

    return filtered;
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

  /**
   * Search files and return results with OS paths for file I/O
   * Use this for QuickSwitcher and similar components that need to open files
   */
  searchFilesWithOsPaths(query: string): Array<{ path: string; name: string }> {
    const docs = this.searchFiles(query);
    return docs.map(doc => ({
      path: this.toOsPathForIo(doc.path),
      name: doc.name,
    }));
  }

  findBacklinks(filePath: string): SearchDocument[] {
    // Normalize input to vault path
    const vaultPath = this.toVaultPath(filePath);
    const fileName = getVaultBasename(vaultPath).replace('.md', '') || '';
    const backlinks: SearchDocument[] = [];

    for (const doc of this.files.values()) {
      const wikilinkPattern = new RegExp(
        `\\[\\[${fileName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\|[^\\]]+)?\\]\\]`,
        'g'
      );

      if (doc.path !== vaultPath && wikilinkPattern.test(doc.content)) {
        backlinks.push(doc);
      }
    }

    return backlinks;
  }

  /**
   * Get OS path for a vault path
   * Useful when you need to read the actual file
   */
  getOsPath(vaultPath: string): string {
    return this.toOsPathForIo(vaultPath);
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

  /**
   * Get file path by note name
   * Returns OS path for backward compatibility (use for file I/O)
   */
  getFilePathByName(name: string): string | null {
    const doc = Array.from(this.files.values()).find(
      (doc) => doc.name.toLowerCase() === name.toLowerCase()
    );
    // Return OS path for file reading
    return doc ? this.toOsPathForIo(doc.path) : null;
  }

  /**
   * Get vault-absolute path by note name
   * Returns vault path for storage in workspace/config
   */
  getVaultPathByName(name: string): string | null {
    const doc = Array.from(this.files.values()).find(
      (doc) => doc.name.toLowerCase() === name.toLowerCase()
    );
    return doc?.path || null;
  }

  // Refresh the vault index - can be called after file creation to update immediately
  async refreshVault(vaultPath: string, entries: FileEntry[]): Promise<void> {
    await this.indexFiles(vaultPath, entries);
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
