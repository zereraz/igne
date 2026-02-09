import React, { useState } from 'react';
import {
  Info,
  AlertTriangle,
  CheckCircle,
  Lightbulb,
  FileQuestion,
  Quote,
  FileText,
  Bug,
  Bookmark,
  X,
  Zap,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';

interface CalloutProps {
  type: string;
  title?: string;
  children: React.ReactNode;
  collapsed?: boolean;
}

// Premium design: left accent border for status visibility
const CALLOUT_TYPES: Record<
  string,
  { icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>; color: string; bgColor: string; borderColor: string }
> = {
  note: { icon: FileText, color: '#60a5fa', bgColor: 'rgba(96, 165, 250, 0.1)', borderColor: '#3b82f6' },
  info: { icon: Info, color: '#60a5fa', bgColor: 'rgba(96, 165, 250, 0.1)', borderColor: '#3b82f6' },
  tip: { icon: Lightbulb, color: '#34d399', bgColor: 'rgba(52, 211, 153, 0.1)', borderColor: '#10b981' },
  hint: { icon: Lightbulb, color: '#34d399', bgColor: 'rgba(52, 211, 153, 0.1)', borderColor: '#10b981' },
  important: { icon: Info, color: '#a78bfa', bgColor: 'rgba(167, 139, 250, 0.1)', borderColor: '#8b5cf6' },
  success: { icon: CheckCircle, color: '#34d399', bgColor: 'rgba(52, 211, 153, 0.1)', borderColor: '#10b981' },
  check: { icon: CheckCircle, color: '#34d399', bgColor: 'rgba(52, 211, 153, 0.1)', borderColor: '#10b981' },
  done: { icon: CheckCircle, color: '#34d399', bgColor: 'rgba(52, 211, 153, 0.1)', borderColor: '#10b981' },
  warning: { icon: AlertTriangle, color: '#fbbf24', bgColor: 'rgba(251, 191, 36, 0.1)', borderColor: '#f59e0b' },
  caution: { icon: AlertTriangle, color: '#fbbf24', bgColor: 'rgba(251, 191, 36, 0.1)', borderColor: '#f59e0b' },
  attention: { icon: AlertTriangle, color: '#fbbf24', bgColor: 'rgba(251, 191, 36, 0.1)', borderColor: '#f59e0b' },
  danger: { icon: Zap, color: '#f87171', bgColor: 'rgba(248, 113, 113, 0.1)', borderColor: '#ef4444' },
  error: { icon: X, color: '#f87171', bgColor: 'rgba(248, 113, 113, 0.1)', borderColor: '#ef4444' },
  failure: { icon: X, color: '#f87171', bgColor: 'rgba(248, 113, 113, 0.1)', borderColor: '#ef4444' },
  bug: { icon: Bug, color: '#f87171', bgColor: 'rgba(248, 113, 113, 0.1)', borderColor: '#ef4444' },
  example: { icon: Quote, color: '#22d3ee', bgColor: 'rgba(34, 211, 238, 0.1)', borderColor: '#06b6d4' },
  quote: { icon: Quote, color: '#22d3ee', bgColor: 'rgba(34, 211, 238, 0.1)', borderColor: '#06b6d4' },
  cite: { icon: Quote, color: '#22d3ee', bgColor: 'rgba(34, 211, 238, 0.1)', borderColor: '#06b6d4' },
  question: { icon: FileQuestion, color: '#c084fc', bgColor: 'rgba(192, 132, 252, 0.1)', borderColor: '#a855f7' },
  faq: { icon: FileQuestion, color: '#c084fc', bgColor: 'rgba(192, 132, 252, 0.1)', borderColor: '#a855f7' },
  abstract: { icon: Bookmark, color: '#818cf8', bgColor: 'rgba(129, 140, 248, 0.1)', borderColor: '#6366f1' },
  summary: { icon: Bookmark, color: '#818cf8', bgColor: 'rgba(129, 140, 248, 0.1)', borderColor: '#6366f1' },
  tldr: { icon: Bookmark, color: '#818cf8', bgColor: 'rgba(129, 140, 248, 0.1)', borderColor: '#6366f1' },
};

export function Callout({ type, title, children, collapsed = false }: CalloutProps) {
  const [isCollapsed, setIsCollapsed] = useState(collapsed);
  const config = CALLOUT_TYPES[type.toLowerCase()] || CALLOUT_TYPES.note;
  const Icon = config.icon;
  const displayTitle = title || type.charAt(0).toUpperCase() + type.slice(1);

  return (
    <div
      style={{
        marginTop: '16px',
        marginBottom: '16px',
        padding: '16px',
        backgroundColor: config.bgColor,
        borderLeft: `3px solid ${config.borderColor}`,
        borderRadius: '2px',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: (title || !isCollapsed) ? '8px' : '0',
          fontSize: '12px',
          fontWeight: 500,
          color: config.color,
          fontFamily: "'IBM Plex Mono', 'SF Mono', 'Courier New', monospace",
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          cursor: 'pointer',
          userSelect: 'none',
        }}
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <Icon size={16} style={{ flexShrink: 0 }} />
        <span style={{ flex: 1 }}>{displayTitle}</span>
        {isCollapsed ? (
          <ChevronRight size={14} style={{ flexShrink: 0 }} />
        ) : (
          <ChevronDown size={14} style={{ flexShrink: 0 }} />
        )}
      </div>
      {!isCollapsed && (
        <div
          style={{
            fontSize: '14px',
            lineHeight: 1.6,
            color: 'var(--text-normal)',
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}
