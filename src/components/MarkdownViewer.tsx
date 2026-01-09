import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { searchStore } from '../stores/searchStore';
import { Callout } from './Callout';
import { NoteEmbed } from './NoteEmbed';
import { invoke } from '@tauri-apps/api/core';

interface MarkdownViewerProps {
  content: string;
  onLinkClick?: (targetName: string) => void;
  getEmbedContent?: (noteName: string) => Promise<string | null>;
}

export function MarkdownViewer({ content, onLinkClick, getEmbedContent }: MarkdownViewerProps) {
  // Custom renderer for text to handle wikilinks
  const transformWikilinks = (text: string): string => {
    // Pattern to match [[note]] or [[note|display]]
    return text.replace(
      /\[\[([^\]|]+)(\|([^\]]+))?\]\]/g,
      (match, target, _, display) => {
        const linkText = display || target;
        return `[${linkText}](wikilink:${target})`;
      }
    );
  };

  // Parse callout syntax from blockquote
  const parseCallout = (children: React.ReactNode): { type: string; title: string; content: string } | null => {
    if (typeof children !== 'string') return null;

    const match = children.match(/^>\s*\[!\s*(\w+)\]\s*(.*)$/);
    if (!match) return null;

    return {
      type: match[1],
      title: match[2].trim(),
      content: children,
    };
  };

  return (
    <div style={{ maxWidth: '48rem', margin: '0 auto', paddingLeft: '2rem', paddingRight: '2rem', paddingTop: '1.5rem', paddingBottom: '1.5rem' }}>
      <div className="prose">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            p: ({ children }) => {
              // Check if children contains a wikilink and transform it
              if (typeof children === 'string') {
                const transformed = transformWikilinks(children);
                if (transformed !== children) {
                  // We need to render this as markdown again
                  return <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      a: ({ href, children }) => {
                        if (href?.startsWith('wikilink:')) {
                          const target = href.replace('wikilink:', '');
                          const exists = searchStore.noteExists(target);
                          return (
                            <a
                              href="#"
                              onClick={(e) => {
                                e.preventDefault();
                                onLinkClick?.(target);
                              }}
                              style={{
                                color: exists ? '#a78bfa' : '#f59e0b',
                                textDecoration: 'none',
                                borderBottom: exists ? '1px dashed #a78bfa' : '1px dashed #f59e0b',
                                cursor: 'pointer',
                              }}
                              title={exists ? `Go to ${target}` : `Create ${target}`}
                            >
                              {children}
                            </a>
                          );
                        }
                        return <a href={href}>{children}</a>;
                      }
                    }}
                  >{transformed}</ReactMarkdown>;
                }
              }
              return <p>{children}</p>;
            },
            blockquote: ({ children }) => {
              // Check for callout syntax >[!type]
              if (Array.isArray(children) && children.length > 0) {
                const firstChild = children[0];
                if (typeof firstChild === 'string') {
                  const callout = parseCallout(firstChild);
                  if (callout) {
                    return (
                      <Callout type={callout.type} title={callout.title || undefined}>
                        {children.slice(1)}
                      </Callout>
                    );
                  }
                }
              }
              return <blockquote>{children}</blockquote>;
            },
            code({ node, className, children, ...props }) {
              const match = /language-(\w+)/.exec(className || '');
              const isInline = !match && !className;

              return !isInline && match ? (
                <SyntaxHighlighter
                  style={oneDark}
                  language={match[1]}
                  PreTag="div"
                >
                  {String(children).replace(/\n$/, '')}
                </SyntaxHighlighter>
              ) : (
                <code className={className} {...props}>
                  {children}
                </code>
              );
            },
            a: async ({ href, children }) => {
              // Check for embed syntax: ![[note]]
              if (href?.startsWith('embed:')) {
                const noteName = href.replace('embed:', '');
                const notePath = searchStore.getFilePathByName(noteName);

                if (notePath && getEmbedContent) {
                  try {
                    const content = await getEmbedContent(noteName);
                    if (content) {
                      return (
                        <NoteEmbed
                          noteName={noteName}
                          content={content}
                          onOpen={() => onLinkClick?.(noteName)}
                        />
                      );
                    }
                  } catch (error) {
                    console.error('Failed to load embed:', error);
                  }
                }
                return (
                  <div style={{ padding: '1rem', backgroundColor: '#27272a', borderRadius: '0.375rem' }}>
                    <span style={{ color: '#71717a' }}>Note not found: {noteName}</span>
                  </div>
                );
              }

              if (href?.startsWith('wikilink:')) {
                const target = href.replace('wikilink:', '');
                const exists = searchStore.noteExists(target);
                return (
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      onLinkClick?.(target);
                    }}
                    style={{
                      color: exists ? '#a78bfa' : '#f59e0b',
                      textDecoration: 'none',
                      borderBottom: exists ? '1px dashed #a78bfa' : '1px dashed #f59e0b',
                      cursor: 'pointer',
                    }}
                    title={exists ? `Go to ${target}` : `Create ${target}`}
                  >
                    {children}
                  </a>
                );
              }
              return <a href={href}>{children}</a>;
            }
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    </div>
  );
}
