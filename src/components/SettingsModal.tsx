import { useState } from 'react';
import { X } from 'lucide-react';
import { AppearanceSettingsTab } from './AppearanceSettingsTab';
import type { VaultSettings, AppearanceSettings } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  vaultSettings: Partial<VaultSettings>;
  appearanceSettings: AppearanceSettings;
  onUpdateAppearance: (settings: Partial<AppearanceSettings>) => void;
  vaultPath: string | null;
}

type SettingsTab = 'general' | 'appearance' | 'editor' | 'hotkeys';

export function SettingsModal({
  isOpen,
  onClose,
  vaultSettings,
  appearanceSettings,
  onUpdateAppearance,
  vaultPath,
}: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('appearance');

  if (!isOpen) return null;

  const tabs: { id: SettingsTab; label: string }[] = [
    { id: 'general', label: 'General' },
    { id: 'appearance', label: 'Appearance' },
    { id: 'editor', label: 'Editor' },
    { id: 'hotkeys', label: 'Hotkeys' },
  ];

  const fontFamily = '"IBM Plex Mono", monospace';

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
          backgroundColor: '#1f1f23',
          border: '1px solid #3f3f46',
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
            borderBottom: '1px solid #3f3f46',
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: '16px',
              fontWeight: 600,
              color: '#e4e4e7',
              fontFamily,
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
              color: '#71717a',
              cursor: 'pointer',
              borderRadius: '2px',
              padding: '0',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#3f3f46';
              e.currentTarget.style.color = '#e4e4e7';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#71717a';
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
              borderRight: '1px solid #3f3f46',
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
                  background: activeTab === tab.id ? '#27272a' : 'transparent',
                  color: activeTab === tab.id ? '#a78bfa' : '#a1a1aa',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 500,
                  textAlign: 'left',
                  fontFamily,
                  transition: 'background-color 100ms ease',
                }}
                onMouseEnter={(e) => {
                  if (activeTab !== tab.id) {
                    e.currentTarget.style.backgroundColor = '#27272a';
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
            {activeTab === 'general' && (
              <div
                style={{
                  color: '#71717a',
                  fontSize: '13px',
                  fontFamily,
                }}
              >
                <p>General settings coming soon...</p>
              </div>
            )}
            {activeTab === 'editor' && (
              <div
                style={{
                  color: '#71717a',
                  fontSize: '13px',
                  fontFamily,
                }}
              >
                <p>Editor settings coming soon...</p>
              </div>
            )}
            {activeTab === 'hotkeys' && (
              <div
                style={{
                  color: '#71717a',
                  fontSize: '13px',
                  fontFamily,
                }}
              >
                <p>Hotkey settings coming soon...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
