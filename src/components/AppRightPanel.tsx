import { Link2, List, Hash, Network, Star, X } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { BacklinksPanel } from './BacklinksPanel';
import { OutlinePanel } from './OutlinePanel';
import { TagsPanel } from './TagsPanel';
import { LocalGraphView } from './LocalGraphView';
import { StarredFilesPanel } from './StarredFilesPanel';
import { FileEntry } from '../types';

interface AppRightPanelProps {
  activeTab: { path: string; content: string; name: string };
  openTabs: Array<{ path: string; content: string; name: string }>;
  workspace: { hasVault: boolean } | null;
  vaultPath: string | null;
  rightPanel: 'backlinks' | 'outline' | 'tags' | 'graph' | 'starred';
  currentLine: number;
  onRightPanelChange: (panel: 'backlinks' | 'outline' | 'tags' | 'graph' | 'starred') => void;
  onClose: () => void;
  onScrollToPosition: (pos: number) => void;
  onFileSelect: (path: string, newTab?: boolean) => void;
  onOpenQuickSwitcher: () => void;
  onOpenFullGraph: () => void;
  onRefreshFiles: () => Promise<void>;
}

export function AppRightPanel({
  activeTab,
  openTabs,
  workspace,
  vaultPath,
  rightPanel,
  currentLine,
  onRightPanelChange,
  onClose,
  onScrollToPosition,
  onFileSelect,
  onOpenQuickSwitcher,
  onOpenFullGraph,
  onRefreshFiles,
}: AppRightPanelProps) {
  return (
    <div
      style={{
        backgroundColor: 'var(--background-secondary)',
        borderLeft: '1px solid var(--background-modifier-border)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        height: '100%',
      }}
    >
      {/* Panel Toggle - Icon tabs + close */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '2px',
          padding: '6px 8px',
          borderBottom: '1px solid var(--background-modifier-border)',
        }}
      >
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', gap: '2px' }}>
        {[
          { id: 'backlinks' as const, label: 'Backlinks', icon: <Link2 size={14} /> },
          { id: 'outline' as const, label: 'Outline', icon: <List size={14} /> },
          { id: 'tags' as const, label: 'Tags', icon: <Hash size={14} /> },
          { id: 'graph' as const, label: 'Graph', icon: <Network size={14} /> },
          ...(workspace?.hasVault ? [{ id: 'starred' as const, label: 'Starred', icon: <Star size={14} /> }] : []),
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => onRightPanelChange(tab.id)}
            title={tab.label}
            style={{
              width: '28px',
              height: '28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: rightPanel === tab.id ? 'var(--background-modifier-hover)' : 'transparent',
              border: 'none',
              borderRadius: '4px',
              color: rightPanel === tab.id ? 'var(--color-accent)' : 'var(--text-faint)',
              cursor: 'pointer',
              transition: 'background 100ms ease, color 100ms ease',
            }}
            onMouseEnter={(e) => {
              if (rightPanel !== tab.id) {
                e.currentTarget.style.backgroundColor = 'var(--background-modifier-hover)';
                e.currentTarget.style.color = 'var(--text-muted)';
              }
            }}
            onMouseLeave={(e) => {
              if (rightPanel !== tab.id) {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = 'var(--text-faint)';
              }
            }}
          >
            {tab.icon}
          </button>
        ))}
        </div>
        <button
          onClick={onClose}
          title="Close panel"
          style={{
            width: '28px',
            height: '28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'transparent',
            border: 'none',
            borderRadius: '4px',
            color: 'var(--text-faint)',
            cursor: 'pointer',
            flexShrink: 0,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--background-modifier-hover)';
            e.currentTarget.style.color = 'var(--text-muted)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = 'var(--text-faint)';
          }}
        >
          <X size={14} />
        </button>
      </div>
      {/* Panel Content */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {rightPanel === 'outline' ? (
          <OutlinePanel
            key={activeTab.path}
            content={activeTab.content}
            currentLine={currentLine}
            onHeadingClick={(position, _headingText) => {
              onScrollToPosition(position);
            }}
          />
        ) : rightPanel === 'tags' ? (
          <TagsPanel
            files={openTabs}
            onTagClick={(tag) => {
              onOpenQuickSwitcher();
              console.log('Search for tag:', tag);
            }}
          />
        ) : rightPanel === 'graph' ? (
          <LocalGraphView
            files={openTabs}
            currentFilePath={activeTab.path}
            onNodeClick={onFileSelect}
            onOpenFullGraph={onOpenFullGraph}
            depth={2}
          />
        ) : rightPanel === 'starred' ? (
          <StarredFilesPanel
            vaultPath={vaultPath}
            currentFilePath={activeTab.path}
            onFileSelect={onFileSelect}
            onRefresh={onRefreshFiles}
          />
        ) : (
          <BacklinksPanel
            key={activeTab.path}
            currentFilePath={activeTab.path}
            onBacklinkClick={onFileSelect}
            data-testid="backlinks-panel"
          />
        )}
      </div>
    </div>
  );
}
