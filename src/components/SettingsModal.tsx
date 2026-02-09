import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { AppearanceSettingsTab } from './AppearanceSettingsTab';
import { EditorSettingsTab } from './EditorSettingsTab';
import { PluginsTab } from './PluginsTab';
import type { VaultSettings, AppearanceSettings } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  vaultSettings: Partial<VaultSettings>;
  appearanceSettings: AppearanceSettings;
  onUpdateAppearance: (settings: Partial<AppearanceSettings>) => void;
  vaultPath: string | null;
  lineWrapping: boolean;
  onLineWrappingChange: (enabled: boolean) => void;
  readableLineLength: boolean;
  onReadableLineLengthChange: (enabled: boolean) => void;
}

type SettingsTab = 'appearance' | 'editor' | 'plugins';

export function SettingsModal({
  isOpen,
  onClose,
  vaultSettings,
  appearanceSettings,
  onUpdateAppearance,
  vaultPath,
  lineWrapping,
  onLineWrappingChange,
  readableLineLength,
  onReadableLineLengthChange,
}: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('appearance');

  // Suppress unused variable warning
  void vaultSettings;

  // Close modal on ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!isOpen) return null;

  const tabs: { id: SettingsTab; label: string }[] = [
    { id: 'appearance', label: 'Appearance' },
    { id: 'editor', label: 'Editor' },
    { id: 'plugins', label: 'Plugins' },
  ];

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'var(--background-primary-alt)',
          border: '1px solid var(--background-modifier-border)',
          borderRadius: '4px',
          width: '800px',
          maxWidth: '90vw',
          height: '600px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid var(--background-modifier-border)',
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: '16px',
              fontWeight: 600,
              color: 'var(--text-normal)',
              fontFamily: 'var(--font-interface)',
            }}
          >
            Settings
          </h2>
          <button
            onClick={onClose}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '28px',
              height: '28px',
              border: 'none',
              background: 'transparent',
              color: 'var(--text-faint)',
              cursor: 'pointer',
              borderRadius: '2px',
              padding: '0',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--background-modifier-hover)';
              e.currentTarget.style.color = 'var(--text-normal)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = 'var(--text-faint)';
            }}
            title="Close (Esc)"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Sidebar */}
          <div
            style={{
              width: '180px',
              borderRight: '1px solid var(--background-modifier-border)',
              padding: '8px 0',
              overflowY: 'auto',
            }}
          >
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  width: '100%',
                  padding: '8px 16px',
                  border: 'none',
                  background: activeTab === tab.id ? 'var(--background-secondary)' : 'transparent',
                  color: activeTab === tab.id ? 'var(--color-accent)' : 'var(--text-muted)',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 500,
                  textAlign: 'left',
                  fontFamily: 'var(--font-interface)',
                  transition: 'background-color 100ms ease',
                }}
                onMouseEnter={(e) => {
                  if (activeTab !== tab.id) {
                    e.currentTarget.style.backgroundColor = 'var(--background-modifier-hover)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeTab !== tab.id) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '24px',
            }}
          >
            {activeTab === 'appearance' && (
              <AppearanceSettingsTab
                settings={appearanceSettings}
                onChange={onUpdateAppearance}
                vaultPath={vaultPath}
              />
            )}
            {activeTab === 'editor' && (
              <EditorSettingsTab
                lineWrapping={lineWrapping}
                onLineWrappingChange={onLineWrappingChange}
                readableLineLength={readableLineLength}
                onReadableLineLengthChange={onReadableLineLengthChange}
              />
            )}
            {activeTab === 'plugins' && <PluginsTab vaultPath={vaultPath} />}
          </div>
        </div>
      </div>
    </div>
  );
}
