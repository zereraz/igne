/**
 * Igne Design System - Premium UI based on Weft patterns
 * CLI-inspired aesthetic with technical precision
 */

export const designTokens = {
  // Colors - Limited palette with single accent
  colors: {
    // Backgrounds
    bgPrimary: '#18181b',
    bgSecondary: '#1f1f23',
    bgTertiary: '#27272a',
    bgElevated: '#27272a',

    // Text hierarchy
    textPrimary: '#e4e4e7',
    textSecondary: '#a1a1aa',
    textMuted: '#71717a',

    // Borders
    borderDefault: '#3f3f46',
    borderSubtle: '#3f3f46',
    borderFocus: '#52525b',

    // Accent - Violet (single accent color)
    accent: '#a78bfa',
    accentHover: '#8b5cf6',
    accentMuted: 'rgba(167, 139, 250, 0.15)',
    accentDashed: 'rgba(167, 139, 250, 0.4)',

    // Status colors
    success: '#22c55e',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',

    // Selection
    selectedBg: 'rgba(167, 139, 250, 0.1)',
    selectedBorder: '#a78bfa',
  },

  // Typography - Mono first
  typography: {
    fontMono: "'IBM Plex Mono', 'SF Mono', 'Courier New', monospace",
    fontSans: "system-ui, -apple-system, sans-serif",
    sizeXs: '11px',
    sizeSm: '12px',
    sizeMd: '13px',
    sizeBase: '14px',
    sizeLg: '16px',
    weightNormal: 400,
    weightMedium: 500,
    weightSemibold: 600,
    lineHeightTight: 1.4,
    lineHeightNormal: 1.5,
  },

  // Spacing - 4px scale
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
  },

  // Borders - Sharp corners
  borders: {
    radius: '2px',
    radiusMd: '4px',
    radiusLg: '6px',
    width: '1px',
  },

  // Transitions - Fast and purposeful
  transitions: {
    instant: '50ms ease',
    fast: '100ms ease',
    normal: '150ms ease',
  },

  // Shadows - Minimal
  shadows: {
    sm: '0 1px 2px rgba(0, 0, 0, 0.3)',
    md: '0 4px 6px rgba(0, 0, 0, 0.4)',
    lg: '0 10px 15px rgba(0, 0, 0, 0.5)',
  },

  // Touch targets
  touchTarget: '44px',
};

// Common style utilities - using designTokens below
export const styles = {
  // Button variants
  buttonPrimary: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 14px',
    fontSize: '12px',
    fontFamily: "'IBM Plex Mono', 'SF Mono', 'Courier New', monospace",
    fontWeight: 500,
    backgroundColor: '#a78bfa',
    border: 'none',
    borderRadius: '2px',
    color: '#ffffff',
    cursor: 'pointer',
    transition: 'background-color 100ms ease',
  },

  buttonDefault: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 14px',
    fontSize: '12px',
    fontFamily: "'IBM Plex Mono', 'SF Mono', 'Courier New', monospace",
    fontWeight: 500,
    backgroundColor: 'transparent',
    border: '1px solid #3f3f46',
    borderRadius: '2px',
    color: '#a1a1aa',
    cursor: 'pointer',
    transition: 'border-color 100ms ease, color 100ms ease',
  },

  buttonGhost: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    fontSize: '12px',
    fontFamily: "'IBM Plex Mono', 'SF Mono', 'Courier New', monospace",
    fontWeight: 500,
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '2px',
    color: '#a1a1aa',
    cursor: 'pointer',
    transition: 'color 100ms ease, background-color 100ms ease',
  },

  buttonDanger: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 14px',
    fontSize: '12px',
    fontFamily: "'IBM Plex Mono', 'SF Mono', 'Courier New', monospace",
    fontWeight: 500,
    backgroundColor: 'transparent',
    border: '1px solid #ef4444',
    borderRadius: '2px',
    color: '#ef4444',
    cursor: 'pointer',
    transition: 'background-color 100ms ease',
  },

  // Card/Panel
  card: {
    backgroundColor: '#27272a',
    border: '1px solid #3f3f46',
    borderRadius: '2px',
    transition: 'box-shadow 100ms ease, border-color 100ms ease',
  },

  cardElevated: {
    backgroundColor: '#27272a',
    border: '1px solid #3f3f46',
    borderRadius: '2px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.4)',
  },

  // Input
  input: {
    width: '100%',
    padding: '10px 12px',
    fontSize: '13px',
    fontFamily: "'IBM Plex Mono', 'SF Mono', 'Courier New', monospace",
    backgroundColor: '#18181b',
    border: '1px solid #3f3f46',
    borderRadius: '2px',
    color: '#e4e4e7',
    outline: 'none',
    transition: 'border-color 100ms ease, box-shadow 100ms ease',
  },

  // Empty state with dashed border
  emptyState: {
    border: '1px dashed #3f3f46',
    borderRadius: '2px',
    color: '#71717a',
  },

  // Modal overlay
  modalOverlay: {
    position: 'fixed' as const,
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },

  modalContent: {
    backgroundColor: '#27272a',
    border: '1px solid #3f3f46',
    borderRadius: '2px',
    boxShadow: '0 10px 15px rgba(0, 0, 0, 0.5)',
    maxWidth: '600px',
    width: '90%',
  },

  // Left accent border for status
  leftAccent: (color: string) => ({
    borderLeft: `3px solid ${color}`,
  }),

  // Focus indicator
  focusRing: {
    outline: 'none',
    boxShadow: '0 0 0 2px rgba(167, 139, 250, 0.15)',
  },
};
