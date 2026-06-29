/**
 * KioskContext — Ambient Awareness Mode Controller
 * 
 * Manages the transition between:
 *   PASSIVE MODE: Auto-rotating globe, minimal UI chrome, designed for hallway viewing
 *   INTERACTIVE MODE: Full dashboard with all panels visible, touch enabled
 * 
 * Transition logic:
 *   - After 60s of inactivity → fade to passive mode
 *   - Any touch/mouse/keyboard → switch to interactive mode
 *   - Manual toggle button always available
 */
import { createContext, useContext, useState, useEffect, useRef, useCallback, type ReactNode } from 'react';

type KioskMode = 'passive' | 'interactive';

interface KioskContextType {
  mode: KioskMode;
  setMode: (mode: KioskMode) => void;
  toggleMode: () => void;
  secondsUntilPassive: number;
  isTransitioning: boolean;
}

const KioskContext = createContext<KioskContextType | null>(null);

export function useKiosk() {
  const ctx = useContext(KioskContext);
  if (!ctx) throw new Error('useKiosk must be used within KioskProvider');
  return ctx;
}

const INACTIVITY_TIMEOUT = 60; // seconds until passive mode

export function KioskProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<KioskMode>('interactive');
  const [secondsUntilPassive, setSecondsUntilPassive] = useState(INACTIVITY_TIMEOUT);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const lastActivityRef = useRef(Date.now());
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Reset inactivity timer on any user interaction
  const resetTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
    setSecondsUntilPassive(INACTIVITY_TIMEOUT);
    
    if (mode === 'passive') {
      setIsTransitioning(true);
      setTimeout(() => {
        setModeState('interactive');
        setIsTransitioning(false);
      }, 300);
    }
  }, [mode]);

  const setMode = useCallback((newMode: KioskMode) => {
    if (newMode === mode) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setModeState(newMode);
      setIsTransitioning(false);
      if (newMode === 'interactive') {
        lastActivityRef.current = Date.now();
        setSecondsUntilPassive(INACTIVITY_TIMEOUT);
      }
    }, 300);
  }, [mode]);

  const toggleMode = useCallback(() => {
    setMode(mode === 'passive' ? 'interactive' : 'passive');
  }, [mode, setMode]);

  // Listen for user activity
  useEffect(() => {
    const events = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll', 'wheel'];
    
    const handleActivity = () => {
      resetTimer();
    };

    events.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
    };
  }, [resetTimer]);

  // Dispatch mode change event for globe camera choreography
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('cyberpulse:kioskchange', { detail: { mode } }));
  }, [mode]);

  // Countdown timer
  useEffect(() => {
    countdownRef.current = setInterval(() => {
      if (mode === 'interactive') {
        const elapsed = Math.floor((Date.now() - lastActivityRef.current) / 1000);
        const remaining = Math.max(0, INACTIVITY_TIMEOUT - elapsed);
        setSecondsUntilPassive(remaining);

        if (remaining === 0) {
          setIsTransitioning(true);
          setTimeout(() => {
            setModeState('passive');
            setIsTransitioning(false);
          }, 300);
        }
      }
    }, 1000);

    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [mode]);

  return (
    <KioskContext.Provider value={{ mode, setMode, toggleMode, secondsUntilPassive, isTransitioning }}>
      {children}
    </KioskContext.Provider>
  );
}
