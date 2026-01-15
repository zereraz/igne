import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
// @ts-ignore - remark-footnotes types may not be available
import remarkFootnotes from 'remark-footnotes';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { convertFileSrc } from '@tauri-apps/api/core';
import { searchStore } from '../stores/searchStore';
import { Callout } from './Callout';
import { NoteEmbed } from './NoteEmbed';
import { toOsPath } from '../utils/vaultPaths';

interface MarkdownViewerProps {
  content: string;
  onLinkClick?: (targetName: string) => void;
  getEmbedContent?: (noteName: string) => Promise<string | null>;
  vaultPath?: string;
  /** When true, renders wikilinks as styled text without vault-dependent features */
  standaloneMode?: boolean;
  /** Scroll to this heading text when it changes */
  scrollToHeading?: string;
}

// Image extensions that should be rendered as images
const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.bmp', '.ico'];

// Helper component to load embed content asynchronously
function EmbedLoader({ noteName, getEmbedContent, onOpen }: { noteName: string; getEmbedContent: (noteName: string) => Promise<string | null>; onOpen: () => void }) {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getEmbedContent(noteName)
      .then(setContent)
      .finally(() => setLoading(false));
  }, [noteName, getEmbedContent]);

  if (loading) {
    return (
      <div style={{ padding: '1rem', backgroundColor: '#27272a', borderRadius: '0.375rem' }}>
        <span style={{ color: '#71717a' }}>Loading...</span>
      </div>
    );
  }

  return <NoteEmbed noteName={noteName} content={content} onOpen={onOpen} />;
}

// Math rendering component
function MathBlock({ latex, display }: { latex: string; display: boolean }) {
  const [html, setHtml] = useState<string>('');
  const [error, setError] = useState<boolean>(false);

  useEffect(() => {
    try {
      const rendered = katex.renderToString(latex, {
        displayMode: display,
        throwOnError: false,
      });
      setHtml(rendered);
      setError(false);
    } catch (e) {
      setError(true);
    }
  }, [latex, display]);

  if (error) {
    return <code style={{ color: '#f87171' }}>{latex}</code>;
  }

  return (
    <span
      dangerouslySetInnerHTML={{ __html: html }}
      style={display ? { display: 'block', margin: '1rem 0', overflowX: 'auto' } : {}}
    />
  );
}

// Mermaid diagram component
function MermaidBlock({ code }: { code: string }) {
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isCancelled = false;

    const renderMermaid = async () => {
      try {
        const mermaid = (await import('mermaid')).default;
        const id = `mermaid-${Math.random().toString(36).slice(2)}`;
        const { svg: renderedSvg } = await mermaid.render(id, code);

        if (!isCancelled) {
          setSvg(renderedSvg);
          setError(false);
          setLoading(false);
        }
      } catch (e) {
        if (!isCancelled) {
          setError(true);
          setLoading(false);
        }
      }
    };

    renderMermaid();

    return () => {
      isCancelled = true;
    };
  }, [code]);

  if (loading) {
    return (
      <div style={{ padding: '1rem', backgroundColor: '#27272a', borderRadius: '0.375rem', textAlign: 'center' }}>
        <span style={{ color: '#71717a' }}>Loading diagram...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '1rem', backgroundColor: '#27272a', borderRadius: '0.375rem' }}>
        <pre style={{ color: '#f87171', fontSize: '0.875rem', overflow: 'auto' }}>{code}</pre>
      </div>
    );
  }

  return <div dangerouslySetInnerHTML={{ __html: svg }} style={{ display: 'flex', justifyContent: 'center', padding: '1rem 0' }} />;
}

