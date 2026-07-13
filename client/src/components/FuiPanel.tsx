/**
 * FuiPanel — Fantasy User Interface Panel with animated borders
 * 
 * Sci-fi panel wrapper with:
 * - Animated SVG border that "draws in" on mount
 * - Corner indicators with pulse animation
 * - Subtle glow on the border
 * - Optional header with scramble text effect
 * 
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
  const cornerRefs = useRef<(SVGPathElement | null)[]>([]);
  const [isRevealed, setIsRevealed] = useState(false);

  useEffect(() => {
    if (!borderRef.current) return;

    const paths = borderRef.current.querySelectorAll('.fui-border-path');
    const corners = borderRef.current.querySelectorAll('.fui-corner');

    // Set initial state — hidden
    paths.forEach((path) => {
      const el = path as SVGPathElement;
      const length = el.getTotalLength();
      gsap.set(el, {
        strokeDasharray: length,
        strokeDashoffset: length,
        opacity: 0,
      });
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

  const cs = cornerSize;

  return (
    <div className={`relative ${className}`}>
      {/* SVG Border Overlay */}
      <svg
        ref={borderRef}
        className="absolute inset-0 w-full h-full pointer-events-none z-10"
        preserveAspectRatio="none"
      >
        {/* Top border */}
        <path
          className="fui-border-path"
          d={`M ${cs},0 L calc(100% - ${cs}),0`}
          fill="none"
          stroke={glowColor}
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
          style={{ filter: `drop-shadow(0 0 3px ${glowColor})` }}
        />
        {/* Right border */}
        <path
          className="fui-border-path"
          d={`M 100%,${cs} L 100%,calc(100% - ${cs})`}
          fill="none"
          stroke={glowColor}
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
          style={{ filter: `drop-shadow(0 0 3px ${glowColor})` }}
        />
        {/* Bottom border */}
        <path
          className="fui-border-path"
          d={`M calc(100% - ${cs}),100% L ${cs},100%`}
          fill="none"
          stroke={glowColor}
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
          style={{ filter: `drop-shadow(0 0 3px ${glowColor})` }}
        />
        {/* Left border */}
        <path
          className="fui-border-path"
          d={`M 0,calc(100% - ${cs}) L 0,${cs}`}
          fill="none"
          stroke={glowColor}
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
          style={{ filter: `drop-shadow(0 0 3px ${glowColor})` }}
        />

        {/* Corner indicators */}
        {/* Top-left */}
        <path
          className="fui-corner"
          d={`M 0,${cs} L 0,0 L ${cs},0`}
          fill="none"
          stroke={glowColor}
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
          style={{ filter: `drop-shadow(0 0 4px ${glowColor})`, transformOrigin: '0 0' }}
        />
        {/* Top-right */}
        <path
          className="fui-corner"
          d={`M calc(100% - ${cs}),0 L 100%,0 L 100%,${cs}`}
          fill="none"
          stroke={glowColor}
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
          style={{ filter: `drop-shadow(0 0 4px ${glowColor})`, transformOrigin: '100% 0' }}
        />
        {/* Bottom-right */}
        <path
          className="fui-corner"
          d={`M 100%,calc(100% - ${cs}) L 100%,100% L calc(100% - ${cs}),100%`}
          fill="none"
          stroke={glowColor}
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
          style={{ filter: `drop-shadow(0 0 4px ${glowColor})`, transformOrigin: '100% 100%' }}
        />
        {/* Bottom-left */}
        <path
          className="fui-corner"
          d={`M ${cs},100% L 0,100% L 0,calc(100% - ${cs})`}
          fill="none"
          stroke={glowColor}
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
          style={{ filter: `drop-shadow(0 0 4px ${glowColor})`, transformOrigin: '0 100%' }}
        />
      </svg>

      {/* Content with fade-in */}
      <div className={`relative z-0 transition-opacity duration-500 ${isRevealed ? 'opacity-100' : 'opacity-0'}`}>
        {children}
      </div>
    </div>
  );
});

export default FuiPanel;
