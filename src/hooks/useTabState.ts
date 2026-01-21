/**
 * useTabState - Clean tab management with no stale closures
 *
 * Key design decisions:
 * 1. Single state object (no separate activeTabPath state)
 * 2. Reducer pattern for atomic state transitions
 * 3. All operations are pure functions that can be tested
 * 4. Refs only for values needed in external callbacks (event listeners)
 */

import { useReducer, useRef, useCallback, useEffect } from 'react';

// Types
export interface TabFile {
  path: string;
  name: string;
  content: string;
  isDirty: boolean;
  isVirtual: boolean;
}

export interface TabState {
  tabs: TabFile[];
  activeIndex: number; // -1 means no active tab
}

// Action types
type TabAction =
  | { type: 'OPEN_TAB'; path: string; name: string; content: string; isVirtual?: boolean }
  | { type: 'FORCE_OPEN_TAB'; path: string; name: string; content: string; isVirtual?: boolean }
  | { type: 'CLOSE_TAB'; path: string }
  | { type: 'CLOSE_ACTIVE_TAB' }
  | { type: 'SET_ACTIVE'; path: string }
  | { type: 'SET_ACTIVE_INDEX'; index: number }
  | { type: 'UPDATE_CONTENT'; path: string; content: string }
  | { type: 'SYNC_CONTENT'; path: string; content: string }
  | { type: 'MARK_SAVED'; path: string }
  | { type: 'REPLACE_ACTIVE_TAB'; path: string; name: string; content: string }
  | { type: 'MATERIALIZE'; oldPath: string; newPath: string; newName: string }
  | { type: 'RENAME_TAB'; oldPath: string; newPath: string; newName: string }
  | { type: 'RESTORE_WORKSPACE'; tabs: TabFile[]; activeIndex: number };

// Initial state
const initialState: TabState = {
  tabs: [],
  activeIndex: -1,
};

// Pure reducer function - easy to test
export function tabReducer(state: TabState, action: TabAction): TabState {
  switch (action.type) {
    case 'OPEN_TAB': {
      const existingIndex = state.tabs.findIndex(t => t.path === action.path);

      if (existingIndex !== -1) {
        // Tab already open - just switch to it
        return {
          ...state,
          activeIndex: existingIndex,
        };
      }

      // Add new tab
      const newTab: TabFile = {
        path: action.path,
        name: action.name,
        content: action.content,
        isDirty: false,
        isVirtual: action.isVirtual ?? false,
      };

      return {
        tabs: [...state.tabs, newTab],
        activeIndex: state.tabs.length, // New tab is at the end
      };
    }

    case 'FORCE_OPEN_TAB': {
      // Always create a new tab, even if file is already open (for Cmd+click behavior)
      const newTab: TabFile = {
        path: action.path,
        name: action.name,
        content: action.content,
        isDirty: false,
        isVirtual: action.isVirtual ?? false,
      };

      return {
        tabs: [...state.tabs, newTab],
        activeIndex: state.tabs.length,
      };
    }

    case 'CLOSE_TAB': {
      const index = state.tabs.findIndex(t => t.path === action.path);
      if (index === -1) return state;

      const newTabs = state.tabs.filter((_, i) => i !== index);

      // Calculate new active index
      let newActiveIndex = state.activeIndex;
      if (newTabs.length === 0) {
        newActiveIndex = -1;
      } else if (index === state.activeIndex) {
        // Closing active tab - select adjacent
        newActiveIndex = Math.min(index, newTabs.length - 1);
      } else if (index < state.activeIndex) {
        // Closing tab before active - shift index down
        newActiveIndex = state.activeIndex - 1;
      }
      // If closing tab after active, index stays same

      return {
        tabs: newTabs,
        activeIndex: newActiveIndex,
      };
    }

    case 'CLOSE_ACTIVE_TAB': {
      if (state.activeIndex === -1) return state;
      const activePath = state.tabs[state.activeIndex]?.path;
      if (!activePath) return state;
      return tabReducer(state, { type: 'CLOSE_TAB', path: activePath });
    }

    case 'SET_ACTIVE': {
      const index = state.tabs.findIndex(t => t.path === action.path);
      if (index === -1 || index === state.activeIndex) return state;
      return { ...state, activeIndex: index };
    }

    case 'SET_ACTIVE_INDEX': {
      if (action.index < -1 || action.index >= state.tabs.length) return state;
      if (action.index === state.activeIndex) return state;
      return { ...state, activeIndex: action.index };
    }

    case 'UPDATE_CONTENT': {
      const index = state.tabs.findIndex(t => t.path === action.path);
      if (index === -1) return state;

      const tab = state.tabs[index];
      if (tab.content === action.content) return state;

      return {
        ...state,
        tabs: state.tabs.map((t, i) =>
          i === index ? { ...t, content: action.content, isDirty: true } : t
        ),
      };
    }

    case 'SYNC_CONTENT': {
      // Update content without marking dirty (used when loading from disk)
      const index = state.tabs.findIndex(t => t.path === action.path);
      if (index === -1) return state;

      const tab = state.tabs[index];
      if (tab.content === action.content) return state;

      return {
        ...state,
        tabs: state.tabs.map((t, i) =>
          i === index ? { ...t, content: action.content } : t
        ),
      };
    }

    case 'REPLACE_ACTIVE_TAB': {
      // Replace the active tab with a different file (Obsidian-like behavior)
      if (state.activeIndex === -1 || state.activeIndex >= state.tabs.length) {
        // No active tab, create new one
        const newTab: TabFile = {
          path: action.path,
          name: action.name,
          content: action.content,
          isDirty: false,
          isVirtual: false,
        };
        return {
          tabs: [newTab],
          activeIndex: 0,
        };
      }

      return {
        ...state,
        tabs: state.tabs.map((t, i) =>
          i === state.activeIndex
            ? { path: action.path, name: action.name, content: action.content, isDirty: false, isVirtual: false }
            : t
        ),
      };
    }

    case 'MARK_SAVED': {
      const index = state.tabs.findIndex(t => t.path === action.path);
      if (index === -1) return state;

      const tab = state.tabs[index];
      if (!tab.isDirty) return state;

      return {
        ...state,
        tabs: state.tabs.map((t, i) =>
          i === index ? { ...t, isDirty: false } : t
        ),
      };
    }

    case 'MATERIALIZE': {
      const index = state.tabs.findIndex(t => t.path === action.oldPath);
      if (index === -1) return state;

      return {
        ...state,
        tabs: state.tabs.map((t, i) =>
          i === index ? {
            ...t,
            path: action.newPath,
            name: action.newName,
            isDirty: false,
            isVirtual: false,
          } : t
        ),
      };
    }

    case 'RENAME_TAB': {
      const index = state.tabs.findIndex(t => t.path === action.oldPath);
      if (index === -1) return state;

      return {
        ...state,
        tabs: state.tabs.map((t, i) =>
          i === index ? { ...t, path: action.newPath, name: action.newName } : t
        ),
      };
    }

    case 'RESTORE_WORKSPACE': {
      return {
        tabs: action.tabs,
        activeIndex: action.activeIndex,
      };
    }

    default:
      return state;
  }
}

