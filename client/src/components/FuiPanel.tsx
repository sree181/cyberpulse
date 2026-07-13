/**
 * FuiPanel — Fantasy User Interface Panel with animated borders
 * 
 * Sci-fi panel wrapper with:
 * - Animated SVG border that "draws in" on mount
 * - Corner indicators with pulse animation
 * - Subtle glow on the border
 * - Content fades in after border animation completes
 * 
 * Uses a viewBox-based SVG (1000x1000) that scales to fill the container.
 * Inspired by: Iron Man HUD, Star Citizen UI, Halo waypoint interfaces
 */
import { useEffect, useRef, useState, type ReactNode, memo } from 'react';
import gsap from 'gsap';

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
  title,
  cornerSize = 12,
  animationDuration = 1.2,
  glowColor = 'var(--color-cp-accent)',
  delay = 0,
}: FuiPanelProps) {
  const borderRef = useRef<SVGSVGElement>(null);
  const [isRevealed, setIsRevealed] = useState(false);

  useEffect(() => {
    if (!borderRef.current) return;

    const paths = borderRef.current.querySelectorAll('.fui-border-path');
    const corners = borderRef.current.querySelectorAll('.fui-corner');

    // Set initial state — hidden
    paths.forEach((path) => {
      const el = path as SVGPathElement;
      const length = el.getTotalLength();
      if (length > 0) {
        gsap.set(el, {
          strokeDasharray: length,
          strokeDashoffset: length,
          opacity: 0,
        });
      }
    });

    corners.forEach((corner) => {
      gsap.set(corner, { opacity: 0, scale: 0 });
    });

    // Animate in
    const tl = gsap.timeline({ delay });

    // Draw borders
    tl.to(paths, {
      strokeDashoffset: 0,
      opacity: 1,
      duration: animationDuration,
      ease: 'power2.inOut',
      stagger: 0.1,
    });

    // Pop corners
    tl.to(corners, {
      opacity: 1,
      scale: 1,
      duration: 0.3,
      ease: 'back.out(2)',
      stagger: 0.05,
    }, `-=${animationDuration * 0.3}`);

    tl.call(() => setIsRevealed(true));

    return () => { tl.kill(); };
  }, [animationDuration, delay]);

  // Use a 1000x1000 viewBox — corners are proportional
  const vb = 1000;
  const cs = Math.round((cornerSize / 12) * 30); // Scale corner size to viewBox

  return (
    <div className={`relative ${className}`}>
      {/* SVG Border Overlay — uses viewBox for proper scaling */}
      <svg
        ref={borderRef}
        className="absolute inset-0 w-full h-full pointer-events-none z-10"
        viewBox={`0 0 ${vb} ${vb}`}
        preserveAspectRatio="none"
        fill="none"
      >
        {/* Top border */}
        <path
          className="fui-border-path"
          d={`M ${cs},0 L ${vb - cs},0`}
          stroke={glowColor}
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
          style={{ filter: `drop-shadow(0 0 3px ${glowColor})` }}
        />
        {/* Right border */}
        <path
          className="fui-border-path"
          d={`M ${vb},${cs} L ${vb},${vb - cs}`}
          stroke={glowColor}
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
          style={{ filter: `drop-shadow(0 0 3px ${glowColor})` }}
        />
        {/* Bottom border */}
        <path
          className="fui-border-path"
          d={`M ${vb - cs},${vb} L ${cs},${vb}`}
          stroke={glowColor}
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
          style={{ filter: `drop-shadow(0 0 3px ${glowColor})` }}
        />
        {/* Left border */}
        <path
          className="fui-border-path"
          d={`M 0,${vb - cs} L 0,${cs}`}
          stroke={glowColor}
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
          style={{ filter: `drop-shadow(0 0 3px ${glowColor})` }}
        />

        {/* Corner indicators */}
        {/* Top-left */}
        <path
          className="fui-corner"
          d={`M 0,${cs} L 0,0 L ${cs},0`}
          stroke={glowColor}
          strokeWidth="3"
          vectorEffect="non-scaling-stroke"
          style={{ filter: `drop-shadow(0 0 4px ${glowColor})`, transformOrigin: '0 0' }}
        />
        {/* Top-right */}
        <path
          className="fui-corner"
          d={`M ${vb - cs},0 L ${vb},0 L ${vb},${cs}`}
          stroke={glowColor}
          strokeWidth="3"
          vectorEffect="non-scaling-stroke"
          style={{ filter: `drop-shadow(0 0 4px ${glowColor})`, transformOrigin: `${vb}px 0` }}
        />
        {/* Bottom-right */}
        <path
          className="fui-corner"
          d={`M ${vb},${vb - cs} L ${vb},${vb} L ${vb - cs},${vb}`}
          stroke={glowColor}
          strokeWidth="3"
          vectorEffect="non-scaling-stroke"
          style={{ filter: `drop-shadow(0 0 4px ${glowColor})`, transformOrigin: `${vb}px ${vb}px` }}
        />
        {/* Bottom-left */}
        <path
          className="fui-corner"
          d={`M ${cs},${vb} L 0,${vb} L 0,${vb - cs}`}
          stroke={glowColor}
          strokeWidth="3"
          vectorEffect="non-scaling-stroke"
          style={{ filter: `drop-shadow(0 0 4px ${glowColor})`, transformOrigin: `0 ${vb}px` }}
        />
      </svg>

      {/* Content — visible immediately, fades in after border animation for polish */}
      <div className={`relative z-0 h-full transition-opacity duration-500 ${isRevealed ? 'opacity-100' : 'opacity-70'}`}>
        {children}
      </div>
    </div>
  );
});

export default FuiPanel;
