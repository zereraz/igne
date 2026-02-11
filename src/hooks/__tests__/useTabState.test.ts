import { describe, it, expect } from 'vitest';
import {
  tabReducer,
  TabState,
  TabFile,
  getActiveTab,
  getActiveTabPath,
  isTabOpen,
  getTabByPath,
} from '../useTabState';

// Helper to create a tab
function createTab(path: string, options: Partial<TabFile> = {}): TabFile {
  const name = path.split('/').pop() || path;
  return {
    path,
    name,
    content: '',
    isDirty: false,
    isVirtual: false,
    ...options,
  };
}

// Helper to create state with tabs
function createState(tabs: TabFile[], activeIndex = 0): TabState {
  return { tabs, activeIndex };
}

describe('tabReducer', () => {
  describe('OPEN_TAB', () => {
    it('opens a new tab in empty state', () => {
      const state: TabState = { tabs: [], activeIndex: -1 };
      const result = tabReducer(state, {
        type: 'OPEN_TAB',
        path: '/test/file.md',
        name: 'file.md',
        content: 'hello',
      });

      expect(result.tabs).toHaveLength(1);
      expect(result.tabs[0].path).toBe('/test/file.md');
      expect(result.tabs[0].content).toBe('hello');
      expect(result.tabs[0].isDirty).toBe(false);
      expect(result.tabs[0].isVirtual).toBe(false);
      expect(result.activeIndex).toBe(0);
    });

    it('opens a virtual tab', () => {
      const state: TabState = { tabs: [], activeIndex: -1 };
      const result = tabReducer(state, {
        type: 'OPEN_TAB',
        path: '/test/Untitled-1.md',
        name: 'Untitled-1.md',
        content: '',
        isVirtual: true,
      });

      expect(result.tabs[0].isVirtual).toBe(true);
    });

    it('switches to existing tab instead of duplicating', () => {
      const state = createState([createTab('/test/file.md')], 0);
      const result = tabReducer(state, {
        type: 'OPEN_TAB',
        path: '/test/file.md',
        name: 'file.md',
        content: 'different content',
      });

      expect(result.tabs).toHaveLength(1);
      expect(result.activeIndex).toBe(0);
      // Content should NOT be updated when tab already open
      expect(result.tabs[0].content).toBe('');
    });

    it('adds tab at the end and makes it active', () => {
      const state = createState([
        createTab('/test/a.md'),
        createTab('/test/b.md'),
      ], 0);

      const result = tabReducer(state, {
        type: 'OPEN_TAB',
        path: '/test/c.md',
        name: 'c.md',
        content: '',
      });

      expect(result.tabs).toHaveLength(3);
      expect(result.tabs[2].path).toBe('/test/c.md');
      expect(result.activeIndex).toBe(2);
    });
  });

  describe('FORCE_OPEN_TAB', () => {
    it('always creates a new tab even if file exists', () => {
      const state = createState([createTab('/test/file.md', { content: 'old' })], 0);
      const result = tabReducer(state, {
        type: 'FORCE_OPEN_TAB',
        path: '/test/file.md',
        name: 'file.md',
        content: 'new',
      });

      expect(result.tabs).toHaveLength(2);
      expect(result.tabs[0].content).toBe('old');
      expect(result.tabs[1].content).toBe('new');
      expect(result.activeIndex).toBe(1);
    });
  });

  describe('CLOSE_TAB', () => {
    it('removes the only tab', () => {
      const state = createState([createTab('/test/file.md')], 0);
      const result = tabReducer(state, { type: 'CLOSE_TAB', path: '/test/file.md' });

      expect(result.tabs).toHaveLength(0);
      expect(result.activeIndex).toBe(-1);
    });

    it('closes active tab and selects next tab', () => {
      const state = createState([
        createTab('/test/a.md'),
        createTab('/test/b.md'),
        createTab('/test/c.md'),
      ], 1); // b.md is active

      const result = tabReducer(state, { type: 'CLOSE_TAB', path: '/test/b.md' });

      expect(result.tabs).toHaveLength(2);
      expect(result.tabs.map(t => t.path)).toEqual(['/test/a.md', '/test/c.md']);
      expect(result.activeIndex).toBe(1); // c.md is now active
    });

    it('closes last tab and selects previous', () => {
      const state = createState([
        createTab('/test/a.md'),
        createTab('/test/b.md'),
      ], 1); // b.md is active (last tab)

      const result = tabReducer(state, { type: 'CLOSE_TAB', path: '/test/b.md' });

      expect(result.tabs).toHaveLength(1);
      expect(result.activeIndex).toBe(0); // a.md is now active
    });

    it('closes tab before active - adjusts index', () => {
      const state = createState([
        createTab('/test/a.md'),
        createTab('/test/b.md'),
        createTab('/test/c.md'),
      ], 2); // c.md is active

      const result = tabReducer(state, { type: 'CLOSE_TAB', path: '/test/a.md' });

      expect(result.tabs).toHaveLength(2);
      expect(result.activeIndex).toBe(1); // c.md still active, but index shifted
      expect(result.tabs[result.activeIndex].path).toBe('/test/c.md');
    });

    it('closes tab after active - index stays same', () => {
      const state = createState([
        createTab('/test/a.md'),
        createTab('/test/b.md'),
        createTab('/test/c.md'),
      ], 0); // a.md is active

      const result = tabReducer(state, { type: 'CLOSE_TAB', path: '/test/c.md' });

      expect(result.tabs).toHaveLength(2);
      expect(result.activeIndex).toBe(0); // a.md still active
    });

    it('does nothing for non-existent tab', () => {
      const state = createState([createTab('/test/file.md')], 0);
      const result = tabReducer(state, { type: 'CLOSE_TAB', path: '/test/other.md' });

      expect(result).toBe(state); // Same reference, no change
    });
  });

  describe('CLOSE_ACTIVE_TAB', () => {
    it('closes the active tab', () => {
      const state = createState([
        createTab('/test/a.md'),
        createTab('/test/b.md'),
      ], 1);

      const result = tabReducer(state, { type: 'CLOSE_ACTIVE_TAB' });

      expect(result.tabs).toHaveLength(1);
      expect(result.tabs[0].path).toBe('/test/a.md');
    });

    it('does nothing when no active tab', () => {
      const state: TabState = { tabs: [], activeIndex: -1 };
      const result = tabReducer(state, { type: 'CLOSE_ACTIVE_TAB' });

      expect(result).toBe(state);
    });
  });

  describe('SET_ACTIVE', () => {
    it('sets active tab by path', () => {
      const state = createState([
        createTab('/test/a.md'),
        createTab('/test/b.md'),
      ], 0);

      const result = tabReducer(state, { type: 'SET_ACTIVE', path: '/test/b.md' });

      expect(result.activeIndex).toBe(1);
    });

    it('does nothing for non-existent path', () => {
      const state = createState([createTab('/test/a.md')], 0);
      const result = tabReducer(state, { type: 'SET_ACTIVE', path: '/test/b.md' });

      expect(result).toBe(state);
    });

    it('does nothing if already active', () => {
      const state = createState([createTab('/test/a.md')], 0);
      const result = tabReducer(state, { type: 'SET_ACTIVE', path: '/test/a.md' });

      expect(result).toBe(state);
    });
  });

  describe('UPDATE_CONTENT', () => {
    it('updates content and marks dirty', () => {
      const state = createState([createTab('/test/file.md', { content: 'old' })], 0);
      const result = tabReducer(state, {
        type: 'UPDATE_CONTENT',
        path: '/test/file.md',
        content: 'new content',
      });

      expect(result.tabs[0].content).toBe('new content');
      expect(result.tabs[0].isDirty).toBe(true);
    });

    it('does nothing if content unchanged', () => {
      const state = createState([createTab('/test/file.md', { content: 'same' })], 0);
      const result = tabReducer(state, {
        type: 'UPDATE_CONTENT',
        path: '/test/file.md',
        content: 'same',
      });

      expect(result).toBe(state);
    });

    it('does nothing for non-existent tab', () => {
      const state = createState([createTab('/test/a.md')], 0);
      const result = tabReducer(state, {
        type: 'UPDATE_CONTENT',
        path: '/test/b.md',
        content: 'new',
      });

      expect(result).toBe(state);
    });
  });

  describe('SYNC_CONTENT', () => {
    it('updates content without marking dirty', () => {
      const state = createState([createTab('/test/file.md', { content: 'old', isDirty: false })], 0);
      const result = tabReducer(state, {
        type: 'SYNC_CONTENT',
        path: '/test/file.md',
        content: 'new content',
      });

      expect(result.tabs[0].content).toBe('new content');
      expect(result.tabs[0].isDirty).toBe(false);
    });

    it('preserves dirty state when syncing', () => {
      const state = createState([createTab('/test/file.md', { content: 'old', isDirty: true })], 0);
      const result = tabReducer(state, {
        type: 'SYNC_CONTENT',
        path: '/test/file.md',
        content: 'new content',
      });

      expect(result.tabs[0].content).toBe('new content');
      expect(result.tabs[0].isDirty).toBe(true);
    });
  });

  describe('REPLACE_ACTIVE_TAB', () => {
    it('replaces active tab with new file', () => {
      const state = createState([
        createTab('/test/a.md', { content: 'a content' }),
        createTab('/test/b.md', { content: 'b content' }),
      ], 1);

      const result = tabReducer(state, {
        type: 'REPLACE_ACTIVE_TAB',
        path: '/test/c.md',
        name: 'c.md',
        content: 'c content',
      });

      expect(result.tabs).toHaveLength(2);
      expect(result.tabs[0].path).toBe('/test/a.md');
      expect(result.tabs[1].path).toBe('/test/c.md');
      expect(result.tabs[1].content).toBe('c content');
      expect(result.activeIndex).toBe(1);
    });

    it('creates new tab when no tabs exist', () => {
      const state: TabState = { tabs: [], activeIndex: -1 };
      const result = tabReducer(state, {
        type: 'REPLACE_ACTIVE_TAB',
        path: '/test/new.md',
        name: 'new.md',
        content: 'new content',
      });

      expect(result.tabs).toHaveLength(1);
      expect(result.tabs[0].path).toBe('/test/new.md');
      expect(result.activeIndex).toBe(0);
    });
  });

  describe('MARK_SAVED', () => {
    it('marks tab as not dirty', () => {
      const state = createState([createTab('/test/file.md', { isDirty: true })], 0);
      const result = tabReducer(state, { type: 'MARK_SAVED', path: '/test/file.md' });

      expect(result.tabs[0].isDirty).toBe(false);
    });

    it('does nothing if already clean', () => {
      const state = createState([createTab('/test/file.md', { isDirty: false })], 0);
      const result = tabReducer(state, { type: 'MARK_SAVED', path: '/test/file.md' });

      expect(result).toBe(state);
    });
  });

  describe('MATERIALIZE', () => {
    it('converts virtual tab to real tab with new path', () => {
      const state = createState([
        createTab('/vault/Untitled-1.md', { isVirtual: true, content: 'hello', isDirty: true }),
      ], 0);

      const result = tabReducer(state, {
        type: 'MATERIALIZE',
        oldPath: '/vault/Untitled-1.md',
        newPath: '/vault/Untitled-2.md',
        newName: 'Untitled-2.md',
      });

      expect(result.tabs[0].path).toBe('/vault/Untitled-2.md');
      expect(result.tabs[0].name).toBe('Untitled-2.md');
      expect(result.tabs[0].isVirtual).toBe(false);
      expect(result.tabs[0].isDirty).toBe(false);
    });
  });

  describe('RENAME_TAB', () => {
    it('renames a tab', () => {
      const state = createState([createTab('/test/old.md')], 0);
      const result = tabReducer(state, {
        type: 'RENAME_TAB',
        oldPath: '/test/old.md',
        newPath: '/test/new.md',
        newName: 'new.md',
      });

      expect(result.tabs[0].path).toBe('/test/new.md');
      expect(result.tabs[0].name).toBe('new.md');
    });
  });

  describe('RESTORE_WORKSPACE', () => {
    it('restores tabs and active index', () => {
      const state: TabState = { tabs: [], activeIndex: -1 };
      const tabs = [createTab('/test/a.md'), createTab('/test/b.md')];

      const result = tabReducer(state, {
        type: 'RESTORE_WORKSPACE',
        tabs,
        activeIndex: 1,
      });

      expect(result.tabs).toEqual(tabs);
      expect(result.activeIndex).toBe(1);
    });
  });
});

