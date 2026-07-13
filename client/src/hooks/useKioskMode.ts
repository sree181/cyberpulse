/**
 * useKioskMode — Display Engineering: Kiosk/Presentation Mode
 * 
 * Handles:
 * - Fullscreen API with auto-enter on first touch
 * - Wake Lock API to prevent screen blanking
 * - Invisible video fallback for older browsers
 * - Auto-recovery from errors (exponential backoff reload)
 * - Screensaver prevention
 * - Connection health monitoring
 * 
 * Designed for unattended large-format touch displays in public spaces.
 */
import { useEffect, useRef, useState, useCallback } from 'react';

interface KioskState {
  isFullscreen: boolean;
  isWakeLocked: boolean;
  isKioskActive: boolean;
  lastError: string | null;
  uptime: number; // seconds since page load
  fps: number;
  connectionHealth: 'healthy' | 'degraded' | 'offline';
}

export function useKioskMode(enabled: boolean = true) {
  const [state, setState] = useState<KioskState>({
    isFullscreen: false,
    isWakeLocked: false,
    isKioskActive: false,
    lastError: null,
    uptime: 0,
    fps: 60,
    connectionHealth: 'healthy',
  });

  const wakeLockRef = useRef<any>(null);
  const uptimeRef = useRef(0);
  const fpsFramesRef = useRef<number[]>([]);
  const lastFrameTimeRef = useRef(performance.now());
  const errorCountRef = useRef(0);
  const reloadTimerRef = useRef<NodeJS.Timeout | null>(null);

  // ─── Fullscreen Management ────────────────────────────────────────────────
  const enterFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) return;
      await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
      setState(s => ({ ...s, isFullscreen: true }));
    } catch (e) {
      // Fullscreen may be blocked by browser policy — that's OK for kiosk
      console.warn('[Kiosk] Fullscreen request denied:', e);
    }
  }, []);

  const exitFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) return;
      await document.exitFullscreen();
      setState(s => ({ ...s, isFullscreen: false }));
    } catch (e) {
      console.warn('[Kiosk] Exit fullscreen failed:', e);
    }
  }, []);

  // ─── Wake Lock (Screensaver Prevention) ───────────────────────────────────
  const acquireWakeLock = useCallback(async () => {
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        setState(s => ({ ...s, isWakeLocked: true }));
        
        // Re-acquire on visibility change (tab becomes visible again)
        wakeLockRef.current.addEventListener('release', () => {
          setState(s => ({ ...s, isWakeLocked: false }));
        });
      }
    } catch (e) {
      console.warn('[Kiosk] Wake Lock failed, using video fallback:', e);
      startVideoFallback();
    }
  }, []);

  // Video-based screensaver prevention fallback
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const startVideoFallback = useCallback(() => {
    if (videoRef.current) return;
    const video = document.createElement('video');
    video.setAttribute('playsinline', '');
    video.setAttribute('muted', '');
    video.setAttribute('loop', '');
    video.style.cssText = 'position:fixed;top:-1px;left:-1px;width:1px;height:1px;opacity:0.01;pointer-events:none;z-index:-1;';
    // Minimal valid MP4 (1x1 black pixel, 1 frame)
    video.src = 'data:video/mp4;base64,AAAAIGZ0eXBpc29tAAACAGlzb21pc28yYXZjMW1wNDEAAAAIZnJlZQAAAAhtZGF0AAAA';
    document.body.appendChild(video);
    video.play().catch(() => {});
    videoRef.current = video;
  }, []);

  // ─── FPS Monitor ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!enabled) return;
    let rafId: number;
    
    const measureFPS = () => {
      const now = performance.now();
      const delta = now - lastFrameTimeRef.current;
      lastFrameTimeRef.current = now;
      
      fpsFramesRef.current.push(delta);
      if (fpsFramesRef.current.length > 60) fpsFramesRef.current.shift();
      
      // Update FPS every 30 frames
      if (fpsFramesRef.current.length % 30 === 0) {
        const avgDelta = fpsFramesRef.current.reduce((a, b) => a + b, 0) / fpsFramesRef.current.length;
        const fps = Math.round(1000 / avgDelta);
        setState(s => ({ ...s, fps: Math.min(fps, 120) }));
      }
      
      rafId = requestAnimationFrame(measureFPS);
    };
    
    rafId = requestAnimationFrame(measureFPS);
    return () => cancelAnimationFrame(rafId);
  }, [enabled]);

  // ─── Uptime Counter ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!enabled) return;
    const interval = setInterval(() => {
      uptimeRef.current += 1;
      setState(s => ({ ...s, uptime: uptimeRef.current }));
    }, 1000);
    return () => clearInterval(interval);
  }, [enabled]);

  // ─── Auto-Recovery (Error Boundary Integration) ───────────────────────────
  const handleError = useCallback((error: string) => {
    errorCountRef.current += 1;
    setState(s => ({ ...s, lastError: error }));
    
    // Exponential backoff: 5s, 10s, 20s, 40s, max 60s
    const delay = Math.min(5000 * Math.pow(2, errorCountRef.current - 1), 60000);
    
    if (reloadTimerRef.current) clearTimeout(reloadTimerRef.current);
    reloadTimerRef.current = setTimeout(() => {
      window.location.reload();
    }, delay);
  }, []);

  const resetErrors = useCallback(() => {
    errorCountRef.current = 0;
    setState(s => ({ ...s, lastError: null }));
    if (reloadTimerRef.current) {
      clearTimeout(reloadTimerRef.current);
      reloadTimerRef.current = null;
    }
  }, []);

  // ─── Connection Health Monitor ────────────────────────────────────────────
  useEffect(() => {
    if (!enabled) return;
    
    const checkConnection = () => {
      if (!navigator.onLine) {
        setState(s => ({ ...s, connectionHealth: 'offline' }));
      } else {
        setState(s => ({ ...s, connectionHealth: 'healthy' }));
      }
    };

    window.addEventListener('online', checkConnection);
    window.addEventListener('offline', checkConnection);
    checkConnection();

    return () => {
      window.removeEventListener('online', checkConnection);
      window.removeEventListener('offline', checkConnection);
    };
  }, [enabled]);

  // ─── Initialize Kiosk Mode ────────────────────────────────────────────────
  useEffect(() => {
    if (!enabled) return;

    // Auto-enter fullscreen on first user interaction (required by browsers)
    const handleFirstInteraction = () => {
      enterFullscreen();
      acquireWakeLock();
      setState(s => ({ ...s, isKioskActive: true }));
      // Remove listener after first interaction
      document.removeEventListener('click', handleFirstInteraction);
      document.removeEventListener('touchstart', handleFirstInteraction);
    };

    document.addEventListener('click', handleFirstInteraction, { once: true });
    document.addEventListener('touchstart', handleFirstInteraction, { once: true });

    // Re-acquire wake lock on visibility change
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && enabled) {
        acquireWakeLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Listen for fullscreen changes
    const handleFullscreenChange = () => {
      setState(s => ({ ...s, isFullscreen: !!document.fullscreenElement }));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    // Prevent context menu on touch displays
    const preventContextMenu = (e: Event) => e.preventDefault();
    document.addEventListener('contextmenu', preventContextMenu);

    // Prevent pinch-zoom on the page level (we handle it ourselves)
    const preventDefaultZoom = (e: TouchEvent) => {
      if (e.touches.length > 1) e.preventDefault();
    };
    document.addEventListener('touchmove', preventDefaultZoom, { passive: false });

    return () => {
      document.removeEventListener('click', handleFirstInteraction);
      document.removeEventListener('touchstart', handleFirstInteraction);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('contextmenu', preventContextMenu);
      document.removeEventListener('touchmove', preventDefaultZoom);
      if (wakeLockRef.current) wakeLockRef.current.release();
      if (videoRef.current) videoRef.current.remove();
      if (reloadTimerRef.current) clearTimeout(reloadTimerRef.current);
    };
  }, [enabled, enterFullscreen, acquireWakeLock]);

  return {
    ...state,
    enterFullscreen,
    exitFullscreen,
    handleError,
    resetErrors,
  };
}
