/**
 * useUltraWide — Detects if the viewport has an ultra-wide aspect ratio
 * 
 * Returns true when the viewport aspect ratio exceeds 21:9 (2.33:1).
 * Used to adapt the layout for ultra-wide monitors (21:9, 32:9, 48:9).
 */
import { useState, useEffect } from 'react';

export function useUltraWide(threshold = 2.33): boolean {
  const [isUltraWide, setIsUltraWide] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth / window.innerHeight > threshold;
  });

  useEffect(() => {
    const check = () => {
      setIsUltraWide(window.innerWidth / window.innerHeight > threshold);
    };
    
    window.addEventListener('resize', check);
    check();
    return () => window.removeEventListener('resize', check);
  }, [threshold]);

  return isUltraWide;
}
