/**
 * usePanelOrder — Zone-based panel ordering with localStorage persistence.
 * 
 * Each zone (left-column, right-column, bottom-row) maintains an ordered
 * list of panel IDs. Drag-and-drop reorders panels within their zone only.
 * The order persists across page refreshes via localStorage.
 * 
 * Includes a lock/unlock mode — panels are locked by default and cannot
 * be dragged. When unlocked, drag handles appear and panels can be reordered.
 */
import { useState, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'cyberpulse-panel-order';
const LOCK_KEY = 'cyberpulse-panel-locked';

export interface ZoneConfig {
  id: string;
  defaultOrder: string[];
}

export interface PanelOrderState {
  [zoneId: string]: string[];
}

function loadPersistedOrder(zones: ZoneConfig[]): PanelOrderState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as PanelOrderState;
      // Validate that stored order contains the same panel IDs as defaults
      const result: PanelOrderState = {};
      for (const zone of zones) {
        const storedZone = parsed[zone.id];
        if (storedZone && storedZone.length === zone.defaultOrder.length &&
            zone.defaultOrder.every(id => storedZone.includes(id))) {
          result[zone.id] = storedZone;
        } else {
          result[zone.id] = zone.defaultOrder;
        }
      }
      return result;
    }
  } catch {
    // Ignore parse errors
  }
  
  const result: PanelOrderState = {};
  for (const zone of zones) {
    result[zone.id] = zone.defaultOrder;
  }
  return result;
}

function loadLockedState(): boolean {
  try {
    const stored = localStorage.getItem(LOCK_KEY);
    if (stored !== null) {
      return JSON.parse(stored);
    }
  } catch {
    // Ignore
  }
  // Default: locked
  return true;
}

export function usePanelOrder(zones: ZoneConfig[]) {
  const [order, setOrder] = useState<PanelOrderState>(() => loadPersistedOrder(zones));
  const [isLocked, setIsLocked] = useState<boolean>(() => loadLockedState());

  // Persist order to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(order));
    } catch {
      // Ignore quota errors
    }
  }, [order]);

  // Persist lock state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(LOCK_KEY, JSON.stringify(isLocked));
    } catch {
      // Ignore quota errors
    }
    // Notify DisplayShell of lock state change
    window.dispatchEvent(new CustomEvent('cyberpulse:layout-lock-changed', { detail: { isLocked } }));
  }, [isLocked]);

  // Listen for operator panel commands (reset layout, toggle lock)
  useEffect(() => {
    const handleReset = () => {
      const result: PanelOrderState = {};
      for (const zone of zones) {
        result[zone.id] = zone.defaultOrder;
      }
      setOrder(result);
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        // Ignore
      }
    };
    const handleToggleLock = () => {
      setIsLocked(prev => !prev);
    };
    window.addEventListener('cyberpulse:reset-layout', handleReset);
    window.addEventListener('cyberpulse:toggle-layout-lock', handleToggleLock);
    return () => {
      window.removeEventListener('cyberpulse:reset-layout', handleReset);
      window.removeEventListener('cyberpulse:toggle-layout-lock', handleToggleLock);
    };
  }, [zones]);

  const reorder = useCallback((zoneId: string, oldIndex: number, newIndex: number) => {
    // Only allow reorder when unlocked
    if (isLocked) return;
    setOrder(prev => {
      const zoneOrder = [...(prev[zoneId] || [])];
      const [moved] = zoneOrder.splice(oldIndex, 1);
      zoneOrder.splice(newIndex, 0, moved);
      return { ...prev, [zoneId]: zoneOrder };
    });
  }, [isLocked]);

  const resetOrder = useCallback(() => {
    const result: PanelOrderState = {};
    for (const zone of zones) {
      result[zone.id] = zone.defaultOrder;
    }
    setOrder(result);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore
    }
  }, [zones]);

  const toggleLock = useCallback(() => {
    setIsLocked(prev => !prev);
  }, []);

  const lock = useCallback(() => {
    setIsLocked(true);
  }, []);

  const unlock = useCallback(() => {
    setIsLocked(false);
  }, []);

  return { order, reorder, resetOrder, isLocked, toggleLock, lock, unlock };
}