// Helper to get active tab from state
export function getActiveTab(state: TabState): TabFile | null {
  if (state.activeIndex === -1 || state.activeIndex >= state.tabs.length) {
    return null;
  }
  return state.tabs[state.activeIndex];
}

// Helper to get active tab path
export function getActiveTabPath(state: TabState): string | null {
  const tab = getActiveTab(state);
  return tab?.path ?? null;
}

// Helper to check if a path is open
export function isTabOpen(state: TabState, path: string): boolean {
  return state.tabs.some(t => t.path === path);
}

// Helper to get tab by path
export function getTabByPath(state: TabState, path: string): TabFile | null {
  return state.tabs.find(t => t.path === path) ?? null;
}

// Hook that wraps the reducer
export function useTabState() {
  const [state, dispatch] = useReducer(tabReducer, initialState);

  // Ref for accessing current state in callbacks (event listeners, etc.)
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Stable action creators that won't cause stale closures
  const actions = {
    openTab: useCallback((path: string, name: string, content: string, isVirtual = false) => {
      dispatch({ type: 'OPEN_TAB', path, name, content, isVirtual });
    }, []),

    forceOpenTab: useCallback((path: string, name: string, content: string, isVirtual = false) => {
      dispatch({ type: 'FORCE_OPEN_TAB', path, name, content, isVirtual });
    }, []),

    closeTab: useCallback((path: string) => {
      dispatch({ type: 'CLOSE_TAB', path });
    }, []),

    closeActiveTab: useCallback(() => {
      dispatch({ type: 'CLOSE_ACTIVE_TAB' });
    }, []),

    setActive: useCallback((path: string) => {
      dispatch({ type: 'SET_ACTIVE', path });
    }, []),

    setActiveIndex: useCallback((index: number) => {
      dispatch({ type: 'SET_ACTIVE_INDEX', index });
    }, []),

    updateContent: useCallback((path: string, content: string) => {
      dispatch({ type: 'UPDATE_CONTENT', path, content });
    }, []),

    syncContent: useCallback((path: string, content: string) => {
      dispatch({ type: 'SYNC_CONTENT', path, content });
    }, []),

    replaceActiveTab: useCallback((path: string, name: string, content: string) => {
      dispatch({ type: 'REPLACE_ACTIVE_TAB', path, name, content });
    }, []),

    markSaved: useCallback((path: string) => {
      dispatch({ type: 'MARK_SAVED', path });
    }, []),

    materialize: useCallback((oldPath: string, newPath: string, newName: string) => {
      dispatch({ type: 'MATERIALIZE', oldPath, newPath, newName });
    }, []),

    renameTab: useCallback((oldPath: string, newPath: string, newName: string) => {
      dispatch({ type: 'RENAME_TAB', oldPath, newPath, newName });
    }, []),

    restoreWorkspace: useCallback((tabs: TabFile[], activeIndex: number) => {
      dispatch({ type: 'RESTORE_WORKSPACE', tabs, activeIndex });
    }, []),
  };

  // Computed values
  const activeTab = getActiveTab(state);
  const activeTabPath = getActiveTabPath(state);

  // Ref accessor for use in event listeners (avoids stale closures)
  const getState = useCallback(() => stateRef.current, []);

  return {
    // State
    state,
    tabs: state.tabs,
    activeIndex: state.activeIndex,
    activeTab,
    activeTabPath,

    // Actions
    ...actions,

    // Ref accessor
    getState,
    stateRef,
  };
}
