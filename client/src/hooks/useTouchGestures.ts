/**
 * useTouchGestures — Display Engineering: Touch-First Interactions
 * 
 * Purpose-built for large-format touch displays (55"–98" planar screens).
 * 
 * Gestures supported:
 * - TAP: Single touch < 300ms (equivalent to click)
 * - LONG_PRESS: Touch held > 800ms (show details/context)
 * - SWIPE: Horizontal/vertical swipe > 50px (navigate panels)
 * - PINCH: Two-finger pinch (zoom globe)
 * - DOUBLE_TAP: Two taps within 400ms (toggle zoom)
 * - TRIPLE_TAP_CORNER: Three taps in corner (operator panel)
 * 
 * Large screens need larger gesture thresholds (fingers are further from eyes).
 */
import { useEffect, useRef, useCallback, useState } from 'react';

export interface GestureEvent {
  type: 'tap' | 'double_tap' | 'long_press' | 'swipe_left' | 'swipe_right' | 'swipe_up' | 'swipe_down' | 'pinch_in' | 'pinch_out' | 'triple_tap_corner';
  x: number;
  y: number;
  velocity?: number;
  scale?: number;
}

interface TouchGestureConfig {
  onGesture?: (event: GestureEvent) => void;
  swipeThreshold?: number;     // px minimum for swipe (default: 80 for large screens)
  longPressDelay?: number;     // ms before long press fires (default: 800)
  enabled?: boolean;
}

export function useTouchGestures(
  elementRef: React.RefObject<HTMLElement | null>,
  config: TouchGestureConfig = {}
) {
  const {
    onGesture,
    swipeThreshold = 80,
    longPressDelay = 800,
    enabled = true,
  } = config;

  const [lastGesture, setLastGesture] = useState<GestureEvent | null>(null);

  // Touch state tracking
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const tapCountRef = useRef(0);
  const tapTimerRef = useRef<NodeJS.Timeout | null>(null);
  const initialPinchDistRef = useRef<number | null>(null);
  const cornerTapCountRef = useRef(0);
  const cornerTapTimerRef = useRef<NodeJS.Timeout | null>(null);

  const emit = useCallback((event: GestureEvent) => {
    setLastGesture(event);
    onGesture?.(event);
  }, [onGesture]);

  // Check if touch is in a corner (for operator panel access)
  const isCornerTouch = useCallback((x: number, y: number) => {
    const threshold = 80; // px from corner
    const w = window.innerWidth;
    const h = window.innerHeight;
    return (
      (x < threshold && y < threshold) ||           // top-left
      (x > w - threshold && y < threshold) ||       // top-right
      (x < threshold && y > h - threshold) ||       // bottom-left
      (x > w - threshold && y > h - threshold)      // bottom-right
    );
  }, []);

  useEffect(() => {
    if (!enabled || !elementRef.current) return;
    const el = elementRef.current;

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };

      // Long press detection
      longPressTimerRef.current = setTimeout(() => {
        if (touchStartRef.current) {
          emit({
            type: 'long_press',
            x: touchStartRef.current.x,
            y: touchStartRef.current.y,
          });
          touchStartRef.current = null; // Consume the touch
        }
      }, longPressDelay);

      // Pinch detection (two fingers)
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        initialPinchDistRef.current = Math.sqrt(dx * dx + dy * dy);
      }

      // Corner tap detection (for operator panel)
      if (isCornerTouch(touch.clientX, touch.clientY)) {
        cornerTapCountRef.current += 1;
        if (cornerTapTimerRef.current) clearTimeout(cornerTapTimerRef.current);
        
        if (cornerTapCountRef.current >= 3) {
          emit({ type: 'triple_tap_corner', x: touch.clientX, y: touch.clientY });
          cornerTapCountRef.current = 0;
        } else {
          cornerTapTimerRef.current = setTimeout(() => {
            cornerTapCountRef.current = 0;
          }, 1000);
        }
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      // Cancel long press on move
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }

      // Pinch gesture
      if (e.touches.length === 2 && initialPinchDistRef.current !== null) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const currentDist = Math.sqrt(dx * dx + dy * dy);
        const scale = currentDist / initialPinchDistRef.current;
        
        if (Math.abs(scale - 1) > 0.2) {
          const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
          const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
          emit({
            type: scale > 1 ? 'pinch_out' : 'pinch_in',
            x: midX,
            y: midY,
            scale,
          });
          initialPinchDistRef.current = currentDist; // Reset for continuous
        }
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }

      initialPinchDistRef.current = null;

      if (!touchStartRef.current) return;

      const touch = e.changedTouches[0];
      const dx = touch.clientX - touchStartRef.current.x;
      const dy = touch.clientY - touchStartRef.current.y;
      const dt = Date.now() - touchStartRef.current.time;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const velocity = distance / dt;

      // Swipe detection
      if (distance > swipeThreshold && dt < 500) {
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);
        
        if (absDx > absDy) {
          emit({
            type: dx > 0 ? 'swipe_right' : 'swipe_left',
            x: touch.clientX,
            y: touch.clientY,
            velocity,
          });
        } else {
          emit({
            type: dy > 0 ? 'swipe_down' : 'swipe_up',
            x: touch.clientX,
            y: touch.clientY,
            velocity,
          });
        }
      }
      // Tap detection (short touch, minimal movement)
      else if (dt < 300 && distance < 20) {
        tapCountRef.current += 1;
        
        if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
        
        if (tapCountRef.current === 2) {
          emit({ type: 'double_tap', x: touch.clientX, y: touch.clientY });
          tapCountRef.current = 0;
        } else {
          tapTimerRef.current = setTimeout(() => {
            if (tapCountRef.current === 1) {
              emit({ type: 'tap', x: touch.clientX, y: touch.clientY });
            }
            tapCountRef.current = 0;
          }, 400);
        }
      }

      touchStartRef.current = null;
    };

    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchmove', handleTouchMove, { passive: true });
    el.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
      if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
      if (cornerTapTimerRef.current) clearTimeout(cornerTapTimerRef.current);
    };
  }, [enabled, elementRef, emit, swipeThreshold, longPressDelay, isCornerTouch]);

  return { lastGesture };
}