describe('Helper functions', () => {
  describe('getActiveTab', () => {
    it('returns active tab', () => {
      const tab = createTab('/test/file.md');
      const state = createState([tab], 0);

      expect(getActiveTab(state)).toBe(tab);
    });

    it('returns null when no active tab', () => {
      const state: TabState = { tabs: [], activeIndex: -1 };
      expect(getActiveTab(state)).toBeNull();
    });

    it('returns null when activeIndex out of bounds', () => {
      const state = createState([createTab('/test/a.md')], 5);
      expect(getActiveTab(state)).toBeNull();
    });
  });

  describe('getActiveTabPath', () => {
    it('returns active tab path', () => {
      const state = createState([createTab('/test/file.md')], 0);
      expect(getActiveTabPath(state)).toBe('/test/file.md');
    });

    it('returns null when no active tab', () => {
      const state: TabState = { tabs: [], activeIndex: -1 };
      expect(getActiveTabPath(state)).toBeNull();
    });
  });

  describe('isTabOpen', () => {
    it('returns true for open tab', () => {
      const state = createState([createTab('/test/file.md')], 0);
      expect(isTabOpen(state, '/test/file.md')).toBe(true);
    });

    it('returns false for closed tab', () => {
      const state = createState([createTab('/test/a.md')], 0);
      expect(isTabOpen(state, '/test/b.md')).toBe(false);
    });
  });

  describe('getTabByPath', () => {
    it('returns tab by path', () => {
      const tab = createTab('/test/file.md');
      const state = createState([tab], 0);

      expect(getTabByPath(state, '/test/file.md')).toBe(tab);
    });

    it('returns null for non-existent path', () => {
      const state = createState([createTab('/test/a.md')], 0);
      expect(getTabByPath(state, '/test/b.md')).toBeNull();
    });
  });
});