export function MarkdownViewer({ content, onLinkClick, getEmbedContent, vaultPath, standaloneMode = false, scrollToHeading }: MarkdownViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Scroll to heading when scrollToHeading changes
  useEffect(() => {
    if (!scrollToHeading || !containerRef.current) return;

    // Find all headings in the container
    const headings = containerRef.current.querySelectorAll('h1, h2, h3, h4, h5, h6');
    for (const heading of headings) {
      // Compare heading text (trimmed) with target
      if (heading.textContent?.trim() === scrollToHeading.trim()) {
        heading.scrollIntoView({ behavior: 'smooth', block: 'start' });
        break;
      }
    }
  }, [scrollToHeading]);

  // Helper to render wikilinks - respects standalone mode
  const renderWikilink = (target: string, children: React.ReactNode) => {
    if (standaloneMode) {
      // In standalone mode, render as styled text (not clickable)
      return (
        <span
          style={{
            color: '#a78bfa',
            borderBottom: '1px dashed #a78bfa',
            cursor: 'default',
          }}
          title={`Wikilink: ${target}`}
        >
          {children}
        </span>
      );
    }
    // Normal mode: check if note exists and make clickable
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
  };

  // Parse math blocks and replace with placeholders
  const parseMath = (text: string): { content: string; mathBlocks: Array<{ latex: string; display: boolean; id: string }> } => {
    const mathBlocks: Array<{ latex: string; display: boolean; id: string }> = [];
    let processed = text;
    let counter = 0;

    // Block math $$...$$
    processed = processed.replace(/\$\$\n?([\s\S]+?)\n?\$\$/g, (_match, latex) => {
      const id = `MATH-BLOCK-${counter++}`;
      mathBlocks.push({ latex, display: true, id });
      return id;
    });

    // Inline math $...$
    processed = processed.replace(/\$([^\$\n]+)\$/g, (_match, latex) => {
      const id = `MATH-INLINE-${counter++}`;
      mathBlocks.push({ latex, display: false, id });
      return id;
    });

    return { content: processed, mathBlocks };
  };

  // Check if a path is an image based on extension
  const isImagePath = (path: string): boolean => {
    const lowerPath = path.toLowerCase();
    return IMAGE_EXTENSIONS.some(ext => lowerPath.endsWith(ext));
  };

  // Custom renderer for text to handle wikilinks and embeds
  const transformWikilinks = (text: string): string => {
    // First handle embeds: ![[note]] or ![[note|display]]
    let transformed = text.replace(
      /!\[\[([^\]|]+)(\|([^\]]+))?\]\]/g,
      (_match, target, _pipe, display) => {
        // Check if this is an image file
        if (isImagePath(target)) {
          // Convert to markdown image syntax
          const altText = display || target;
          // For local files, convert vault-relative path to OS path
          // target can be "attachments/image.png" or "/attachments/image.png"
          // toOsPath handles both cases correctly
          const imagePath = vaultPath
            ? toOsPath(target, vaultPath)
            : target;
          // Use convertFileSrc for Tauri to properly serve local files
          return `![${altText}](${imagePath})`;
        }
        // For non-image embeds, treat as note embeds
        const linkText = display || target;
        return `[${linkText}](embed:${target})`;
      }
    );

    // Then handle regular wikilinks: [[note]] or [[note|display]]
    transformed = transformed.replace(
      /\[\[([^\]|]+)(\|([^\]]+))?\]\]/g,
      (_match, target, _pipe, display) => {
        const linkText = display || target;
        return `[${linkText}](wikilink:${target})`;
      }
    );

    return transformed;
  };

  // Parse math from content
  const { content: processedContent, mathBlocks } = parseMath(content);

  // Transform highlight and strikethrough syntax
  const transformInlineFormats = (text: string): string => {
    // Highlight ==text== -> <mark>text</mark>
    let transformed = text.replace(/==([^=]+)==/g, '<mark>$1</mark>');

    // Strikethrough ~~text~~ -> <s>text</s>
    transformed = transformed.replace(/~~([^~]+)~~/g, '<s>$1</s>');

    return transformed;
  };

  // Apply inline format transformations
  const contentWithFormats = transformInlineFormats(processedContent);

  // Parse callout syntax from blockquote
  const parseCallout = (children: React.ReactNode): { type: string; title: string; content: string; collapsed: boolean } | null => {
    if (typeof children !== 'string') return null;

    // Check for collapsible callout syntax: > [!TYPE]- or > [!TYPE]+
    const matchCollapsed = children.match(/^>\s*\[!\s*(\w+)\]-\s*(.*)$/);
    if (matchCollapsed) {
      return {
        type: matchCollapsed[1],
        title: matchCollapsed[2].trim(),
        content: children,
        collapsed: true,
      };
    }

    // Check for expanded callout syntax: > [!TYPE]+
    const matchExpanded = children.match(/^>\s*\[!\s*(\w+)\]\+\s*(.*)$/);
    if (matchExpanded) {
      return {
        type: matchExpanded[1],
        title: matchExpanded[2].trim(),
        content: children,
        collapsed: false,
      };
    }

    // Check for regular callout syntax: > [!TYPE]
    const match = children.match(/^>\s*\[!\s*(\w+)\]\s*(.*)$/);
    if (!match) return null;

    return {
      type: match[1],
      title: match[2].trim(),
      content: children,
      collapsed: false,
    };
  };

  return (
    <div ref={containerRef} style={{ maxWidth: '48rem', margin: '0 auto', paddingLeft: '2rem', paddingRight: '2rem', paddingTop: '1.5rem', paddingBottom: '1.5rem' }}>
      <div className="prose">
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkFootnotes as any]}
          components={{
            p: ({ children }) => {
              // Handle math placeholders in paragraphs
              if (typeof children === 'string') {
                // Check for math placeholders
                const mathBlockMatch = children.match(/MATH-BLOCK-(\d+)/);
                const mathInlineMatch = children.match(/MATH-INLINE-(\d+)/);

                if (mathBlockMatch || mathInlineMatch) {
                  // Replace math placeholders with actual math
                  const parts = children.split(/(MATH-BLOCK-\d+|MATH-INLINE-\d+)/);
                  return (
                    <>
                      {parts.map((part, i) => {
                        const blockMatch = part.match(/MATH-BLOCK-(\d+)/);
                        const inlineMatch = part.match(/MATH-INLINE-(\d+)/);

                        if (blockMatch) {
                          const mathData = mathBlocks[parseInt(blockMatch[1])];
                          return <MathBlock key={i} latex={mathData.latex} display={mathData.display} />;
                        }

                        if (inlineMatch) {
                          const mathData = mathBlocks[parseInt(inlineMatch[1])];
                          return <MathBlock key={i} latex={mathData.latex} display={mathData.display} />;
                        }

                        // Check if part contains wikilinks
                        const transformed = transformWikilinks(part);
                        if (transformed !== part) {
                          return (
                            <ReactMarkdown
                              key={i}
                              remarkPlugins={[remarkGfm]}
                              components={{
                                a: ({ href, children }) => {
                                  if (href?.startsWith('wikilink:')) {
                                    const target = href.replace('wikilink:', '');
                                    return renderWikilink(target, children);
                                  }
                                  return <a href={href}>{children}</a>;
                                }
                              }}
                            >{transformed}</ReactMarkdown>
                          );
                        }

                        return part;
                      })}
                    </>
                  );
                }

                // Check if children contains a wikilink and transform it
                const transformed = transformWikilinks(children);
                if (transformed !== children) {
                  // We need to render this as markdown again
                  return <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      a: ({ href, children }) => {
                        if (href?.startsWith('wikilink:')) {
                          const target = href.replace('wikilink:', '');
                          return renderWikilink(target, children);
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
                      <Callout
                        type={callout.type}
                        title={callout.title || undefined}
                        collapsed={callout.collapsed}
                      >
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
              const codeText = String(children).replace(/\n$/, '');

              // Handle mermaid diagrams
              if (match && match[1] === 'mermaid') {
                return <MermaidBlock code={codeText} />;
              }

              return !isInline && match ? (
                <SyntaxHighlighter
                  style={oneDark}
                  language={match[1]}
                  PreTag="div"
                >
                  {codeText}
                </SyntaxHighlighter>
              ) : (
                <code className={className} {...props}>
                  {children}
                </code>
              );
            },
            // Custom footnote renderer with better styling
            sup: ({ children, ...props }: any) => {
              const handleClick = (e: React.MouseEvent) => {
                e.preventDefault();
                const footnoteId = (props as any).id?.toString();
                if (footnoteId) {
                  const element = document.getElementById(footnoteId);
                  if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    // Highlight the element briefly
                    element.style.backgroundColor = 'rgba(167, 139, 250, 0.2)';
                    setTimeout(() => {
                      element.style.backgroundColor = '';
                    }, 1000);
                  }
                }
              };
              return (
                <sup
                  {...props}
                  onClick={handleClick}
                  style={{
                    color: '#a78bfa',
                    cursor: 'pointer',
                    fontSize: '0.75em',
                    verticalAlign: 'super',
                    lineHeight: '0',
                    marginLeft: '2px',
                  }}
                  title="Click to navigate to footnote"
                >
                  {children}
                </sup>
              );
            },
            // Custom list item to handle definition lists
            li: ({ children, ...props }) => {
              const childArray = Array.isArray(children) ? children : [children];
              // Check if this is a definition list item (contains : followed by definition)
              const isDefinition = childArray.some((child: any) =>
                typeof child === 'string' && child.match(/^:\s*/)
              );

              if (isDefinition) {
                return (
                  <li
                    {...props}
                    style={{
                      listStyle: 'none',
                      marginLeft: '-1.5rem',
                      marginBottom: '0.5rem',
                    }}
                  >
                    {children}
                  </li>
                );
              }

              return <li {...props}>{children}</li>;
            },
            // Add better styling for paragraphs with definitions
            dl: ({ children }) => {
              return (
                <dl
                  style={{
                    marginLeft: '1.5rem',
                    marginBottom: '1rem',
                  }}
                >
                  {children}
                </dl>
              );
            },
            dt: ({ children }) => {
              return (
                <dt
                  style={{
                    fontWeight: 'bold',
                    marginTop: '0.5rem',
                    display: 'inline',
                  }}
                >
                  {children}
                </dt>
              );
            },
            dd: ({ children }) => {
              return (
                <dd
                  style={{
                    marginLeft: '1.5rem',
                    marginBottom: '0.5rem',
                    display: 'inline',
                  }}
                >
                  {children}
                </dd>
              );
            },
            a: ({ href, children }) => {
              // Check for embed syntax: ![[note]]
              if (href?.startsWith('embed:')) {
                const noteName = href.replace('embed:', '');

                // In standalone mode, show embed as placeholder
                if (standaloneMode) {
                  return (
                    <div style={{ padding: '1rem', backgroundColor: '#27272a', borderRadius: '0.375rem', borderLeft: '3px solid #a78bfa' }}>
                      <span style={{ color: '#a78bfa', fontSize: '0.875rem' }}>Embedded note: {noteName}</span>
                    </div>
                  );
                }

                const notePath = searchStore.getFilePathByName(noteName);

                if (notePath && getEmbedContent) {
                  // Return a component that will handle async loading
                  return <EmbedLoader noteName={noteName} getEmbedContent={getEmbedContent} onOpen={() => onLinkClick?.(noteName)} />;
                }
                return (
                  <div style={{ padding: '1rem', backgroundColor: '#27272a', borderRadius: '0.375rem' }}>
                    <span style={{ color: '#71717a' }}>Note not found: {noteName}</span>
                  </div>
                );
              }

              if (href?.startsWith('wikilink:')) {
                const target = href.replace('wikilink:', '');
                return renderWikilink(target, children);
              }
              return <a href={href}>{children}</a>;
            },
            img: ({ src, alt, ...props }) => {
              // Convert local file paths to Tauri asset URLs
              if (src && (src.startsWith('/') || src.startsWith('.'))) {
                const assetSrc = convertFileSrc(src);
                return (
                  <img
                    src={assetSrc}
                    alt={alt || ''}
                    {...props}
                    style={{ maxWidth: '100%', height: 'auto' }}
                  />
                );
              }
              return <img src={src} alt={alt} {...props} style={{ maxWidth: '100%', height: 'auto' }} />;
            }
          }}
        >
          {contentWithFormats}
        </ReactMarkdown>
      </div>
    </div>
  );
}
