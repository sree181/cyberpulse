/**
 * ImpactRipples — Concentric sonar ping animations at attack target locations
 * 
 * When a critical/high attack lands on the globe, emits expanding concentric rings
 * at the projected screen position of the target. Ring size and color indicate severity.
 * Multiple simultaneous criticals create overlapping interference patterns.
 * 
 * Renders as an SVG overlay on top of the globe canvas.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { useThreatData } from '@/contexts/ThreatContext';

interface Ripple {
  id: string;
  x: number; // % of container width
  y: number; // % of container height
  severity: 'critical' | 'high' | 'medium' | 'low';
  startTime: number;
  rings: number; // number of concentric rings (2-4)
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: 'rgba(220, 50, 50, ',
  high: 'rgba(220, 130, 20, ',
  medium: 'rgba(200, 180, 40, ',
  low: 'rgba(60, 180, 120, ',
};

const MAX_RIPPLES = 8;
const RIPPLE_DURATION = 2500; // ms
const MAX_RADIUS = 80; // px

export default function ImpactRipples() {
  const { activeArcs } = useThreatData();
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const lastArcCountRef = useRef(0);
  const frameRef = useRef<number>(0);
  const svgRef = useRef<SVGSVGElement>(null);

  // Track new arcs and spawn ripples for critical/high severity
  useEffect(() => {
    if (activeArcs.length <= lastArcCountRef.current) {
      lastArcCountRef.current = activeArcs.length;
      return;
    }

    const newArcs = activeArcs.slice(lastArcCountRef.current);
    lastArcCountRef.current = activeArcs.length;

    const newRipples: Ripple[] = [];
    for (const arc of newArcs) {
      // Only create ripples for critical and high severity attacks
      if (arc.severity !== 'critical' && arc.severity !== 'high') continue;

      // Position based on target lat/lng projected to screen space
      // Use a simple mercator-like projection for approximate positioning
      const x = ((arc.endLng + 180) / 360) * 100;
      const y = ((90 - arc.endLat) / 180) * 100;

      newRipples.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        x,
        y,
        severity: arc.severity as 'critical' | 'high',
        startTime: Date.now(),
        rings: arc.severity === 'critical' ? 4 : 2,
      });
    }

    if (newRipples.length > 0) {
      setRipples(prev => [...prev, ...newRipples].slice(-MAX_RIPPLES));
    }
  }, [activeArcs]);

  // Animation loop — remove expired ripples
  const animate = useCallback(() => {
    const now = Date.now();
    setRipples(prev => prev.filter(r => now - r.startTime < RIPPLE_DURATION));
    frameRef.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    frameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameRef.current);
  }, [animate]);

  if (ripples.length === 0) return null;

  return (
    <svg
      ref={svgRef}
      className="absolute inset-0 w-full h-full z-10 pointer-events-none overflow-visible"
      style={{ mixBlendMode: 'screen' }}
    >
      {ripples.map(ripple => {
        const elapsed = Date.now() - ripple.startTime;
        const progress = Math.min(1, elapsed / RIPPLE_DURATION);
        const colorBase = SEVERITY_COLORS[ripple.severity] || SEVERITY_COLORS.medium;

        return Array.from({ length: ripple.rings }, (_, ringIdx) => {
          // Stagger each ring's start
          const ringDelay = ringIdx * 0.15;
          const ringProgress = Math.max(0, Math.min(1, (progress - ringDelay) / (1 - ringDelay)));
          
          if (ringProgress <= 0) return null;

          const radius = ringProgress * MAX_RADIUS;
          const opacity = (1 - ringProgress) * 0.6;

          return (
            <circle
              key={`${ripple.id}-${ringIdx}`}
              cx={`${ripple.x}%`}
              cy={`${ripple.y}%`}
              r={radius}
              fill="none"
              stroke={`${colorBase}${opacity})`}
              strokeWidth={ripple.severity === 'critical' ? 2 : 1.5}
              style={{
                filter: ripple.severity === 'critical' ? 'blur(0.5px)' : undefined,
              }}
            />
          );
        });
      })}
    </svg>
  );
}
