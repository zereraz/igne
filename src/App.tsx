import { useState, useEffect, useCallback, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import {
  FolderOpen,
  FileText,
  FilePlus,
} from 'lucide-react';
import { FileTree } from './components/FileTree';
import { Editor } from './components/Editor';
import { TitleBar } from './components/TitleBar';
import { QuickSwitcher } from './components/QuickSwitcher';
import { BacklinksPanel } from './components/BacklinksPanel';
import { OutlinePanel } from './components/OutlinePanel';
import { TagsPanel } from './components/TagsPanel';
import { GraphView } from './components/GraphView';
import { ContextMenu } from './components/ContextMenu';
import { RenameDialog } from './components/RenameDialog';
import { TemplateInsertModal } from './components/TemplateInsertModal';
import { DailyNotesNav } from './components/DailyNotesNav';
import { StarredFilesPanel } from './components/StarredFilesPanel';
import { FileEntry, OpenFile } from './types';
import { searchStore } from './stores/searchStore';
import {
  openDailyNote,
  loadDailyNotesConfig,
} from './utils/dailyNotes';
import { renameFileWithLinkUpdates, getLinkUpdateCount } from './utils/fileManager';
import { loadTemplates, insertTemplateIntoFile, createFileFromTemplate } from './utils/templateLoader';

const styles = {
  app: {
    height: '100vh',
    display: 'flex',
    flexDirection: 'column' as const,
    backgroundColor: '#18181b',
    fontFamily: "'IBM Plex Mono', 'SF Mono', 'Courier New', monospace",
  },
  dirtyIndicator: {
    color: '#f59e0b',
  },
  // Premium button: sharp corners, 100ms transitions
  button: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    paddingLeft: '12px',
    paddingRight: '12px',
    paddingTop: '8px',
    paddingBottom: '8px',
    fontSize: '12px',
    fontFamily: "'IBM Plex Mono', 'SF Mono', 'Courier New', monospace",
    fontWeight: 500,
    backgroundColor: '#3f3f46',
    border: 'none',
    borderRadius: '2px',
    cursor: 'pointer',
    transition: 'background-color 100ms ease',
    color: 'white',
  },
  mainContent: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
  },
  sidebar: {
    width: '256px',
    backgroundColor: '#1f1f23',
    borderRight: '1px solid #3f3f46',
    overflowY: 'auto' as const,
    flexShrink: 0,
  },
  sidebarContent: {
    display: 'flex',
    flexDirection: 'column' as const,
    height: '100%',
    paddingTop: '8px',
  },
  sidebarHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: '12px',
    paddingRight: '12px',
    paddingTop: '8px',
    paddingBottom: '8px',
  },
  vaultName: {
    fontSize: '11px',
    color: '#71717a',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    fontWeight: 500,
    fontFamily: "'IBM Plex Mono', 'SF Mono', 'Courier New', monospace",
  },
  newFileButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 8px',
    fontSize: '11px',
    fontFamily: "'IBM Plex Mono', 'SF Mono', 'Courier New', monospace",
    backgroundColor: 'transparent',
    border: '1px solid #3f3f46',
    borderRadius: '2px',
    cursor: 'pointer',
    color: '#a1a1aa',
    transition: 'border-color 100ms ease, color 100ms ease',
  },
  loading: {
    paddingLeft: '12px',
    paddingRight: '12px',
    paddingTop: '16px',
    paddingBottom: '16px',
    color: '#71717a',
    fontSize: '12px',
    fontFamily: "'IBM Plex Mono', 'SF Mono', 'Courier New', monospace",
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: '#71717a',
    fontSize: '12px',
    padding: '16px',
    textAlign: 'center' as const,
    fontFamily: "'IBM Plex Mono', 'SF Mono', 'Courier New', monospace",
  },
  contentArea: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: '#18181b',
    display: 'flex',
    flexDirection: 'column' as const,
  },
  emptyContent: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: '#71717a',
    fontFamily: "'IBM Plex Mono', 'SF Mono', 'Courier New', monospace",
  },
  editorContainer: {
    flex: 1,
    overflow: 'hidden',
  },
};

const UNTITLED_BASE = 'Untitled';
const POLL_INTERVAL = 2000;

interface ContextMenuState {
  path: string;
  isFolder: boolean;
  x: number;
  y: number;
}

