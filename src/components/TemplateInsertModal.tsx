import { useState, useEffect, useRef } from 'react';
import { FileText, X } from 'lucide-react';

interface Template {
  name: string;
  path: string;
}

interface TemplateInsertModalProps {
  templates: Template[];
  onInsertTemplate: (templatePath: string, fileName?: string) => void;
  onClose: () => void;
}

export function TemplateInsertModal({
  templates,
  onInsertTemplate,
  onClose,
}: TemplateInsertModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [fileName, setFileName] = useState('');
  const [createNewFile, setCreateNewFile] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Filter templates based on search query
  const filteredTemplates = templates.filter((template) =>
    template.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Reset selected index when search query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery]);

  // Focus search input on mount
  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, filteredTemplates.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredTemplates.length > 0) {
        handleSelectTemplate(filteredTemplates[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      setCreateNewFile((prev) => !prev);
    }
  };

  const handleSelectTemplate = (template: Template) => {
    if (createNewFile && fileName.trim()) {
      onInsertTemplate(template.path, fileName.trim());
    } else if (!createNewFile) {
      onInsertTemplate(template.path);
    }
  };

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
        zIndex: 2000,
      }}
      onClick={onClose}
      onKeyDown={handleKeyDown}
    >
      <div
        style={{
          backgroundColor: '#27272a',
          border: '1px solid #3f3f46',
          borderRadius: '8px',
          width: '500px',
          maxWidth: '90vw',
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
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
              fontSize: '18px',
              fontWeight: 600,
              color: '#e4e4e7',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <FileText size={20} />
            Insert Template
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#a1a1aa',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '4px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div
          style={{
            padding: '20px',
            flex: 1,
            overflow: 'auto',
          }}
        >
          {/* Search Input */}
          <div style={{ marginBottom: '16px' }}>
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search templates..."
              style={{
                width: '100%',
                padding: '10px 12px',
                backgroundColor: '#18181b',
                border: '1px solid #3f3f46',
                borderRadius: '4px',
                color: '#e4e4e7',
                fontSize: '14px',
                outline: 'none',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#a78bfa';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#3f3f46';
              }}
            />
          </div>

          {/* Create New File Toggle */}
          <div style={{ marginBottom: '16px' }}>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '14px',
                color: '#a1a1aa',
                cursor: 'pointer',
                userSelect: 'none',
              }}
            >
              <input
                type="checkbox"
                checked={createNewFile}
                onChange={(e) => setCreateNewFile(e.target.checked)}
                style={{
                  width: '16px',
                  height: '16px',
                  cursor: 'pointer',
                  accentColor: '#a78bfa',
                }}
              />
              Create new file from template
              <span style={{ fontSize: '12px', opacity: 0.6 }}>(Tab to toggle)</span>
            </label>
          </div>

          {/* File Name Input */}
          {createNewFile && (
            <div style={{ marginBottom: '16px' }}>
              <input
                type="text"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                placeholder="Enter file name (e.g., My Note)"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  backgroundColor: '#18181b',
                  border: '1px solid #3f3f46',
                  borderRadius: '4px',
                  color: '#e4e4e7',
                  fontSize: '14px',
                  outline: 'none',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#a78bfa';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#3f3f46';
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (filteredTemplates.length > 0) {
                      handleSelectTemplate(filteredTemplates[selectedIndex]);
                    }
                  }
                }}
              />
              <p
                style={{
                  margin: '4px 0 0 0',
                  fontSize: '12px',
                  color: '#71717a',
                }}
              >
                File will be created with .md extension
              </p>
            </div>
          )}

          {/* Template List */}
          <div
            style={{
              border: '1px solid #3f3f46',
              borderRadius: '4px',
              maxHeight: '300px',
              overflowY: 'auto',
            }}
          >
            {filteredTemplates.length === 0 ? (
              <div
                style={{
                  padding: '32px',
                  textAlign: 'center',
                  color: '#71717a',
                }}
              >
                <FileText size={32} style={{ marginBottom: '8px', opacity: 0.5 }} />
                <p style={{ margin: 0, fontSize: '14px' }}>
                  {searchQuery ? 'No templates found' : 'No templates available'}
                </p>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px' }}>
                  Create templates in the Templates/ folder
                </p>
              </div>
            ) : (
              filteredTemplates.map((template, index) => (
                <div
                  key={template.path}
                  onClick={() => handleSelectTemplate(template)}
                  onMouseEnter={(e) => {
                    setSelectedIndex(index);
                    if (index !== selectedIndex) {
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (index !== selectedIndex) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                  style={{
                    padding: '10px 12px',
                    cursor: 'pointer',
                    backgroundColor: index === selectedIndex ? 'rgba(167, 139, 250, 0.15)' : 'transparent',
                    borderLeft: index === selectedIndex ? '3px solid #a78bfa' : '3px solid transparent',
                    color: index === selectedIndex ? '#e4e4e7' : '#a1a1aa',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <FileText size={16} style={{ flexShrink: 0 }} />
                  <span
                    style={{
                      flex: 1,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {template.name}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '12px 20px',
            borderTop: '1px solid #3f3f46',
            fontSize: '12px',
            color: '#71717a',
            display: 'flex',
            gap: '16px',
          }}
        >
          <span>↑↓ Navigate</span>
          <span>Enter to select</span>
          <span>Tab toggle new file</span>
          <span>Esc to close</span>
        </div>
      </div>
    </div>
  );
}
