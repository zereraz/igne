import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
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
          backgroundColor: '#18181b',
          color: '#e4e4e7',
          fontFamily: "'IBM Plex Mono', monospace",
          padding: '40px 20px 20px',
          overflow: 'auto',
        }}>
          <h1 style={{ color: '#f87171', marginBottom: '16px' }}>Something went wrong</h1>
          <div style={{
            backgroundColor: '#1f1f23',
            border: '1px solid #3f3f46',
            borderRadius: '4px',
            padding: '16px',
            marginBottom: '16px',
          }}>
            <h3 style={{ color: '#fbbf24', marginBottom: '8px' }}>Error:</h3>
            <pre style={{
              color: '#f87171',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              fontSize: '12px',
            }}>
              {this.state.error?.message || 'Unknown error'}
            </pre>
          </div>

          {this.state.error?.stack && (
            <div style={{
              backgroundColor: '#1f1f23',
              border: '1px solid #3f3f46',
              borderRadius: '4px',
              padding: '16px',
              marginBottom: '16px',
            }}>
              <h3 style={{ color: '#fbbf24', marginBottom: '8px' }}>Stack trace:</h3>
              <pre style={{
                color: '#a1a1aa',
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
              backgroundColor: '#1f1f23',
              border: '1px solid #3f3f46',
              borderRadius: '4px',
              padding: '16px',
              marginBottom: '16px',
            }}>
              <h3 style={{ color: '#fbbf24', marginBottom: '8px' }}>Component stack:</h3>
              <pre style={{
                color: '#a1a1aa',
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

          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '8px 16px',
              backgroundColor: '#a78bfa',
              color: '#18181b',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '12px',
            }}
          >
            Reload App
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
