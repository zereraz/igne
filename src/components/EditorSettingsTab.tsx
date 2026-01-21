import { WrapText } from 'lucide-react';

interface EditorSettingsTabProps {
  lineWrapping: boolean;
  onLineWrappingChange: (enabled: boolean) => void;
}

// Shared styles using CSS variables
const labelStyle = {
  fontSize: '11px',
  fontWeight: 600,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
  color: 'var(--text-muted)',
  fontFamily: 'var(--font-interface)',
};

export function EditorSettingsTab({ lineWrapping, onLineWrappingChange }: EditorSettingsTabProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Line Wrapping */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <WrapText size={16} style={{ color: 'var(--color-accent)', flexShrink: 0 }} />
          <label style={labelStyle}>Line Wrapping</label>
        </div>
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px',
            backgroundColor: 'var(--background-secondary)',
            border: '1px solid var(--background-modifier-border)',
            borderRadius: '2px',
            cursor: 'pointer',
            transition: 'border-color 100ms ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--background-modifier-border-hover)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--background-modifier-border)';
          }}
        >
          <input
            type="checkbox"
            checked={lineWrapping}
            onChange={(e) => onLineWrappingChange(e.target.checked)}
            style={{ width: '16px', height: '16px', flexShrink: 0, cursor: 'pointer' }}
          />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '13px', color: 'var(--text-normal)', fontFamily: 'var(--font-interface)' }}>
              Wrap long lines
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-interface)', marginTop: '4px' }}>
              When enabled, long lines will wrap to fit the editor width instead of scrolling horizontally.
            </div>
          </div>
        </label>
      </div>
    </div>
  );
}
