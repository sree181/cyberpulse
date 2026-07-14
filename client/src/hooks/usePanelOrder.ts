/**
 * usePanelOrder — Zone-based panel ordering with localStorage persistence.
 * 
 * Each zone (left-column, right-column, bottom-row) maintains an ordered
 * list of panel IDs. Drag-and-drop reorders panels within their zone only.
 * The order persists across page refreshes via localStorage.
 */
import { useState, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'cyberpulse-panel-order';

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

export function usePanelOrder(zones: ZoneConfig[]) {
  const [order, setOrder] = useState<PanelOrderState>(() => loadPersistedOrder(zones));

  // Persist to localStorage whenever order changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(order));
    } catch {
      // Ignore quota errors
    }
  }, [order]);

  const reorder = useCallback((zoneId: string, oldIndex: number, newIndex: number) => {
    setOrder(prev => {
      const zoneOrder = [...(prev[zoneId] || [])];
      const [moved] = zoneOrder.splice(oldIndex, 1);
      zoneOrder.splice(newIndex, 0, moved);
      return { ...prev, [zoneId]: zoneOrder };
    });
  }, []);

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

  return { order, reorder, resetOrder };
}
