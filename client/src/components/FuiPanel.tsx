/**
 * GlassPanel — Clean borderless panel with subtle backdrop blur
 * 
 * Replaces the old FUI animated SVG borders with a modern glass-morphism style:
 * - No visible borders (just a very subtle 1px border at 6% opacity)
 * - Backdrop blur for depth
 * - Smooth fade-in on mount
 * - Maintains the same API so existing usage doesn't break
 */
import { type ReactNode, memo } from 'react';

interface FuiPanelProps {
  children: ReactNode;
  className?: string;
  title?: string;
  cornerSize?: number;
  animationDuration?: number;
  glowColor?: string;
  delay?: number;
}

const FuiPanel = memo(function FuiPanel({
  children,
  className = '',
  // These props are kept for API compatibility but no longer used
  title: _title,
  cornerSize: _cornerSize,
  animationDuration: _animationDuration,
  glowColor: _glowColor,
  delay = 0,
}: FuiPanelProps) {
  return (
    <div
      className={`relative rounded-lg overflow-hidden ${className}`}
      style={{
        animationDelay: `${delay}s`,
      }}
    >
      {/* Clean glass panel — no borders, just subtle depth */}
      <div className="absolute inset-0 bg-[var(--color-cp-surface)]/60 backdrop-blur-sm rounded-lg border border-white/[0.04]" />
      
      {/* Content */}
      <div className="relative z-0 h-full animate-fade-in" style={{ animationDelay: `${delay}s` }}>
        {children}
      </div>
    </div>
  );
});

export default FuiPanel;
