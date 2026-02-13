import { FileText } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { Editor } from './Editor';
import { DailyNotesNav } from './DailyNotesNav';
import { GraphView } from './GraphView';
import { FileEntry } from '../types';
import { searchStore } from '../stores/searchStore';
import { MutableRefObject } from 'react';

interface AppEditorAreaProps {
  activeTab: { path: string; content: string; name: string } | null;
  openTabs: Array<{ path: string; content: string; name: string }>;
  workspace: { hasVault: boolean } | null;
  vaultPath: string | null;
  isVaultReady: boolean;
  scrollToPosition: number | undefined;
  editorRefreshTrigger: MutableRefObject<number>;
  lineWrapping: boolean;
  readableLineLength: boolean;
  currentLine: number;
  currentColumn: number;
  onContentChange: (path: string, content: string) => void;
  onCursorPositionChange: (line: number, column: number) => void;
  onFileSelect: (path: string, newTab?: boolean) => void;
  onWikilinkQueue: (target: string, newTab: boolean) => void;
  onNoteOpen: (path: string, content: string) => Promise<void>;
}

const styles = {
  contentArea: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: 'var(--background-primary)',
    display: 'flex',
    flexDirection: 'column' as const,
  },
  emptyContent: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: 'var(--text-muted)',
    fontFamily: 'var(--font-interface)',
  },
  editorContainer: {
    flex: 1,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column' as const,
  },
};

export function AppEditorArea({
  activeTab,
  openTabs,
  workspace,
  vaultPath,
  isVaultReady,
  scrollToPosition,
  editorRefreshTrigger,
  lineWrapping,
  readableLineLength,
  currentLine,
  currentColumn,
  onContentChange,
  onCursorPositionChange,
  onFileSelect,
  onWikilinkQueue,
  onNoteOpen,
}: AppEditorAreaProps) {
  return (
    <main style={styles.contentArea}>
      {activeTab ? (
        <>
          {/* Daily Notes Navigation (vault only) */}
          {workspace?.hasVault && (
            <DailyNotesNav
              vaultPath={vaultPath}
              currentFilePath={activeTab.path}
              onNoteOpen={onNoteOpen}
            />
          )}
          <div style={styles.editorContainer}>
            {activeTab.path === '__graph__' ? (
              <GraphView
                files={openTabs.filter(t => t.path !== '__graph__')}
                onNodeClick={(path) => {
                  onFileSelect(path);
                }}
              />
            ) : (
              <Editor
                content={activeTab.content}
                onChange={onContentChange}
                onCursorPositionChange={(line, column) => {
                  onCursorPositionChange(line, column);
                }}
                vaultPath={vaultPath}
                currentFilePath={activeTab.path}
                scrollPosition={scrollToPosition}
                refreshTrigger={editorRefreshTrigger}
                lineWrapping={lineWrapping}
                readableLineLength={readableLineLength}
                onWikilinkClick={(target) => {
                  console.log('[AppEditorArea] onWikilinkClick called:', target);
                  if (!isVaultReady) {
                    console.log('[AppEditorArea] Vault not ready, queuing wikilink');
                    onWikilinkQueue(target, false);
                    return;
                  }
                  const path = searchStore.getFilePathByName(target);
                  console.log('[AppEditorArea] searchStore.getFilePathByName returned:', path);
                  if (path) {
                    onFileSelect(path);
                  } else {
                    console.warn('[AppEditorArea] Wikilink target not found:', target);
                  }
                }}
                onWikilinkCmdClick={(target) => {
                  if (!isVaultReady) {
                    onWikilinkQueue(target, true);
                    return;
                  }
                  const path = searchStore.getFilePathByName(target);
                  if (path) {
                    onFileSelect(path, true);
                  }
                }}
              />
            )}
          </div>
        </>
      ) : (
        <div style={styles.emptyContent}>
          <FileText size={48} style={{ marginBottom: '12px', opacity: 0.5 }} />
          <p>Select a file or create a new one</p>
        </div>
      )}
    </main>
  );
}
