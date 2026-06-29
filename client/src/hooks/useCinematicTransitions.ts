/**
 * useCinematicTransitions — Cinematic motion system
 * 
 * Provides:
 * 1. Dolly Zoom Effect: When auto-zoom triggers on the globe, the background
 *    subtly scales while the foreground stays fixed (Hitchcock vertigo effect).
 * 2. Spring Physics: CSS custom properties for spring-based easing that panels
 *    can use instead of linear transitions.
 * 
 * Usage:
 *   const { dollyActive, springStyle } = useCinematicTransitions();
 *   Apply dollyActive class to background elements for the zoom effect.
 *   Apply springStyle to panel containers for spring physics.
 */
import { useState, useEffect, useCallback, useRef } from 'react';

interface CinematicState {
  dollyActive: boolean;
  dollyScale: number; // background scale during dolly (1.0 → 1.08)
}

export function useCinematicTransitions() {
  const [state, setState] = useState<CinematicState>({
    dollyActive: false,
    dollyScale: 1,
  });
  const dollyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Trigger dolly zoom effect (called when globe auto-zooms)
  const triggerDollyZoom = useCallback(() => {
    setState({ dollyActive: true, dollyScale: 1.06 });

    if (dollyTimeoutRef.current) clearTimeout(dollyTimeoutRef.current);
    dollyTimeoutRef.current = setTimeout(() => {
      setState({ dollyActive: false, dollyScale: 1 });
    }, 1200);
  }, []);

  // Listen for custom event from globe zoom
  useEffect(() => {
    const handler = () => triggerDollyZoom();
    window.addEventListener('cyberpulse:autozoom', handler);
    return () => window.removeEventListener('cyberpulse:autozoom', handler);
  }, [triggerDollyZoom]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (dollyTimeoutRef.current) clearTimeout(dollyTimeoutRef.current);
    };
  }, []);

  return {
    dollyActive: state.dollyActive,
    dollyScale: state.dollyScale,
    triggerDollyZoom,
  };
}

/**
 * Spring easing CSS values for use in transitions.
 * These use cubic-bezier approximations of spring physics.
 */
export const SPRING_EASING = {
  // Gentle spring (for panel reveals, mode transitions)
  gentle: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  // Snappy spring (for button clicks, toggles)
  snappy: 'cubic-bezier(0.22, 1.2, 0.36, 1)',
  // Bouncy spring (for attention-grabbing elements)
  bouncy: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  // Smooth deceleration (for sliding panels)
  smooth: 'cubic-bezier(0.16, 1, 0.3, 1)',
};
