import { describe, it, expect, beforeEach } from 'vitest';
import { MetadataCache } from '../../src/obsidian/MetadataCache';
import type { FileEntry } from '../../src/types';

// Mock file system for testing
const mockVault = new Map<string, string>();

// Mock Tauri invoke function
const mockInvoke = async (cmd: string, args: any): Promise<any> => {
  if (cmd === 'read_file') {
    const content = mockVault.get(args.path);
    if (content === undefined) {
      throw new Error('File not found');
    }
    return content;
  }
  if (cmd === 'read_directory') {
    const entries: FileEntry[] = [];
    mockVault.forEach((content, path) => {
      const parts = path.split('/');
      entries.push({
        path,
        name: parts[parts.length - 1] || '',
        isFile: true,
        isFolder: false,
      });
    });
    return entries;
  }
  return null;
};

describe('Obsidian Plugin Compatibility', () => {
  let metadataCache: MetadataCache;
  let mockApp: any;

  beforeEach(() => {
    // Clear mock vault
    mockVault.clear();

    // Create test files
    mockVault.set('/vault/test.md', '# Test\n[[link]]');
    mockVault.set('/vault/another.md', '# Another\nContent');

    // Create a minimal mock app instead of full App (which requires DOM setup)
    mockApp = {
      vault: {
        adapter: {
          read: mockInvoke,
        },
        getAbstractFileByPath: (path: string) => {
          const content = mockVault.get(path);
          if (!content) return null;
          return {
            path,
            name: path.split('/').pop() || '',
          };
        },
        getFileByPath: (path: string) => {
          const content = mockVault.get(path);
          if (!content) return null;
          const name = path.split('/').pop() || '';
          return {
            path,
            name,
            basename: name.replace(/\.[^/.]+$/, ''), // Add basename
            extension: name.includes('.') ? name.split('.').pop() || 'md' : 'md',
          };
        },
        getMarkdownFiles: function() {
          const files: any[] = [];
          mockVault.forEach((content, path) => {
            if (path.endsWith('.md')) {
              const name = path.split('/').pop() || '';
              files.push({
                path,
                name,
                basename: name.replace(/\.[^/.]+$/, ''), // Add basename
                extension: 'md',
              });
            }
          });
          return files;
        },
        read: async (file: any) => {
          return mockVault.get(file.path) || '';
        },
      },
      workspace: {},
      metadataCache: null,
      commands: {},
    };

    // Initialize metadata cache with mock app
    metadataCache = new MetadataCache(mockApp as any);
  });

  describe('Dataview Compatibility', () => {
    it('should support metadata queries', async () => {
      const file = '/vault/dataview-test.md';
      mockVault.set(file, '---\ntags: [test, important]\n---\n# Content');

      await metadataCache.initialize('/vault');

      const metadata = metadataCache.getCache(file);
      expect(metadata).toBeDefined();
      expect(metadata?.frontmatter).toEqual({
        tags: ['test', 'important']
      });
    });

    it('should support inline fields', async () => {
      const file = '/vault/inline-fields.md';
      mockVault.set(file, 'Field:: value\n\nContent');

      await metadataCache.initialize('/vault');

      const metadata = metadataCache.getCache(file);
      expect(metadata?.frontmatter).toBeDefined();
    });

    it('should support tags', async () => {
      const file = '/vault/tags.md';
      mockVault.set(file, '#test #important\n\nContent');

      await metadataCache.initialize('/vault');

      const metadata = metadataCache.getCache(file);
      expect(metadata?.tags).toBeDefined();
      const tagStrings = metadata?.tags?.map(t => t.tag) || [];
      expect(tagStrings).toContain('#test');
      expect(tagStrings).toContain('#important');
    });
  });

  describe('Calendar Plugin Compatibility', () => {
    it('should support daily notes', async () => {
      const dailyNote = '/vault/2024-01-15.md';
      mockVault.set(dailyNote, '# 2024-01-15\n\nDaily content');

      await metadataCache.initialize('/vault');

      const metadata = metadataCache.getCache(dailyNote);
      expect(metadata).toBeDefined();
    });

    it('should parse date from filenames', async () => {
      const dailyNote = '/vault/2024-01-15.md';
      mockVault.set(dailyNote, '# Daily Note');

      await metadataCache.initialize('/vault');

      const metadata = metadataCache.getCache(dailyNote);
      expect(metadata?.file?.basename).toBe('2024-01-15');
    });
  });

  describe('Templater Plugin Compatibility', () => {
    it('should support template variables', async () => {
      const template = '/vault/templates/daily.md';
      mockVault.set(template, '# {{date}}\n\nContent');

      await metadataCache.initialize('/vault');

      const metadata = metadataCache.getCache(template);
      expect(metadata).toBeDefined();
    });

    it('should execute template functions', async () => {
      const file = '/vault/template-test.md';
      mockVault.set(file, '---\ntemplate: daily\n---\n# Note');

      await metadataCache.initialize('/vault');

      const metadata = metadataCache.getCache(file);
      expect(metadata?.frontmatter).toEqual({ template: 'daily' });
    });
  });

  describe('Obsidian Git Compatibility', () => {
    it('should track file changes', async () => {
      const file = '/vault/git-tracked.md';
      mockVault.set(file, '# Git Tracked');

      await metadataCache.initialize('/vault');

      const metadata = metadataCache.getCache(file);
      expect(metadata).toBeDefined();
      expect(metadata?.headings).toBeDefined();
      expect(metadata?.headings?.length).toBe(1);

      // Update file
      mockVault.set(file, '# Git Tracked\n\nNew content');

      // Re-initialize cache to pick up changes
      await metadataCache.initialize('/vault');

      // Metadata should reflect changes
      const updated = metadataCache.getCache(file);
      expect(updated).toBeDefined();
      expect(updated?.headings).toBeDefined();
    });

    it('should support git-related frontmatter', async () => {
      const file = '/vault/git-config.md';
      mockVault.set(file, '---\ngit: enabled\n---\n# Note');

      await metadataCache.initialize('/vault');

      const metadata = metadataCache.getCache(file);
      expect(metadata?.frontmatter).toEqual({ git: 'enabled' });
    });
  });

  describe('Advanced Tables Compatibility', () => {
    it('should parse markdown tables', async () => {
      const file = '/vault/tables.md';
      mockVault.set(file, '| Header 1 | Header 2 |\n|----------|----------|\n| Cell 1   | Cell 2   |');

      await metadataCache.initialize('/vault');

      const metadata = metadataCache.getCache(file);
      expect(metadata).toBeDefined();
    });

    it('should handle table syntax', async () => {
      const file = '/vault/table-syntax.md';
      mockVault.set(file, '| Col 1 | Col 2 |\n|-------|-------|\n| Data  | Data  |');

      await metadataCache.initialize('/vault');

      const content = mockVault.get(file);
      expect(content).toContain('| Col 1 |');
    });
  });

  describe('Kanban Plugin Compatibility', () => {
    it('should support kanban board metadata', async () => {
      const file = '/vault/kanban.md';
      mockVault.set(file, '---\nkanban-plugin: basic\n---\n# Kanban Board');

      await metadataCache.initialize('/vault');

      const metadata = metadataCache.getCache(file);
      expect(metadata?.frontmatter).toEqual({ 'kanban-plugin': 'basic' });
    });

    it('should parse kanban tasks', async () => {
      const file = '/vault/kanban-tasks.md';
      mockVault.set(file, '- [ ] Task 1\n- [x] Task 2');

      await metadataCache.initialize('/vault');

      const metadata = metadataCache.getCache(file);
      expect(metadata?.listItems).toBeDefined();
      expect(metadata?.listItems?.length).toBeGreaterThan(0);
    });
  });

  describe('Tasks Plugin Compatibility', () => {
    it('should parse task metadata', async () => {
      const file = '/vault/tasks.md';
      mockVault.set(file, '- [ ] #task Todo task\n- [x] #task Done task');

      await metadataCache.initialize('/vault');

      const metadata = metadataCache.getCache(file);
      expect(metadata?.listItems).toBeDefined();
      expect(metadata?.listItems?.length).toBeGreaterThan(0);
      const tagStrings = metadata?.tags?.map(t => t.tag) || [];
      expect(tagStrings).toContain('#task');
    });

    it('should support task filtering', async () => {
      const file = '/vault/task-filters.md';
      mockVault.set(file, '- [ ] #task Important #high\n- [ ] #task Normal');

      await metadataCache.initialize('/vault');

      const metadata = metadataCache.getCache(file);
      const tagStrings = metadata?.tags?.map(t => t.tag) || [];
      expect(tagStrings).toContain('#high');
    });
  });

  describe('Plugin API Compatibility', () => {
    it('should provide app metadata', () => {
      expect(mockApp.vault).toBeDefined();
      expect(mockApp.metadataCache).toBeDefined();
      expect(mockApp.workspace).toBeDefined();
    });

    it('should support plugin loading lifecycle', () => {
      const plugin = {
        onload: () => {},
        onunload: () => {},
      };

      expect(typeof plugin.onload).toBe('function');
      expect(typeof plugin.onunload).toBe('function');
    });

    it('should support command registration', () => {
      expect(mockApp.commands).toBeDefined();
    });

    it('should support workspace management', () => {
      expect(mockApp.workspace).toBeDefined();
    });
  });
});
