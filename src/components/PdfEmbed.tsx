import { ExternalLink, FileText } from 'lucide-react';
import { useState } from 'react';

interface PdfEmbedProps {
  path: string;
  page: number;
  onOpen: () => void;
}

export function PdfEmbed({ path, page, onOpen }: PdfEmbedProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Get filename from path
  const filename = path.split('/').pop() || path;

  const handleLoad = () => {
    setIsLoading(false);
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  return (
    <div
      style={{
        marginTop: '16px',
        marginBottom: '16px',
        backgroundColor: 'var(--background-secondary)',
        border: '1px solid var(--background-modifier-border)',
        borderRadius: '2px',
        overflow: 'hidden',
      }}
    >
      {/* Header with left accent border */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 12px',
          backgroundColor: 'var(--background-secondary-alt, var(--background-secondary))',
          borderBottom: '1px solid var(--background-modifier-border)',
          borderLeft: '2px solid var(--color-yellow)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FileText size={14} style={{ color: 'var(--color-yellow)' }} />
          <span
            style={{
              fontSize: '12px',
              fontWeight: 500,
              color: 'var(--text-normal)',
              fontFamily: 'var(--font-monospace-theme, var(--font-monospace))',
            }}
          >
            {filename}
          </span>
          {page > 1 && (
            <span
              style={{
                fontSize: '11px',
                color: 'var(--text-faint)',
                fontFamily: 'var(--font-monospace-theme, var(--font-monospace))',
                padding: '2px 6px',
                backgroundColor: 'var(--background-modifier-border)',
                borderRadius: '2px',
              }}
            >
              Page {page}
            </span>
          )}
        </div>
        <button
          onClick={onOpen}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '4px 8px',
            fontSize: '11px',
            backgroundColor: 'transparent',
            border: '1px solid var(--background-modifier-border)',
            borderRadius: '2px',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            fontFamily: 'var(--font-monospace-theme, var(--font-monospace))',
            transition: 'border-color 100ms ease, color 100ms ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--color-yellow)';
            e.currentTarget.style.color = 'var(--color-yellow)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--background-modifier-border)';
            e.currentTarget.style.color = 'var(--text-muted)';
          }}
        >
          <ExternalLink size={12} />
          Open
        </button>
      </div>

      {/* PDF Content */}
      <div
        style={{
          position: 'relative',
          height: '400px',
          backgroundColor: 'var(--background-primary)',
        }}
      >
        {isLoading && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-faint)',
              fontSize: '13px',
              fontFamily: 'var(--font-monospace-theme, var(--font-monospace))',
            }}
          >
            Loading PDF...
          </div>
        )}

        {hasError ? (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              color: 'var(--text-faint)',
              fontSize: '13px',
              fontFamily: 'var(--font-monospace-theme, var(--font-monospace))',
              padding: '20px',
              textAlign: 'center',
            }}
          >
            <FileText size={32} style={{ color: 'var(--interactive-normal)' }} />
            <div>
              <div style={{ marginBottom: '4px', color: 'var(--color-red)' }}>
                Failed to load PDF
              </div>
              <div style={{ fontSize: '12px', color: 'var(--interactive-normal)' }}>
                {path}
              </div>
            </div>
          </div>
        ) : (
          <iframe
            src={`${path}#page=${page}`}
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              display: isLoading ? 'none' : 'block',
            }}
            onLoad={handleLoad}
            onError={handleError}
            title={`PDF: ${filename}`}
          />
        )}
      </div>
    </div>
  );
}
