/**
 * useTabManager Hook
 *
 * Manages tab state and operations including opening, closing,
 * and updating tabs.
 */

import { useState, useCallback } from 'react';
import { OpenFile } from '../types';

export function useTabManager() {
  const [openTabs, setOpenTabs] = useState<OpenFile[]>([]);
  const [activeTabPath, setActiveTabPath] = useState<string | null>(null);

  // Open a file in a tab (or switch to it if already open)
  const openTab = useCallback((path: string, name: string, content: string, isDirty = false) => {
    setOpenTabs(prev => {
      const existing = prev.find(tab => tab.path === path);
      if (existing) {
        // File already open, just switch to it and update content if changed
        setActiveTabPath(path);
        return prev.map(tab =>
          tab.path === path ? { ...tab, content, isDirty: tab.isDirty || isDirty } : tab
        );
      }
      // Open new tab
      const newTab: OpenFile = { path, name, content, isDirty };
      return [...prev, newTab];
    });
    setActiveTabPath(path);
  }, []);

  // Close a tab
  const closeTab = useCallback((path: string) => {
    setOpenTabs(prev => {
      const index = prev.findIndex(tab => tab.path === path);
      if (index === -1) return prev;

      const newTabs = prev.filter(tab => tab.path !== path);

      // If closing the active tab, switch to another
      if (path === activeTabPath) {
        if (newTabs.length > 0) {
          // Try to select the tab to the right, or the one to the left
          const newIndex = Math.min(index, newTabs.length - 1);
          setActiveTabPath(newTabs[newIndex].path);
        } else {
          setActiveTabPath(null);
        }
      }

      return newTabs;
    });
  }, [activeTabPath]);

  // Get the active tab
  const getActiveTab = useCallback(() => {
    return openTabs.find(tab => tab.path === activeTabPath) || null;
  }, [openTabs, activeTabPath]);

  // Update tab content (for dirty state or content changes)
  const updateTabContent = useCallback((path: string, updates: Partial<OpenFile>) => {
    setOpenTabs(prev => prev.map(tab =>
      tab.path === path ? { ...tab, ...updates } : tab
    ));
  }, []);

  // Set tabs directly (for workspace restoration)
  const setTabs = useCallback((tabs: OpenFile[]) => {
    setOpenTabs(tabs);
  }, []);

  return {
    openTabs,
    activeTabPath,
    setActiveTabPath,
    openTab,
    closeTab,
    getActiveTab,
    updateTabContent,
    setTabs,
  };
}
