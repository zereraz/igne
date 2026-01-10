// =============================================================================
// MetadataCache - File Metadata Caching
// =============================================================================

import { EventRef } from './eventRef';
import { Events } from './events';
import { MarkdownParser } from './parser/MarkdownParser';
import type { App } from './App';
import type { TFile, CachedMetadata } from './types';

export class MetadataCache extends Events {
  private cache: Map<string, CachedMetadata> = new Map();
  private resolvedLinks: Map<string, Map<string, number>> = new Map();
  private unresolvedLinks: Map<string, Map<string, number>> = new Map();
  private parser: MarkdownParser = new MarkdownParser();

  constructor(private app: App) {
    super();
  }

  /**
   * Initialize the metadata cache with a vault path
   * Alias for rebuildCache for compatibility
   */
  async initialize(vaultPath: string): Promise<void> {
    // For now, just rebuild the cache
    // In the future, this could load from disk cache
    await this.rebuildCache();
  }

  /**
   * Get cached metadata for a file
   * Includes file metadata in the cache
   */
  getFileCache(file: TFile): CachedMetadata | null {
    const metadata = this.cache.get(file.path) || null;
    if (metadata && !metadata.file) {
      // Augment cache with file metadata
      metadata.file = {
        path: file.path,
        basename: file.basename,
        extension: file.extension,
        stat: file.stat,
      };
    }
    return metadata;
  }

  /**
   * Get cached metadata by path
   * Includes file metadata if available
   */
  getCache(path: string): CachedMetadata | null {
    const metadata = this.cache.get(path) || null;
    if (metadata && !metadata.file) {
      // Try to find file in vault and augment with file metadata
      const file = this.app.vault.getFileByPath(path);
      if (file) {
        metadata.file = {
          path: file.path,
          basename: file.basename,
          extension: file.extension,
          stat: file.stat,
        };
      } else {
        // Derive basename from path
        const parts = path.split('/');
        const filename = parts[parts.length - 1] || '';
        const basename = filename.replace(/\.[^/.]+$/, '');
        metadata.file = {
          path,
          basename,
          extension: filename.includes('.') ? filename.split('.').pop() || 'md' : 'md',
        };
      }
    }
    return metadata;
  }

  /**
   * Rebuild cache for all markdown files in vault
   */
  async rebuildCache(): Promise<void> {
    const files = this.app.vault.getMarkdownFiles();

    for (const file of files) {
      await this.updateFileCache(file);
    }

    // Build resolved/unresolved link maps
    this.buildLinkMaps();

    this.trigger('resolved');
  }

  /**
   * Update cache for a single file
   */
  async updateFileCache(file: TFile): Promise<void> {
    try {
      const content = await this.app.vault.read(file);
      const metadata = this.parser.parse(content, file.path);
      this.cache.set(file.path, metadata);
      this.trigger('changed', file, content, metadata);
    } catch (error) {
      console.error(`[MetadataCache] Failed to cache ${file.path}:`, error);
    }
  }

  /**
   * Remove file from cache (when deleted)
   */
  removeFileCache(file: TFile): void {
    const prevCache = this.cache.get(file.path) || null;
    this.cache.delete(file.path);
    this.trigger('deleted', file, prevCache);

    // Remove from link maps
    this.resolvedLinks.delete(file.path);
    this.unresolvedLinks.delete(file.path);
  }

  /**
   * Get all files that link to the given file
   */
  getBacklinksForFile(file: TFile): TFile[] {
    const backlinks: TFile[] = [];
    const fileName = file.basename;

    for (const [path, links] of this.resolvedLinks) {
      if (links.has(fileName)) {
        const linkedFile = this.app.vault.getFileByPath(path);
        if (linkedFile) {
          backlinks.push(linkedFile);
        }
      }
    }

    return backlinks;
  }

  /**
   * Build resolved and unresolved link maps
   */
  private buildLinkMaps(): void {
    this.resolvedLinks.clear();
    this.unresolvedLinks.clear();

    for (const [path, metadata] of this.cache) {
      const links = metadata.links || [];
      const resolved = new Map<string, number>();
      const unresolved = new Map<string, number>();

      for (const link of links) {
        const targetFile = this.app.vault.getFileByPath(this.resolveLinkPath(link.link, path));
        if (targetFile) {
          const count = resolved.get(targetFile.basename) || 0;
          resolved.set(targetFile.basename, count + 1);
        } else {
          const count = unresolved.get(link.link) || 0;
          unresolved.set(link.link, count + 1);
        }
      }

      if (resolved.size > 0) {
        this.resolvedLinks.set(path, resolved);
      }
      if (unresolved.size > 0) {
        this.unresolvedLinks.set(path, unresolved);
      }
    }
  }

  /**
   * Resolve link path relative to source file
   */
  private resolveLinkPath(link: string, sourcePath: string): string {
    // If link has extension, it's a direct path
    if (link.includes('.')) {
      return link;
    }

    // If link starts with /, it's absolute from vault root
    if (link.startsWith('/')) {
      return link.substring(1) + '.md';
    }

    // Relative path - resolve relative to source file's directory
    const sourceDir = sourcePath.substring(0, sourcePath.lastIndexOf('/'));
    return `${sourceDir}/${link}.md`;
  }

  /**
   * Get unresolved links for all files
   */
  getUnresolvedLinks(): Record<string, Record<string, number>> {
    const result: Record<string, Record<string, number>> = {};
    for (const [path, links] of this.unresolvedLinks) {
      result[path] = Object.fromEntries(links);
    }
    return result;
  }

  /**
   * Get resolved links for all files
   */
  getResolvedLinks(): Record<string, Record<string, number>> {
    const result: Record<string, Record<string, number>> = {};
    for (const [path, links] of this.resolvedLinks) {
      result[path] = Object.fromEntries(links);
    }
    return result;
  }

  // Event type definitions
  on(name: 'changed', callback: (file: TFile, data: string, cache: CachedMetadata) => any): EventRef;
  on(name: 'deleted', callback: (file: TFile, prevCache: CachedMetadata | null) => any): EventRef;
  on(name: 'resolved', callback: () => any): EventRef;
  on(name: string, callback: (...args: any[]) => any): EventRef {
    return super.on(name, callback);
  }
}