function App() {
  const [vaultPath, setVaultPath] = useState<string | null>(null);
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [openTabs, setOpenTabs] = useState<OpenFile[]>([]);
  const [activeTabPath, setActiveTabPath] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isVaultReady, setIsVaultReady] = useState(false);
  const [wikilinkQueue, setWikilinkQueue] = useState<Array<{target: string; newTab: boolean}>>([]);
  const [isQuickSwitcherOpen, setIsQuickSwitcherOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [renameTarget, setRenameTarget] = useState<{ path: string; isFolder: boolean } | null>(null);
  const [rightPanel, setRightPanel] = useState<'backlinks' | 'outline' | 'tags' | 'graph' | 'starred'>('backlinks');
  const [currentLine, setCurrentLine] = useState<number | undefined>(undefined);
  const [scrollToPosition, setScrollToPosition] = useState<number | undefined>(undefined);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [templates, setTemplates] = useState<Array<{ name: string; path: string }>>([]);
  const pollIntervalRef = useRef<number | null>(null);
  const autoSaveTimerRef = useRef<number | null>(null);

  // Helper to get the active tab
  const getActiveTab = useCallback(() => {
    return openTabs.find(tab => tab.path === activeTabPath) || null;
  }, [openTabs, activeTabPath]);

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

  // Start/stop file watching - only re-index if file count changes
  useEffect(() => {
    if (vaultPath) {
      let lastFileCount = 0;

      pollIntervalRef.current = window.setInterval(async () => {
        const entries = await invoke<FileEntry[]>('read_directory', { path: vaultPath });
        const currentFileCount = entries.length;

        // Only re-index if the number of files changed (external add/delete)
        if (currentFileCount !== lastFileCount) {
          setFiles(entries);
          await searchStore.indexFiles(vaultPath, entries);
          lastFileCount = currentFileCount;
        } else {
          setFiles(entries); // Still update the file tree
        }
      }, POLL_INTERVAL);

      return () => {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
      };
    }
  }, [vaultPath]);

  // Load directory when vault changes
  useEffect(() => {
    if (vaultPath) {
      setIsVaultReady(false); // Reset ready state
      setLoading(true);
      invoke<FileEntry[]>('read_directory', { path: vaultPath })
        .then(async (entries) => {
          setFiles(entries);
          await searchStore.indexFiles(vaultPath, entries);
          setIsVaultReady(true); // Mark vault as ready after indexing
        })
        .catch((e) => {
          console.error('Failed to load vault:', e);
          setIsVaultReady(true); // Still mark as ready even on error
        })
        .finally(() => setLoading(false));
    }
  }, [vaultPath]);

  // Process queued wikilink clicks when vault becomes ready
  useEffect(() => {
    if (isVaultReady && wikilinkQueue.length > 0) {
      // Process all queued clicks
      const queue = [...wikilinkQueue];
      setWikilinkQueue([]); // Clear queue first

      // Process each queued click
      queue.forEach(({ target, newTab }) => {
        const path = searchStore.getFilePathByName(target);
        if (path) {
          handleFileSelect(path, newTab);
        } else {
          console.warn(`[wikilink] Queued file not found: ${target}`);
        }
      });
    }
  }, [isVaultReady, wikilinkQueue]);

  const handleOpenVault = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: 'Select Vault Folder',
      });

      if (selected && typeof selected === 'string') {
        setVaultPath(selected);
        setOpenTabs([]);
        setActiveTabPath(null);
      }
    } catch (e) {
      console.error('Failed to open folder:', e);
    }
  };

  const handleNewFile = useCallback(async () => {
    if (!vaultPath) return;

    // Find the next available untitled filename
    const existingFiles = files.map(f => f.name);
    let counter = 0;
    let fileName: string;
    do {
      fileName = counter === 0 ? `${UNTITLED_BASE}.md` : `${UNTITLED_BASE} ${counter}.md`;
      counter++;
    } while (existingFiles.includes(fileName));

    const untitledPath = `${vaultPath}/${fileName}`;

    // Create the file immediately with empty content
    try {
      await invoke('write_file', { path: untitledPath, content: '' });
      openTab(untitledPath, fileName, '', false);
      // Refresh file list and re-index
      const entries = await invoke<FileEntry[]>('read_directory', { path: vaultPath });
      setFiles(entries);
      await searchStore.indexFiles(vaultPath, entries);
    } catch (e) {
      console.error(e);
    }
  }, [vaultPath, files, openTab]);

  const handleFileSelect = useCallback(
    (path: string, newTab = false) => {
      invoke<string>('read_file', { path })
        .then((content) => {
          const parts = path.split(/[/\\]/);
          const name = parts[parts.length - 1] || '';

          setOpenTabs(prev => {
            const existing = prev.find(tab => tab.path === path);

            // Cmd+click: always open a new tab even if file is already open
            if (newTab) {
              const newTabItem: OpenFile = { path, name, content, isDirty: false };
              return [...prev, newTabItem];
            }

            if (existing) {
              // Regular click: file already open - just switch to it and update content
              return prev.map(tab =>
                tab.path === path ? { ...tab, content } : tab
              );
            }

            // Replace active tab content
            if (prev.length === 0) {
              // No tabs yet, create first one
              const newTabItem: OpenFile = { path, name, content, isDirty: false };
              return [newTabItem];
            }

            // Replace the active tab's content
            return prev.map(tab =>
              tab.path === activeTabPath ? { path, name, content, isDirty: false } : tab
            );
          });

          // Set active tab path after state update
          setActiveTabPath(path);
        })
        .catch(console.error);
    },
    [activeTabPath]
  );

  const handleSave = useCallback(async () => {
    const activeTab = getActiveTab();
    if (!activeTab) return;

    try {
      await invoke('write_file', {
        path: activeTab.path,
        content: activeTab.content,
      });

      setOpenTabs(prev => prev.map(tab =>
        tab.path === activeTab.path ? { ...tab, isDirty: false } : tab
      ));

      if (vaultPath) {
        invoke<FileEntry[]>('read_directory', { path: vaultPath })
          .then(setFiles)
          .catch(console.error);
      }
    } catch (e) {
      console.error('Failed to save file:', e);
    }
  }, [getActiveTab, vaultPath]);

  // Auto-save: saves to file after 1 second of inactivity
  const autoSave = useCallback(async () => {
    const activeTab = getActiveTab();
    if (!activeTab) return;

    try {
      await invoke('write_file', {
        path: activeTab.path,
        content: activeTab.content,
      });
      setOpenTabs(prev => prev.map(tab =>
        tab.path === activeTab.path ? { ...tab, isDirty: false } : tab
      ));
      // Update search index with new content
      await searchStore.updateFile(activeTab.path, activeTab.content);
    } catch (e) {
      console.error('Auto-save failed:', e);
    }
  }, [getActiveTab]);

  const handleContentChange = useCallback((content: string) => {
    setOpenTabs(prev => prev.map(tab =>
      tab.path === activeTabPath ? { ...tab, content, isDirty: true } : tab
    ));
  }, [activeTabPath]);

  const handleFileNameChange = useCallback(async (newName: string) => {
    const activeTab = getActiveTab();
    if (!activeTab || !activeTab.path) return;

    // Add .md extension if not present
    if (!newName.endsWith('.md')) {
      newName += '.md';
    }

    // Don't do anything if name hasn't changed
    if (newName === activeTab.name) return;

    const parts = activeTab.path.split(/[/\\]/);
    parts.pop();
    const newPath = [...parts, newName].join('/');

    try {
      // Get link update count before renaming
      const linkUpdateCount = getLinkUpdateCount(activeTab.path);

      // Show confirmation if there are incoming links
      if (linkUpdateCount > 0) {
        const confirmed = window.confirm(
          `This will update ${linkUpdateCount} incoming link${linkUpdateCount > 1 ? 's' : ''} in other files. Continue?`
        );
        if (!confirmed) return;
      }

      // Use enhanced rename with link updates
      await renameFileWithLinkUpdates({
        oldPath: activeTab.path,
        newPath: newPath,
        updateLinks: true,
      });

      setOpenTabs(prev => prev.map(tab =>
        tab.path === activeTab.path ? { ...tab, path: newPath, name: newName } : tab
      ));

      // Refresh file list
      if (vaultPath) {
        invoke<FileEntry[]>('read_directory', { path: vaultPath })
          .then(setFiles)
          .catch(console.error);
      }
    } catch (error) {
      console.error('Failed to rename:', error);
      alert('Failed to rename file: ' + (error as Error).message);
    }
  }, [getActiveTab, vaultPath]);

  // Trigger auto-save when content changes (debounced by 1 second)
  useEffect(() => {
    const activeTab = getActiveTab();
    if (!activeTab) return;

    // Clear any pending auto-save
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    // Schedule auto-save after 1 second
    autoSaveTimerRef.current = window.setTimeout(() => {
      autoSave();
      autoSaveTimerRef.current = null;
    }, 1000);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [getActiveTab()?.content, autoSave, getActiveTab]);

  // Daily Notes handlers
  const handleOpenDailyNote = useCallback(async () => {
    if (!vaultPath) return;

    const config = await loadDailyNotesConfig();
    const { path: notePath, content } = await openDailyNote(new Date(), vaultPath, config);

    const parts = notePath.split(/[/\\]/);
    const name = parts[parts.length - 1] || '';

    // Refresh file list
    const entries = await invoke<FileEntry[]>('read_directory', { path: vaultPath });
    setFiles(entries);
    await searchStore.indexFiles(vaultPath, entries);

    openTab(notePath, name, content, false);
  }, [vaultPath, openTab]);

  // TODO: Implement daily notes navigation UI to use this function
  // const handleNavigateDailyNotes = useCallback(async (offset: number) => {
  //   if (!vaultPath) return;

  //   const activeTab = getActiveTab();
  //   if (!activeTab) {
  //     handleOpenDailyNote();
  //     return;
  //   }

  //   const config = await loadDailyNotesConfig();

  //   // Try to parse date from current file name
  //   const fileName = activeTab.name.replace('.md', '');
  //   const currentDate = parseDateFromFileName(fileName, config.format);

  //   const targetDate = currentDate || new Date();
  //   const newDate = new Date(targetDate);
  //   newDate.setDate(newDate.getDate() + offset);

  //   const { path: notePath, content } = await openDailyNote(newDate, vaultPath, config);

  //   const parts = notePath.split(/[/\\]/);
  //   const name = parts[parts.length - 1] || '';

  //   // Refresh file list
  //   const entries = await invoke<FileEntry[]>('read_directory', { path: vaultPath });
  //   setFiles(entries);
  //   await searchStore.indexFiles(vaultPath, entries);

  //   openTab(notePath, name, content, false);
  // }, [vaultPath, getActiveTab, handleOpenDailyNote, openTab]);

  const vaultName = vaultPath ? vaultPath.split(/[/\\]/).pop() : null;

  const handleContextMenu = useCallback((path: string, isFolder: boolean, x: number, y: number) => {
    setContextMenu({ path, isFolder, x, y });
  }, []);

  const handleRename = useCallback(() => {
    if (contextMenu) {
      setRenameTarget({ path: contextMenu.path, isFolder: contextMenu.isFolder });
      setContextMenu(null);
    }
  }, [contextMenu]);

  const handleRenameConfirm = useCallback(async (newName: string) => {
    if (!renameTarget) return;

    // Add .md extension if not a folder and no extension provided
    if (!renameTarget.isFolder && !newName.endsWith('.md')) {
      newName += '.md';
    }

    const parts = renameTarget.path.split(/[/\\]/);
    parts.pop();
    const newPath = [...parts, newName].join('/');

    try {
      // For files, use enhanced rename with link updates
      if (!renameTarget.isFolder) {
        // Get link update count before renaming
        const linkUpdateCount = getLinkUpdateCount(renameTarget.path);

        // Show confirmation if there are incoming links
        if (linkUpdateCount > 0) {
          const confirmed = window.confirm(
            `This will update ${linkUpdateCount} incoming link${linkUpdateCount > 1 ? 's' : ''} in other files. Continue?`
          );
          if (!confirmed) return;
        }

        // Use enhanced rename with link updates
        await renameFileWithLinkUpdates({
          oldPath: renameTarget.path,
          newPath: newPath,
          updateLinks: true,
        });
      } else {
        // For folders, use basic rename
        await invoke('rename_file', {
          oldPath: renameTarget.path,
          newPath: newPath,
        });

        // Remove old path from search index and re-index
        await searchStore.removeFile(renameTarget.path);
      }

      // Refresh file list and re-index
      if (vaultPath) {
        const entries = await invoke<FileEntry[]>('read_directory', { path: vaultPath });
        setFiles(entries);
        await searchStore.indexFiles(vaultPath, entries);
      }

      // Update open tabs if file was renamed
      setOpenTabs(prev => prev.map(tab => {
        if (tab.path === renameTarget.path) {
          const newParts = newPath.split(/[/\\]/);
          const name = newParts[newParts.length - 1] || '';
          return { ...tab, path: newPath, name };
        }
        return tab;
      }));
    } catch (error) {
      console.error('Failed to rename:', error);
    }

    setRenameTarget(null);
  }, [renameTarget, vaultPath]);

  const handleDelete = useCallback(async () => {
    if (!contextMenu) return;

    try {
      await invoke('delete_file', { path: contextMenu.path });

      // Remove from search index
      await searchStore.removeFile(contextMenu.path);

      // Refresh file list and re-index
      if (vaultPath) {
        const entries = await invoke<FileEntry[]>('read_directory', { path: vaultPath });
        setFiles(entries);
        await searchStore.indexFiles(vaultPath, entries);
      }

      // Close tab if file was deleted
      closeTab(contextMenu.path);
    } catch (error) {
      console.error('Failed to delete:', error);
    }

    setContextMenu(null);
  }, [contextMenu, vaultPath, closeTab]);

  const handleNewFileInFolder = useCallback(async () => {
    if (!contextMenu || !vaultPath) return;

    // Find the next available untitled filename
    const folderFiles = files.filter(f => f.path.startsWith(contextMenu.path));
    const existingFiles = folderFiles.map(f => f.name);
    let counter = 0;
    let fileName: string;
    do {
      fileName = counter === 0 ? `${UNTITLED_BASE}.md` : `${UNTITLED_BASE} ${counter}.md`;
      counter++;
    } while (existingFiles.includes(fileName));

    const newFilePath = `${contextMenu.path}/${fileName}`;

    // Create the file immediately with empty content
    try {
      await invoke('write_file', { path: newFilePath, content: '' });
      openTab(newFilePath, fileName, '', false);
      // Refresh file list and re-index
      const entries = await invoke<FileEntry[]>('read_directory', { path: vaultPath });
      setFiles(entries);
      await searchStore.indexFiles(vaultPath, entries);
    } catch (e) {
      console.error(e);
    }

    setContextMenu(null);
  }, [contextMenu, vaultPath, files]);

  const handleNewFolder = useCallback(async () => {
    if (!contextMenu) return;

    const folderName = prompt('Enter folder name:');
    if (!folderName) return;

    const newPath = `${contextMenu.path}/${folderName}`;

    try {
      await invoke('create_directory', { path: newPath });

      // Refresh file list
      if (vaultPath) {
        invoke<FileEntry[]>('read_directory', { path: vaultPath })
          .then(setFiles)
          .catch(console.error);
      }
    } catch (error) {
      console.error('Failed to create folder:', error);
    }

    setContextMenu(null);
  }, [contextMenu, vaultPath]);

  // Template handlers
  const handleInsertTemplate = useCallback(async (templatePath: string, fileName?: string) => {
    if (!vaultPath) return;

    try {
      if (fileName && fileName.trim()) {
        // Create new file from template
        const { path: newFilePath, content } = await createFileFromTemplate(
          templatePath,
          fileName.trim(),
          vaultPath
        );

        // Refresh file list
        const entries = await invoke<FileEntry[]>('read_directory', { path: vaultPath });
        setFiles(entries);
        await searchStore.indexFiles(vaultPath, entries);

        // Open the new file
        const parts = newFilePath.split(/[/\\]/);
        const name = parts[parts.length - 1] || '';
        openTab(newFilePath, name, content, false);
      } else {
        // Insert template into current file
        const activeTab = getActiveTab();
        if (!activeTab) {
          alert('Please open a file first to insert a template');
          setIsTemplateModalOpen(false);
          return;
        }

        // Get cursor position (we'll insert at end for now)
        const cursorPosition = activeTab.content.length;

        const { content: newContent } = await insertTemplateIntoFile(
          templatePath,
          activeTab.content,
          cursorPosition
        );

        // Update tab content
        setOpenTabs(prev => prev.map(tab =>
          tab.path === activeTab.path
            ? { ...tab, content: newContent, dirty: true }
            : tab
        ));

        // Update search index
        await searchStore.updateFile(activeTab.path, newContent);
      }

      setIsTemplateModalOpen(false);
    } catch (error) {
      console.error('Failed to insert template:', error);
      alert('Failed to insert template: ' + (error as Error).message);
    }
  }, [vaultPath, getActiveTab, openTab]);

  const handleOpenTemplateModal = useCallback(async () => {
    if (!vaultPath) return;

    // Load templates
    const loadedTemplates = await loadTemplates(vaultPath);
    setTemplates(loadedTemplates);

    setIsTemplateModalOpen(true);
  }, [vaultPath]);

  // Keyboard shortcut for save and quick switcher
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'p') {
        e.preventDefault();
        setIsQuickSwitcherOpen(prev => !prev);
      } else if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        handleOpenDailyNote();
      } else if ((e.metaKey || e.ctrlKey) && e.key === 't') {
        e.preventDefault();
        handleOpenTemplateModal();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave, handleOpenDailyNote, handleOpenTemplateModal]);

  const handleDrop = useCallback(async (sourcePath: string, targetPath: string) => {
    const parts = sourcePath.split(/[/\\]/);
    const fileName = parts.pop() || sourcePath;
    const destination = `${targetPath}/${fileName}`;

    try {
      await invoke('move_file', {
        source: sourcePath,
        destination: destination,
      });

      // Refresh file list
      if (vaultPath) {
        invoke<FileEntry[]>('read_directory', { path: vaultPath })
          .then(setFiles)
          .catch(console.error);
      }

      // Update open tabs if file was moved
      setOpenTabs(prev => prev.map(tab => {
        if (tab.path === sourcePath) {
          return { ...tab, path: destination };
        }
        return tab;
      }));
    } catch (error) {
      console.error('Failed to move file:', error);
    }
  }, [vaultPath]);

  return (
    <div style={styles.app}>
      {/* Custom Title Bar with Tabs */}
      <TitleBar
        openTabs={openTabs}
        activeTabPath={activeTabPath}
        onTabClick={setActiveTabPath}
        onTabClose={closeTab}
        onFileNameChange={handleFileNameChange}
      />

      {/* Main Content */}
      <div style={styles.mainContent}>
        {/* Sidebar */}
        <aside style={styles.sidebar}>
          {vaultPath ? (
            <div style={styles.sidebarContent}>
              <div style={styles.sidebarHeader}>
                <div style={styles.vaultName}>{vaultName}</div>
                <button
                  data-testid="create-file-button"
                  onClick={handleNewFile}
                  style={{
                    ...styles.newFileButton,
                    padding: '4px',
                    width: '24px',
                    height: '24px',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#a78bfa';
                    e.currentTarget.style.color = '#e4e4e7';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#3f3f46';
                    e.currentTarget.style.color = '#a1a1aa';
                  }}
                  title="New File"
                >
                  <FilePlus size={12} />
                </button>
              </div>
              {loading ? (
                <div style={styles.loading}>Loading...</div>
              ) : (
                <FileTree
                  entries={files}
                  selectedPath={activeTabPath ?? null}
                  onSelect={handleFileSelect}
                  onContextMenu={handleContextMenu}
                  onDrop={handleDrop}
                />
              )}
              {/* Open Vault button at bottom */}
              <div
                style={{
                  marginTop: 'auto',
                  padding: '6px 8px',
                  borderTop: '1px solid #3f3f46',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  userSelect: 'none',
                  WebkitUserSelect: 'none',
                }}
                onDoubleClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  // Clear any existing selection
                  const selection = window.getSelection();
                  if (selection) {
                    selection.removeAllRanges();
                  }
                }}
                onMouseDown={(e) => {
                  // Prevent selection on mousedown too
                  if (e.detail > 1) {
                    e.preventDefault();
                    e.stopPropagation();
                  }
                }}
              >
                <FolderOpen size={12} style={{ color: '#71717a', flexShrink: 0, pointerEvents: 'none' }} />
                {vaultName && (
                  <span
                    style={{
                      color: '#71717a',
                      fontSize: '10px',
                      fontFamily: "'IBM Plex Mono', monospace",
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      flex: 1,
                      userSelect: 'none',
                      WebkitUserSelect: 'none',
                      pointerEvents: 'none',
                    }}
                  >
                    {vaultName}
                  </span>
                )}
                <button
                  onClick={handleOpenVault}
                  style={{
                    ...styles.newFileButton,
                    padding: '4px',
                    width: '20px',
                    height: '20px',
                    flexShrink: 0,
                    userSelect: 'none',
                    WebkitUserSelect: 'none',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#a78bfa';
                    e.currentTarget.style.color = '#e4e4e7';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#3f3f46';
                    e.currentTarget.style.color = '#a1a1aa';
                  }}
                  title="Change Vault"
                  onMouseDown={(e) => {
                    if (e.detail > 1) {
                      e.preventDefault();
                      e.stopPropagation();
                    }
                  }}
                >
                  <FolderOpen size={10} style={{ pointerEvents: 'none' }} />
                </button>
              </div>
            </div>
          ) : (
            <div style={styles.emptyState}>
              <FolderOpen size={32} style={{ marginBottom: '8px', opacity: 0.5 }} />
              <p>No vault open</p>
              <button
                onClick={handleOpenVault}
                style={{
                  marginTop: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 16px',
                  fontSize: '12px',
                  fontFamily: "'IBM Plex Mono', monospace",
                  backgroundColor: '#a78bfa',
                  border: 'none',
                  borderRadius: '2px',
                  cursor: 'pointer',
                  color: 'white',
                }}
              >
                <FolderOpen size={14} />
                Open Vault
              </button>
            </div>
          )}
        </aside>

        {/* Content Area */}
        <main style={styles.contentArea}>
          {(() => {
            const activeTab = getActiveTab();
            return activeTab ? (
              <>
                {/* Daily Notes Navigation */}
                <DailyNotesNav
                  vaultPath={vaultPath}
                  currentFilePath={activeTab.path}
                  onNoteOpen={async (path, content) => {
                    const parts = path.split(/[/\\]/);
                    const name = parts[parts.length - 1] || '';

                    // Refresh file list and re-index
                    const entries = await invoke<FileEntry[]>('read_directory', { path: vaultPath });
                    setFiles(entries);
                    await searchStore.indexFiles(vaultPath, entries);

                    openTab(path, name, content, false);
                  }}
                />
                <div style={styles.editorContainer}>
                  <Editor
                    content={activeTab.content}
                    onChange={handleContentChange}
                    onCursorPositionChange={(line) => setCurrentLine(line)}
                    vaultPath={vaultPath}
                    currentFilePath={activeTab.path}
                    scrollPosition={scrollToPosition}
                    onWikilinkClick={(target) => {
                      if (!isVaultReady) {
                        // Queue the click for when vault is ready
                        setWikilinkQueue(prev => [...prev, { target, newTab: false }]);
                        return;
                      }
                      const path = searchStore.getFilePathByName(target);
                      if (path) {
                        handleFileSelect(path); // Regular click: switch to existing tab or open in current tab
                      }
                    }}
                    onWikilinkCmdClick={(target) => {
                      if (!isVaultReady) {
                        // Queue the click for when vault is ready
                        setWikilinkQueue(prev => [...prev, { target, newTab: true }]);
                        return;
                      }
                      const path = searchStore.getFilePathByName(target);
                      if (path) {
                        handleFileSelect(path, true); // Cmd+Click: open in new tab
                      }
                    }}
                  />
                </div>
                <div
                  style={{
                    width: '256px',
                    backgroundColor: '#1f1f23',
                    borderLeft: '1px solid #3f3f46',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                  }}
                >
                  {/* Panel Toggle */}
                  <div
                    style={{
                      display: 'flex',
                      borderBottom: '1px solid #27272a',
                    }}
                  >
                    <button
                      onClick={() => setRightPanel('backlinks')}
                      style={{
                        flex: 1,
                        padding: '0.5rem',
                        backgroundColor: rightPanel === 'backlinks' ? '#27272a' : 'transparent',
                        border: 'none',
                        color: rightPanel === 'backlinks' ? '#a78bfa' : '#71717a',
                        cursor: 'pointer',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}
                    >
                      Backlinks
                    </button>
                    <button
                      onClick={() => setRightPanel('outline')}
                      style={{
                        flex: 1,
                        padding: '0.5rem',
                        backgroundColor: rightPanel === 'outline' ? '#27272a' : 'transparent',
                        border: 'none',
                        color: rightPanel === 'outline' ? '#a78bfa' : '#71717a',
                        cursor: 'pointer',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}
                    >
                      Outline
                    </button>
                    <button
                      onClick={() => setRightPanel('tags')}
                      style={{
                        flex: 1,
                        padding: '0.5rem',
                        backgroundColor: rightPanel === 'tags' ? '#27272a' : 'transparent',
                        border: 'none',
                        color: rightPanel === 'tags' ? '#a78bfa' : '#71717a',
                        cursor: 'pointer',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}
                    >
                      Tags
                    </button>
                    <button
                      onClick={() => setRightPanel('graph')}
                      style={{
                        flex: 1,
                        padding: '0.5rem',
                        backgroundColor: rightPanel === 'graph' ? '#27272a' : 'transparent',
                        border: 'none',
                        color: rightPanel === 'graph' ? '#a78bfa' : '#71717a',
                        cursor: 'pointer',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}
                    >
                      Graph
                    </button>
                    <button
                      onClick={() => setRightPanel('starred')}
                      style={{
                        flex: 1,
                        padding: '0.5rem',
                        backgroundColor: rightPanel === 'starred' ? '#27272a' : 'transparent',
                        border: 'none',
                        color: rightPanel === 'starred' ? '#a78bfa' : '#71717a',
                        cursor: 'pointer',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}
                    >
                      Starred
                    </button>
                  </div>
                  {/* Panel Content */}
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    {rightPanel === 'outline' ? (
                      <OutlinePanel
                        key={activeTab.path}
                        content={activeTab.content}
                        currentLine={currentLine}
                        onHeadingClick={(position) => {
                          setScrollToPosition(position);
                        }}
                      />
                    ) : rightPanel === 'tags' ? (
                      <TagsPanel
                        files={openTabs}
                        onTagClick={(tag) => {
                          // Open quick switcher with tag search
                          setIsQuickSwitcherOpen(true);
                          console.log('Search for tag:', tag);
                        }}
                      />
                    ) : rightPanel === 'graph' ? (
                      <GraphView
                        files={openTabs}
                        onNodeClick={handleFileSelect}
                      />
                    ) : rightPanel === 'starred' ? (
                      <StarredFilesPanel
                        vaultPath={vaultPath}
                        currentFilePath={activeTab.path}
                        onFileSelect={handleFileSelect}
                        onRefresh={async () => {
                          if (vaultPath) {
                            const entries = await invoke<FileEntry[]>('read_directory', { path: vaultPath });
                            setFiles(entries);
                          }
                        }}
                      />
                    ) : (
                      <BacklinksPanel
                        key={activeTab.path}
                        currentFilePath={activeTab.path}
                        onBacklinkClick={handleFileSelect}
                        data-testid="backlinks-panel"
                      />
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div style={styles.emptyContent}>
                <FileText size={48} style={{ marginBottom: '12px', opacity: 0.5 }} />
                <p>Select a file or create a new one</p>
              </div>
            );
          })()}
        </main>
      </div>

      {/* Quick Switcher */}
      <QuickSwitcher
        isOpen={isQuickSwitcherOpen}
        onClose={() => setIsQuickSwitcherOpen(false)}
        onSelectFile={handleFileSelect}
      />

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          isFolder={contextMenu.isFolder}
          onClose={() => setContextMenu(null)}
          onRename={handleRename}
          onDelete={handleDelete}
          onNewNote={handleNewFileInFolder}
          onNewFolder={handleNewFolder}
        />
      )}

      {/* Rename Dialog */}
      {renameTarget && (
        <RenameDialog
          currentName={renameTarget.path.split(/[/\\]/).pop() || ''}
          onClose={() => setRenameTarget(null)}
          onRename={handleRenameConfirm}
          data-testid="rename-dialog"
        />
      )}

      {/* Template Insert Modal */}
      {isTemplateModalOpen && vaultPath && (
        <TemplateInsertModal
          templates={templates}
          onInsertTemplate={handleInsertTemplate}
          onClose={() => setIsTemplateModalOpen(false)}
        />
      )}
    </div>
  );
}

export default App;
