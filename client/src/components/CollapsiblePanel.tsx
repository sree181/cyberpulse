/**
 * CollapsiblePanel — Wraps any panel with a minimize/expand toggle
 * 
 * When minimized, shows only the panel title with an expand button.
 * When expanded, shows the full panel content.
 * Reduces information overload by letting users hide panels they don't need.
 */
import { useState, type ReactNode, memo } from 'react';

interface CollapsiblePanelProps {
  children: ReactNode;
  title: string;
  defaultCollapsed?: boolean;
  className?: string;
}

const CollapsiblePanel = memo(function CollapsiblePanel({
  children,
  title,
  defaultCollapsed = false,
  className = '',
}: CollapsiblePanelProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  if (collapsed) {
    return (
      <div className={`flex items-center justify-between px-2 py-1.5 rounded-md bg-[var(--color-cp-surface)]/40 backdrop-blur-sm border border-white/[0.04] ${className}`}>
        <span className="font-display text-[9px] uppercase tracking-wider text-[var(--color-cp-text-tertiary)] opacity-70">
          {title}
        </span>
        <button
          onClick={() => setCollapsed(false)}
          onTouchEnd={(e) => { e.preventDefault(); setCollapsed(false); }}
          className="p-1.5 rounded hover:bg-white/[0.06] transition-colors cursor-pointer touch-manipulation ml-2 shrink-0 min-w-[36px] min-h-[36px] flex items-center justify-center"
          title="Expand panel"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--color-cp-text-tertiary)]">
            <polyline points="15 3 21 3 21 9" />
            <polyline points="9 21 3 21 3 15" />
            <line x1="21" y1="3" x2="14" y2="10" />
            <line x1="3" y1="21" x2="10" y2="14" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className={`relative h-full ${className}`}>
      {/* Minimize button — top-right corner */}
      <button
        onClick={() => setCollapsed(true)}
        onTouchEnd={(e) => { e.preventDefault(); setCollapsed(true); }}
        className="absolute top-1.5 right-1.5 z-10 p-1.5 rounded hover:bg-white/[0.08] transition-colors cursor-pointer touch-manipulation opacity-40 hover:opacity-80 min-w-[36px] min-h-[36px] flex items-center justify-center"
        title="Minimize panel"
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--color-cp-text-tertiary)]">
          <polyline points="4 14 10 14 10 20" />
          <polyline points="20 10 14 10 14 4" />
          <line x1="14" y1="10" x2="21" y2="3" />
          <line x1="3" y1="21" x2="10" y2="14" />
        </svg>
      </button>
      {children}
    </div>
  );
});

export default CollapsiblePanel;
