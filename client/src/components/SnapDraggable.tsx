/**
 * SnapDraggable — Touch-friendly draggable wrapper that snaps to predefined positions.
 * 
 * Used for Top Sources / Top Targets overlays on the globe.
 * Supports 6 snap positions within the parent container.
 * Position persists in localStorage.
 */
import { useState, useRef, useCallback, useEffect, ReactNode } from 'react';

type SnapPosition = 'top-left' | 'top-right' | 'middle-left' | 'middle-right' | 'bottom-left' | 'bottom-right';

const SNAP_STYLES: Record<SnapPosition, { top?: string; bottom?: string; left?: string; right?: string; transform?: string }> = {
  'top-left': { top: '16px', left: '16px' },
  'top-right': { top: '16px', right: '16px' },
  'middle-left': { top: '50%', left: '16px', transform: 'translateY(-50%)' },
  'middle-right': { top: '50%', right: '16px', transform: 'translateY(-50%)' },
  'bottom-left': { bottom: '80px', left: '16px' },
  'bottom-right': { bottom: '80px', right: '16px' },
};

interface SnapDraggableProps {
  id: string;
  defaultPosition: SnapPosition;
  children: ReactNode;
  className?: string;
}

export function SnapDraggable({ id, defaultPosition, children, className = '' }: SnapDraggableProps) {
  const storageKey = `cyberpulse-snap-${id}`;
  
  const [position, setPosition] = useState<SnapPosition>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved && saved in SNAP_STYLES) return saved as SnapPosition;
    } catch {}
    return defaultPosition;
  });

  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 });
  const elementRef = useRef<HTMLDivElement>(null);
  const parentRef = useRef<HTMLElement | null>(null);
  const startPosRef = useRef({ x: 0, y: 0 });
  const hasMoved = useRef(false);

  // Persist position
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, position);
    } catch {}
  }, [position, storageKey]);

  // Find nearest snap position based on current drag coordinates
  const findNearestSnap = useCallback((clientX: number, clientY: number): SnapPosition => {
    const parent = parentRef.current;
    if (!parent) return position;

    const rect = parent.getBoundingClientRect();
    const relX = (clientX - rect.left) / rect.width;
    const relY = (clientY - rect.top) / rect.height;

    // Determine column (left/right)
    const col = relX < 0.5 ? 'left' : 'right';
    
    // Determine row (top/middle/bottom)
    let row: 'top' | 'middle' | 'bottom';
    if (relY < 0.33) row = 'top';
    else if (relY < 0.66) row = 'middle';
    else row = 'bottom';

    return `${row}-${col}` as SnapPosition;
  }, [position]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    const el = elementRef.current;
    if (!el) return;

    parentRef.current = el.parentElement;
    const elRect = el.getBoundingClientRect();
    
    startPosRef.current = { x: touch.clientX, y: touch.clientY };
    setDragOffset({
      x: touch.clientX - elRect.left,
      y: touch.clientY - elRect.top,
    });
    setDragPos({ x: elRect.left, y: elRect.top });
    hasMoved.current = false;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    const dx = Math.abs(touch.clientX - startPosRef.current.x);
    const dy = Math.abs(touch.clientY - startPosRef.current.y);
    
    // Only start dragging after 15px movement to avoid interfering with taps
    if (!isDragging && (dx > 15 || dy > 15)) {
      setIsDragging(true);
      hasMoved.current = true;
    }

    if (isDragging || dx > 15 || dy > 15) {
      e.preventDefault();
      setDragPos({
        x: touch.clientX - dragOffset.x,
        y: touch.clientY - dragOffset.y,
      });
    }
  }, [isDragging, dragOffset]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (hasMoved.current && isDragging) {
      const touch = e.changedTouches[0];
      const newPos = findNearestSnap(touch.clientX, touch.clientY);
      setPosition(newPos);
    }
    setIsDragging(false);
  }, [isDragging, findNearestSnap]);

  // Mouse drag support for desktop testing
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const el = elementRef.current;
    if (!el) return;

    parentRef.current = el.parentElement;
    const elRect = el.getBoundingClientRect();
    
    startPosRef.current = { x: e.clientX, y: e.clientY };
    setDragOffset({
      x: e.clientX - elRect.left,
      y: e.clientY - elRect.top,
    });
    setDragPos({ x: elRect.left, y: elRect.top });
    hasMoved.current = false;

    const handleMouseMove = (me: MouseEvent) => {
      const dx = Math.abs(me.clientX - startPosRef.current.x);
      const dy = Math.abs(me.clientY - startPosRef.current.y);
      
      if (dx > 10 || dy > 10) {
        setIsDragging(true);
        hasMoved.current = true;
        setDragPos({
          x: me.clientX - dragOffset.x,
          y: me.clientY - dragOffset.y,
        });
      }
    };

    const handleMouseUp = (me: MouseEvent) => {
      if (hasMoved.current) {
        const newPos = findNearestSnap(me.clientX, me.clientY);
        setPosition(newPos);
      }
      setIsDragging(false);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [dragOffset, findNearestSnap]);

  const snapStyle = SNAP_STYLES[position];

  return (
    <div
      ref={elementRef}
      className={`absolute z-20 transition-all ${isDragging ? 'duration-0 opacity-80 scale-105' : 'duration-300 ease-out'} ${className}`}
      style={
        isDragging
          ? { position: 'fixed', left: dragPos.x, top: dragPos.y, transform: 'none' }
          : { ...snapStyle }
      }
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
    >
      {children}
    </div>
  );
}
