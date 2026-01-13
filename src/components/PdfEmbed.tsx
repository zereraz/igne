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
        backgroundColor: '#27272a',
        border: '1px solid #3f3f46',
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
          backgroundColor: '#1f1f23',
          borderBottom: '1px solid #3f3f46',
          borderLeft: '2px solid #f59e0b',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FileText size={14} style={{ color: '#f59e0b' }} />
          <span
            style={{
              fontSize: '12px',
              fontWeight: 500,
              color: '#e4e4e7',
              fontFamily: "'IBM Plex Mono', 'SF Mono', 'Courier New', monospace",
            }}
          >
            {filename}
          </span>
          {page > 1 && (
            <span
              style={{
                fontSize: '11px',
                color: '#71717a',
                fontFamily: "'IBM Plex Mono', 'SF Mono', 'Courier New', monospace",
                padding: '2px 6px',
                backgroundColor: '#3f3f46',
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
            border: '1px solid #3f3f46',
            borderRadius: '2px',
            color: '#a1a1aa',
            cursor: 'pointer',
            fontFamily: "'IBM Plex Mono', 'SF Mono', 'Courier New', monospace",
            transition: 'border-color 100ms ease, color 100ms ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#f59e0b';
            e.currentTarget.style.color = '#f59e0b';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#3f3f46';
            e.currentTarget.style.color = '#a1a1aa';
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
          backgroundColor: '#18181b',
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
              color: '#71717a',
              fontSize: '13px',
              fontFamily: "'IBM Plex Mono', 'SF Mono', 'Courier New', monospace",
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
              color: '#71717a',
              fontSize: '13px',
              fontFamily: "'IBM Plex Mono', 'SF Mono', 'Courier New', monospace",
              padding: '20px',
              textAlign: 'center',
            }}
          >
            <FileText size={32} style={{ color: '#52525b' }} />
            <div>
              <div style={{ marginBottom: '4px', color: '#ef4444' }}>
                Failed to load PDF
              </div>
              <div style={{ fontSize: '12px', color: '#52525b' }}>
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
