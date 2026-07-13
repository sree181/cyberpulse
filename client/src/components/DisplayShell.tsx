/**
 * DisplayShell — Display Engineering: Master Orchestrator
 * 
 * Wraps the entire dashboard with production display features:
 * - Kiosk mode (fullscreen, wake lock, screensaver prevention)
 * - Idle detection (attract mode with globe speed-up, deep idle dimming)
 * - Touch gesture system (swipe, pinch, long-press, triple-tap corner)
 * - Operator panel (hidden admin overlay)
 * - Ambient brightness adaptation
 * - Visual touch feedback (ripple effects)
 * - Performance overlay with auto-quality reduction
 * - Stale data detection and reconnect logic
 * 
 * This is the "display engineering layer" — invisible to users but critical
 * for a production wall-mounted installation.
 */
import { useRef, useState, useCallback, useEffect } from 'react';
import { useKioskMode } from '@/hooks/useKioskMode';
import { useIdleDetection } from '@/hooks/useIdleDetection';
import { useTouchGestures, type GestureEvent } from '@/hooks/useTouchGestures';
import OperatorPanel from './OperatorPanel';

interface DisplayShellProps {
  children: React.ReactNode;
  kioskEnabled?: boolean;
}

export default function DisplayShell({ children, kioskEnabled = true }: DisplayShellProps) {
  const shellRef = useRef<HTMLDivElement>(null);
  const [operatorPanelOpen, setOperatorPanelOpen] = useState(false);
  const [brightness, setBrightness] = useState(1.0);
  const [showFPS, setShowFPS] = useState(false);
  const [ripples, setRipples] = useState<Array<{ id: number; x: number; y: number }>>([]);
  const [qualityLevel, setQualityLevel] = useState<'high' | 'medium' | 'low'>('high');
  const [staleData, setStaleData] = useState(false);
  const [lastDataTimestamp, setLastDataTimestamp] = useState(Date.now());
  const rippleIdRef = useRef(0);
  const lowFpsCountRef = useRef(0);

  // ─── Core Hooks ───────────────────────────────────────────────────────────
  const kiosk = useKioskMode(kioskEnabled);
  const idle = useIdleDetection({ 
    idleTimeout: 60000,      // 60s → attract mode
    deepIdleTimeout: 300000, // 5min → deep idle
    enabled: kioskEnabled,
  });

  // ─── Attract Mode: Control Globe Speed via CSS Custom Property ────────────
  useEffect(() => {
    const root = document.documentElement;
    if (idle.isIdle && !idle.isDeepIdle) {
      // Attract mode: faster rotation, more dramatic
      root.style.setProperty('--globe-rotate-speed', '0.8');
      root.style.setProperty('--arc-intensity', '1.4');
      root.style.setProperty('--attract-active', '1');
    } else if (idle.isDeepIdle) {
      // Deep idle: slow, contemplative
      root.style.setProperty('--globe-rotate-speed', '0.1');
      root.style.setProperty('--arc-intensity', '0.6');
      root.style.setProperty('--attract-active', '0');
    } else {
      // Active: normal speed
      root.style.setProperty('--globe-rotate-speed', '0.2');
      root.style.setProperty('--arc-intensity', '1.0');
      root.style.setProperty('--attract-active', '0');
    }
  }, [idle.isIdle, idle.isDeepIdle]);

  // ─── Performance Auto-Quality Reduction ───────────────────────────────────
  useEffect(() => {
    if (!kioskEnabled) return;

    const checkPerformance = () => {
      if (kiosk.fps < 20) {
        lowFpsCountRef.current += 1;
        // After 5 consecutive low-FPS readings, reduce quality
        if (lowFpsCountRef.current >= 5) {
          if (qualityLevel === 'high') {
            setQualityLevel('medium');
            document.documentElement.style.setProperty('--render-quality', '0.75');
          } else if (qualityLevel === 'medium') {
            setQualityLevel('low');
            document.documentElement.style.setProperty('--render-quality', '0.5');
          }
          lowFpsCountRef.current = 0;
        }
      } else if (kiosk.fps > 45 && qualityLevel !== 'high') {
        lowFpsCountRef.current = 0;
        // Recover quality when performance improves
        setQualityLevel('high');
        document.documentElement.style.setProperty('--render-quality', '1.0');
      } else {
        lowFpsCountRef.current = 0;
      }
    };

    const interval = setInterval(checkPerformance, 2000);
    return () => clearInterval(interval);
  }, [kioskEnabled, kiosk.fps, qualityLevel]);

  // ─── Stale Data Detection ─────────────────────────────────────────────────
  useEffect(() => {
    if (!kioskEnabled) return;

    // Check if data is stale (no update in 5 minutes)
    const checkStale = () => {
      const elapsed = Date.now() - lastDataTimestamp;
      if (elapsed > 5 * 60 * 1000) {
        setStaleData(true);
      } else {
        setStaleData(false);
      }
    };

    const interval = setInterval(checkStale, 30000);
    return () => clearInterval(interval);
  }, [kioskEnabled, lastDataTimestamp]);

  // Listen for successful data fetches to reset stale timer
  useEffect(() => {
    const handleDataUpdate = () => {
      setLastDataTimestamp(Date.now());
      setStaleData(false);
    };

    // Listen for custom event dispatched by ThreatContext on data refresh
    window.addEventListener('threat-data-updated', handleDataUpdate);
    return () => window.removeEventListener('threat-data-updated', handleDataUpdate);
  }, []);

  // ─── Touch Gesture Handler ────────────────────────────────────────────────
  const handleGesture = useCallback((event: GestureEvent) => {
    switch (event.type) {
      case 'triple_tap_corner':
        setOperatorPanelOpen(true);
        break;
      case 'tap':
        addRipple(event.x, event.y);
        break;
      case 'double_tap':
        if (kiosk.isFullscreen) {
          kiosk.exitFullscreen();
        } else {
          kiosk.enterFullscreen();
        }
        break;
      case 'swipe_left':
      case 'swipe_right':
        // Dispatch custom event for panels to handle navigation
        window.dispatchEvent(new CustomEvent('display-swipe', { 
          detail: { direction: event.type === 'swipe_left' ? 'left' : 'right' } 
        }));
        break;
      case 'pinch_in':
      case 'pinch_out':
        // Dispatch custom event for globe zoom
        window.dispatchEvent(new CustomEvent('display-pinch', { 
          detail: { scale: event.scale, type: event.type } 
        }));
        break;
      case 'long_press':
        // Dispatch custom event for detail inspection
        window.dispatchEvent(new CustomEvent('display-long-press', { 
          detail: { x: event.x, y: event.y } 
        }));
        break;
    }
  }, [kiosk]);

  useTouchGestures(shellRef, {
    onGesture: handleGesture,
    enabled: kioskEnabled,
  });

  // ─── Ripple Effect ────────────────────────────────────────────────────────
  const addRipple = useCallback((x: number, y: number) => {
    const id = rippleIdRef.current++;
    setRipples(prev => [...prev, { id, x, y }]);
    setTimeout(() => {
      setRipples(prev => prev.filter(r => r.id !== id));
    }, 800);
  }, []);

  // ─── Ambient Brightness (time-of-day) ────────────────────────────────────
  useEffect(() => {
    if (!kioskEnabled) return;
    
    const updateAmbientBrightness = () => {
      const hour = new Date().getHours();
      let targetBrightness = 1.0;
      
      // Dim at night (10pm–6am) for hallway comfort
      if (hour >= 22 || hour < 6) {
        targetBrightness = 0.6;
      } else if (hour >= 20 || hour < 7) {
        targetBrightness = 0.8;
      }
      
      // Further dim in deep idle
      if (idle.isDeepIdle) {
        targetBrightness *= 0.5;
      }
      
      setBrightness(targetBrightness);
    };

    updateAmbientBrightness();
    const interval = setInterval(updateAmbientBrightness, 60000);
    return () => clearInterval(interval);
  }, [kioskEnabled, idle.isDeepIdle]);

  // ─── Fullscreen Fallback: F11 Key Listener ────────────────────────────────
  useEffect(() => {
    if (!kioskEnabled) return;

    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === 'F11') {
        e.preventDefault();
        if (document.fullscreenElement) {
          kiosk.exitFullscreen();
        } else {
          kiosk.enterFullscreen();
        }
      }
    };

    document.addEventListener('keydown', handleKeydown);
    return () => document.removeEventListener('keydown', handleKeydown);
  }, [kioskEnabled, kiosk]);

  // ─── Operator Panel Actions ───────────────────────────────────────────────
  const handleOperatorAction = useCallback((action: string) => {
    switch (action) {
      case 'refresh':
        window.location.reload();
        break;
      case 'fullscreen':
        kiosk.enterFullscreen();
        break;
      case 'exit_fullscreen':
        kiosk.exitFullscreen();
        break;
      case 'clear_cache':
        if ('caches' in window) {
          caches.keys().then(names => names.forEach(name => caches.delete(name)));
        }
        localStorage.clear();
        sessionStorage.clear();
        window.location.reload();
        break;
      case 'brightness_up':
        setBrightness(prev => Math.min(prev + 0.1, 1.0));
        break;
      case 'brightness_down':
        setBrightness(prev => Math.max(prev - 0.1, 0.2));
        break;
    }
  }, [kiosk]);

  // ─── Attract Mode Visual Enhancement ─────────────────────────────────────
  const attractModeClass = idle.isIdle && !idle.isDeepIdle
    ? 'attract-mode'
    : idle.isDeepIdle
      ? 'deep-idle-mode'
      : '';

  return (
    <div 
      ref={shellRef}
      className={`relative w-screen h-screen overflow-hidden ${attractModeClass}`}
      style={{ 
        filter: `brightness(${brightness})`,
        transition: 'filter 2s ease-in-out',
      }}
      data-quality={qualityLevel}
    >
      {/* Main Content */}
      {children}

      {/* Touch Ripple Effects */}
      {ripples.map(ripple => (
        <div
          key={ripple.id}
          className="fixed pointer-events-none z-[9000]"
          style={{ left: ripple.x - 30, top: ripple.y - 30 }}
        >
          <div className="w-[60px] h-[60px] rounded-full border-2 border-[var(--color-cp-accent)] opacity-0 animate-ripple" />
        </div>
      ))}

      {/* Idle State Indicator — attract mode with "Touch to interact" */}
      {idle.isIdle && !operatorPanelOpen && (
        <div className="fixed inset-0 pointer-events-none z-[8000]">
          <div className="absolute inset-0 border-2 border-[var(--color-cp-accent)]/10 rounded-none animate-ambient" />
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-fade-in">
            <div className="w-12 h-12 rounded-full border-2 border-[var(--color-cp-accent)]/40 flex items-center justify-center">
              <div className="w-3 h-3 rounded-full bg-[var(--color-cp-accent)]/60 animate-live-pulse" />
            </div>
            <span className="text-[var(--color-cp-text-tertiary)] text-caption font-data tracking-widest uppercase opacity-60">
              Touch to interact
            </span>
          </div>
        </div>
      )}

      {/* FPS Counter + Quality Level (toggleable via operator panel) */}
      {showFPS && (
        <div className="fixed top-2 left-2 z-[8500] bg-black/70 px-2 py-1 rounded text-xs font-mono text-green-400 flex gap-3">
          <span>{kiosk.fps} FPS</span>
          <span className={qualityLevel === 'high' ? 'text-green-400' : qualityLevel === 'medium' ? 'text-amber-400' : 'text-red-400'}>
            Q:{qualityLevel.toUpperCase()}
          </span>
          <span className="text-gray-500">
            {Math.round((performance as any).memory?.usedJSHeapSize / 1048576 || 0)}MB
          </span>
        </div>
      )}

      {/* Connection Health Warning */}
      {kiosk.connectionHealth === 'offline' && (
        <div className="fixed top-0 left-0 right-0 z-[8800] bg-red-900/90 text-white text-center py-2 text-sm font-mono">
          NETWORK OFFLINE — Displaying cached data
        </div>
      )}

      {/* Stale Data Warning */}
      {staleData && kiosk.connectionHealth !== 'offline' && (
        <div className="fixed top-0 left-0 right-0 z-[8800] bg-amber-900/80 text-amber-200 text-center py-1.5 text-xs font-mono">
          DATA STALE — Last update {Math.round((Date.now() - lastDataTimestamp) / 60000)}m ago — Attempting reconnect...
        </div>
      )}

      {/* Operator Panel */}
      <OperatorPanel
        isOpen={operatorPanelOpen}
        onClose={() => setOperatorPanelOpen(false)}
        diagnostics={{
          fps: kiosk.fps,
          uptime: kiosk.uptime,
          isFullscreen: kiosk.isFullscreen,
          isWakeLocked: kiosk.isWakeLocked,
          connectionHealth: kiosk.connectionHealth,
          lastError: kiosk.lastError,
          idleState: idle.idleState,
          brightness,
        }}
        onAction={handleOperatorAction}
      />
    </div>
  );
}