describe('Edge cases', () => {
  it('handles rapid close operations correctly', () => {
    // Simulate closing tabs 0, 1, 2 in sequence
    let state = createState([
      createTab('/test/a.md'),
      createTab('/test/b.md'),
      createTab('/test/c.md'),
    ], 0);

    // Close first tab (a.md)
    state = tabReducer(state, { type: 'CLOSE_TAB', path: '/test/a.md' });
    expect(state.tabs.map(t => t.path)).toEqual(['/test/b.md', '/test/c.md']);
    expect(state.activeIndex).toBe(0);
    expect(getActiveTabPath(state)).toBe('/test/b.md');

    // Close new first tab (b.md)
    state = tabReducer(state, { type: 'CLOSE_TAB', path: '/test/b.md' });
    expect(state.tabs.map(t => t.path)).toEqual(['/test/c.md']);
    expect(state.activeIndex).toBe(0);
    expect(getActiveTabPath(state)).toBe('/test/c.md');

    // Close last tab (c.md)
    state = tabReducer(state, { type: 'CLOSE_TAB', path: '/test/c.md' });
    expect(state.tabs).toHaveLength(0);
    expect(state.activeIndex).toBe(-1);
    expect(getActiveTabPath(state)).toBeNull();
  });

  it('handles opening same file multiple times', () => {
    let state: TabState = { tabs: [], activeIndex: -1 };

    // Open file
    state = tabReducer(state, {
      type: 'OPEN_TAB',
      path: '/test/file.md',
      name: 'file.md',
      content: 'v1',
    });
    expect(state.tabs).toHaveLength(1);

    // Open same file again
    state = tabReducer(state, {
      type: 'OPEN_TAB',
      path: '/test/file.md',
      name: 'file.md',
      content: 'v2',
    });
    expect(state.tabs).toHaveLength(1); // Still only 1 tab
    expect(state.tabs[0].content).toBe('v1'); // Content not replaced
  });

  it('handles materialization to existing path', () => {
    const state = createState([
      createTab('/vault/Untitled-1.md', { isVirtual: true, content: 'new file' }),
    ], 0);

    // Materialize to a different path (collision avoidance happened externally)
    const result = tabReducer(state, {
      type: 'MATERIALIZE',
      oldPath: '/vault/Untitled-1.md',
      newPath: '/vault/Untitled-2.md',
      newName: 'Untitled-2.md',
    });

    expect(result.tabs[0].path).toBe('/vault/Untitled-2.md');
    expect(result.tabs[0].isVirtual).toBe(false);
  });
});
