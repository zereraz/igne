import { Component, type ReactNode, type ErrorInfo } from 'react';

interface PanelErrorBoundaryProps {
  children: ReactNode;
  label?: string;
}

interface PanelErrorBoundaryState {
  hasError: boolean;
}

/**
 * Lightweight error boundary for individual panels (sidebar, editor, right panel).
 * Shows a small retry UI instead of crashing the entire app.
 */
export class PanelErrorBoundary extends Component<PanelErrorBoundaryProps, PanelErrorBoundaryState> {
  state: PanelErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): PanelErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[PanelErrorBoundary] ${this.props.label ?? 'Panel'} crashed:`, error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            padding: '24px',
            gap: '12px',
            color: 'var(--text-faint)',
            fontFamily: 'var(--font-interface)',
            fontSize: '12px',
            textAlign: 'center',
          }}
        >
          <p style={{ margin: 0 }}>
            {this.props.label ?? 'This panel'} encountered an error.
          </p>
          <button
            onClick={() => this.setState({ hasError: false })}
            style={{
              padding: '6px 12px',
              fontSize: '12px',
              fontFamily: 'var(--font-interface)',
              backgroundColor: 'var(--background-secondary)',
              border: '1px solid var(--background-modifier-border)',
              borderRadius: '2px',
              cursor: 'pointer',
              color: 'var(--text-muted)',
            }}
          >
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
