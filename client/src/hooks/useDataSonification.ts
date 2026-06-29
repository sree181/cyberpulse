/**
 * useDataSonification — Connects threat data to the sonification engine
 * 
 * Listens for new threats and plays pitch-shifted pings.
 * Also plays periodic ambient drones based on overall threat level.
 */
import { useEffect, useRef } from 'react';
import { useThreatData } from '@/contexts/ThreatContext';
import { dataSonification } from '@/lib/dataSonification';

export function useDataSonification(enabled: boolean) {
  const { threats, stats } = useThreatData();
  const lastThreatCountRef = useRef(0);
  const droneIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Enable/disable engine
  useEffect(() => {
    if (enabled) {
      dataSonification.enable();
    } else {
      dataSonification.disable();
    }
  }, [enabled]);

  // React to new threats
  useEffect(() => {
    if (!enabled) return;
    if (threats.length <= lastThreatCountRef.current) {
      lastThreatCountRef.current = threats.length;
      return;
    }

    const newThreats = threats.slice(lastThreatCountRef.current);
    lastThreatCountRef.current = threats.length;

    // Play pings for new threats (max 3 per batch to avoid overload)
    const toPlay = newThreats.slice(0, 3);
    toPlay.forEach((threat, i) => {
      setTimeout(() => {
        dataSonification.ping(threat.severity as 'critical' | 'high' | 'medium' | 'low');
      }, i * 200); // Stagger by 200ms
    });
  }, [threats, enabled]);

  // Periodic ambient drone based on threat level
  useEffect(() => {
    if (!enabled) {
      if (droneIntervalRef.current) {
        clearInterval(droneIntervalRef.current);
        droneIntervalRef.current = null;
      }
      return;
    }

    droneIntervalRef.current = setInterval(() => {
      const threatLevel = Math.min(1, stats.critical / 10);
      dataSonification.ambientDrone(threatLevel);
    }, 8000); // Every 8 seconds

    return () => {
      if (droneIntervalRef.current) clearInterval(droneIntervalRef.current);
    };
  }, [enabled, stats.critical]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      dataSonification.disable();
    };
  }, []);
}
