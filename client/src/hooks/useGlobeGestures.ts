/**
 * useGlobeGestures — Touch gesture detection for the 3D globe
 * 
 * Detects:
 * - Pinch-to-zoom (two fingers moving apart/together) — globe.gl OrbitControls
 *   handles the actual zoom; this hook provides start/end callbacks for UI feedback
 * - Long-press (single finger held for 800ms) — opens country dossier
 * - Swipe-up (fast upward swipe from bottom 40% of container) — opens timeline
 * - Double-tap (two quick taps within 300ms) — resets view
 * 
 * Note: Two-finger rotation is handled natively by globe.gl's OrbitControls.
 * This hook only adds higher-level gesture detection on top.
 */
import { useCallback, useRef, useEffect } from 'react';

interface GestureCallbacks {
  onLongPress?: (lat: number, lng: number, screenX: number, screenY: number) => void;
  onSwipeUp?: () => void;
  onDoubleTap?: (screenX: number, screenY: number) => void;
  onPinchStart?: () => void;
  onPinchEnd?: (scale: number) => void;
}

interface TouchState {
  startTime: number;
  startX: number;
  startY: number;
  lastTapTime: number;
  longPressTimer: ReturnType<typeof setTimeout> | null;
  isPinching: boolean;
  initialPinchDistance: number;
  lastPinchDistance: number;
}

export function useGlobeGestures(
  containerRef: React.RefObject<HTMLDivElement | null>,
  callbacks: GestureCallbacks,
  enabled: boolean = true
) {
  const stateRef = useRef<TouchState>({
    startTime: 0,
    startX: 0,
    startY: 0,
    lastTapTime: 0,
    longPressTimer: null,
    isPinching: false,
    initialPinchDistance: 0,
    lastPinchDistance: 0,
  });

  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  const getDistance = useCallback((t1: Touch, t2: Touch) => {
    const dx = t1.clientX - t2.clientX;
    const dy = t1.clientY - t2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !enabled) return;

    const state = stateRef.current;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        const touch = e.touches[0];
        state.startTime = Date.now();
        state.startX = touch.clientX;
        state.startY = touch.clientY;

        // Start long-press timer
        if (state.longPressTimer) clearTimeout(state.longPressTimer);
        state.longPressTimer = setTimeout(() => {
          // Fire long-press with screen coordinates
          callbacksRef.current.onLongPress?.(
            touch.clientY,
            touch.clientX,
            touch.clientX,
            touch.clientY
          );
        }, 800);
      } else if (e.touches.length === 2) {
        // Cancel long-press on multi-touch
        if (state.longPressTimer) {
          clearTimeout(state.longPressTimer);
          state.longPressTimer = null;
        }
        const dist = getDistance(e.touches[0], e.touches[1]);
        state.isPinching = true;
        state.initialPinchDistance = dist;
        state.lastPinchDistance = dist;
        callbacksRef.current.onPinchStart?.();
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1 && state.longPressTimer) {
        const touch = e.touches[0];
        const dx = touch.clientX - state.startX;
        const dy = touch.clientY - state.startY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Cancel long-press if finger moved more than 10px
        if (distance > 10) {
          clearTimeout(state.longPressTimer);
          state.longPressTimer = null;
        }
      }

      // Track pinch distance during move
      if (e.touches.length === 2 && state.isPinching) {
        state.lastPinchDistance = getDistance(e.touches[0], e.touches[1]);
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (state.longPressTimer) {
        clearTimeout(state.longPressTimer);
        state.longPressTimer = null;
      }

      if (state.isPinching && e.touches.length < 2) {
        state.isPinching = false;
        const scale = state.initialPinchDistance > 0 
          ? state.lastPinchDistance / state.initialPinchDistance 
          : 1;
        callbacksRef.current.onPinchEnd?.(scale);
      }

      // Detect swipe-up
      if (e.changedTouches.length === 1 && !state.isPinching) {
        const touch = e.changedTouches[0];
        const dy = state.startY - touch.clientY;
        const dx = Math.abs(touch.clientX - state.startX);
        const duration = Date.now() - state.startTime;
        const containerHeight = container.getBoundingClientRect().height;
        
        // Swipe-up: fast upward movement from bottom 40% of container
        if (
          dy > 80 && 
          dx < 60 && 
          duration < 400 && 
          state.startY > containerHeight * 0.6
        ) {
          callbacksRef.current.onSwipeUp?.();
        }

        // Double-tap detection
        const now = Date.now();
        if (now - state.lastTapTime < 300 && duration < 200) {
          callbacksRef.current.onDoubleTap?.(touch.clientX, touch.clientY);
        }
        state.lastTapTime = now;
      }
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: true });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      if (state.longPressTimer) clearTimeout(state.longPressTimer);
    };
  }, [containerRef, enabled, getDistance]);
}
