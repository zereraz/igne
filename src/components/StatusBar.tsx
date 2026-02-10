import { useState, useMemo, useCallback, memo } from 'react';
import { Clock } from 'lucide-react';

export interface StatusBarPluginItem {
  id: string;
  content: React.ReactNode;
}

interface StatusBarProps {
  content: string;
  cursorLine: number;
  cursorColumn: number;
  backlinksCount: number;
  pluginItems?: StatusBarPluginItem[];
}

function countWords(text: string): number {
  if (!text.trim()) return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}

// Stat component with hover reveal
function Stat({
  icon,
  value,
  label,
  secondaryValue,
  secondaryLabel,
  onClick,
}: {
  icon?: React.ReactNode;
  value: string | number;
  label: string;
  secondaryValue?: string | number;
  secondaryLabel?: string;
  onClick?: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [showSecondary, setShowSecondary] = useState(false);

  const handleClick = useCallback(() => {
    if (secondaryValue !== undefined) {
      setShowSecondary(!showSecondary);
    }
    onClick?.();
  }, [secondaryValue, showSecondary, onClick]);

  const displayValue = showSecondary && secondaryValue !== undefined ? secondaryValue : value;
  const displayLabel = showSecondary && secondaryLabel ? secondaryLabel : label;

  return (
    <button
      type="button"
      onClick={handleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '3px',
        padding: '0 6px',
        height: '100%',
        background: hovered ? 'var(--background-modifier-hover)' : 'transparent',
        border: 'none',
        borderRadius: '2px',
        cursor: secondaryValue !== undefined ? 'pointer' : 'default',
        transition: 'background 100ms ease',
        fontFamily: 'inherit',
      }}
    >
      {icon && (
        <span style={{ display: 'flex', alignItems: 'center', color: 'var(--text-faint)' }}>
          {icon}
        </span>
      )}
      <span
        style={{
          fontFamily: 'ui-monospace, SFMono-Regular, SF Mono, Menlo, monospace',
          fontSize: '11px',
          fontWeight: 500,
          color: 'var(--text-normal)',
          letterSpacing: '-0.01em',
        }}
      >
        {typeof displayValue === 'number' ? displayValue.toLocaleString() : displayValue}
      </span>
      <span
        style={{
          fontSize: '10px',
          fontWeight: 400,
          color: 'var(--text-faint)',
          letterSpacing: '0.02em',
          textTransform: 'lowercase',
        }}
      >
        {displayLabel}
      </span>
    </button>
  );
}

// Subtle vertical divider
function Divider() {
  return (
    <div
      style={{
        width: '1px',
        height: '10px',
        backgroundColor: 'var(--background-modifier-border)',
        opacity: 0.5,
        margin: '0 2px',
      }}
    />
  );
}

export const StatusBar = memo(function StatusBar({
  content,
  cursorLine,
  cursorColumn,
  backlinksCount,
  pluginItems = [],
}: StatusBarProps) {
  const wordCount = useMemo(() => countWords(content), [content]);
  const readingTime = useMemo(() => Math.ceil(wordCount / 238), [wordCount]);
  const charCount = content.length;

  return (
    <div
      style={{
        height: '22px',
        minHeight: '22px',
        backgroundColor: 'var(--background-secondary)',
        borderTop: '1px solid var(--background-modifier-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 8px',
        fontFamily: 'var(--font-interface)',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        flexShrink: 0,
      }}
    >
      {/* Left section - document stats */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          height: '100%',
        }}
      >
        <Stat
          value={wordCount}
          label="words"
          secondaryValue={charCount}
          secondaryLabel="chars"
        />

        <Divider />

        <Stat
          icon={<Clock size={11} />}
          value={`${readingTime} min`}
          label="read"
        />

        <Divider />

        {/* Line:Col - monospace aligned */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '0 6px',
            height: '100%',
          }}
        >
          <span
            style={{
              fontFamily: 'ui-monospace, SFMono-Regular, SF Mono, Menlo, monospace',
              fontSize: '11px',
              fontWeight: 500,
              color: 'var(--text-muted)',
              letterSpacing: '-0.01em',
            }}
          >
            {cursorLine}
            <span style={{ color: 'var(--text-faint)', margin: '0 1px' }}>:</span>
            {cursorColumn}
          </span>
        </div>

        {/* Backlinks indicator - only show if > 0 */}
        {backlinksCount > 0 && (
          <>
            <Divider />
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '0 6px',
                height: '100%',
              }}
            >
              {/* Link icon - inline SVG for precision */}
              <svg
                width="11"
                height="11"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ color: 'var(--text-faint)' }}
              >
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
              <span
                style={{
                  fontFamily: 'ui-monospace, SFMono-Regular, SF Mono, Menlo, monospace',
                  fontSize: '11px',
                  fontWeight: 500,
                  color: 'var(--text-muted)',
                }}
              >
                {backlinksCount}
              </span>
            </div>
          </>
        )}
      </div>

      {/* Right section - plugin items */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          height: '100%',
        }}
      >
        {pluginItems.map((item) => (
          <div
            key={item.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '0 6px',
              height: '100%',
              fontSize: '11px',
              color: 'var(--text-muted)',
            }}
          >
            {item.content}
          </div>
        ))}
      </div>
    </div>
  );
});
