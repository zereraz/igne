import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  copied: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null, copied: false };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          height: '100vh',
          backgroundColor: 'var(--background-primary)',
          color: 'var(--text-normal)',
          fontFamily: 'var(--font-monospace-theme, var(--font-monospace))',
          padding: '40px 20px 20px',
          overflow: 'auto',
        }}>
          <h1 style={{ color: 'var(--color-red)', marginBottom: '16px' }}>Something went wrong</h1>
          <div style={{
            backgroundColor: 'var(--background-secondary)',
            border: '1px solid var(--background-modifier-border)',
            borderRadius: '4px',
            padding: '16px',
            marginBottom: '16px',
          }}>
            <h3 style={{ color: 'var(--color-yellow)', marginBottom: '8px' }}>Error:</h3>
            <pre style={{
              color: 'var(--color-red)',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              fontSize: '12px',
            }}>
              {this.state.error?.message || 'Unknown error'}
            </pre>
          </div>

          {this.state.error?.stack && (
            <div style={{
              backgroundColor: 'var(--background-secondary)',
              border: '1px solid var(--background-modifier-border)',
              borderRadius: '4px',
              padding: '16px',
              marginBottom: '16px',
            }}>
              <h3 style={{ color: 'var(--color-yellow)', marginBottom: '8px' }}>Stack trace:</h3>
              <pre style={{
                color: 'var(--text-muted)',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                fontSize: '11px',
                maxHeight: '200px',
                overflow: 'auto',
              }}>
                {this.state.error.stack}
              </pre>
            </div>
          )}

          {this.state.errorInfo?.componentStack && (
            <div style={{
              backgroundColor: 'var(--background-secondary)',
              border: '1px solid var(--background-modifier-border)',
              borderRadius: '4px',
              padding: '16px',
              marginBottom: '16px',
            }}>
              <h3 style={{ color: 'var(--color-yellow)', marginBottom: '8px' }}>Component stack:</h3>
              <pre style={{
                color: 'var(--text-muted)',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                fontSize: '11px',
                maxHeight: '200px',
                overflow: 'auto',
              }}>
                {this.state.errorInfo.componentStack}
              </pre>
            </div>
          )}

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '8px 16px',
                backgroundColor: 'var(--color-accent)',
                color: 'var(--background-primary)',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontFamily: 'var(--font-monospace-theme, var(--font-monospace))',
                fontSize: '12px',
              }}
            >
              Reload App
            </button>
            <button
              onClick={() => {
                const text = [
                  this.state.error?.message,
                  this.state.error?.stack,
                  this.state.errorInfo?.componentStack,
                ].filter(Boolean).join('\n\n');
                navigator.clipboard.writeText(text);
                this.setState({ copied: true });
                setTimeout(() => this.setState({ copied: false }), 2000);
              }}
              style={{
                padding: '8px 16px',
                backgroundColor: 'var(--background-modifier-border)',
                color: 'var(--text-normal)',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontFamily: 'var(--font-monospace-theme, var(--font-monospace))',
                fontSize: '12px',
              }}
            >
              {this.state.copied ? 'Copied!' : 'Copy Error'}
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
