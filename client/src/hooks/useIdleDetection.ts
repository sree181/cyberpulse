/**
 * useIdleDetection — Display Engineering: Idle/Attract Mode
 * 
 * Detects user inactivity and transitions between states:
 * - ACTIVE: User is interacting (touch/mouse within last 30s)
 * - IDLE: No interaction for 60s — enter attract mode (dramatic visuals)
 * - DEEP_IDLE: No interaction for 5min — reduce brightness, slow animations
 * 
 * For large public displays, "attract mode" draws attention from passersby.
 */
import { useEffect, useRef, useState, useCallback } from 'react';

export type IdleState = 'active' | 'idle' | 'deep_idle';

interface IdleConfig {
  idleTimeout?: number;      // ms before entering idle (default: 60000)
  deepIdleTimeout?: number;  // ms before entering deep idle (default: 300000)
  enabled?: boolean;
}

export function useIdleDetection(config: IdleConfig = {}) {
  const {
    idleTimeout = 60000,
    deepIdleTimeout = 300000,
    enabled = true,
  } = config;

  const [idleState, setIdleState] = useState<IdleState>('active');
  const [idleDuration, setIdleDuration] = useState(0); // seconds idle
  const lastActivityRef = useRef(Date.now());
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const deepIdleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const counterRef = useRef<NodeJS.Timeout | null>(null);

  const resetIdle = useCallback(() => {
    lastActivityRef.current = Date.now();
    setIdleState('active');
    setIdleDuration(0);

    // Clear existing timers
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (deepIdleTimerRef.current) clearTimeout(deepIdleTimerRef.current);
    if (counterRef.current) clearInterval(counterRef.current);

    // Set new idle timer
    idleTimerRef.current = setTimeout(() => {
      setIdleState('idle');
      // Start counting idle duration
      counterRef.current = setInterval(() => {
        setIdleDuration(d => d + 1);
      }, 1000);
    }, idleTimeout);

    // Set deep idle timer
    deepIdleTimerRef.current = setTimeout(() => {
      setIdleState('deep_idle');
    }, deepIdleTimeout);
  }, [idleTimeout, deepIdleTimeout]);

  useEffect(() => {
    if (!enabled) return;

    // Events that indicate user activity
    const events = [
      'mousedown', 'mousemove', 'keydown',
      'touchstart', 'touchmove', 'scroll', 'wheel',
      'pointerdown', 'pointermove',
    ];

    const handleActivity = () => resetIdle();

    events.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    // Initialize
    resetIdle();

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (deepIdleTimerRef.current) clearTimeout(deepIdleTimerRef.current);
      if (counterRef.current) clearInterval(counterRef.current);
    };
  }, [enabled, resetIdle]);

  return {
    idleState,
    idleDuration,
    isIdle: idleState !== 'active',
    isDeepIdle: idleState === 'deep_idle',
    resetIdle,
  };
}
