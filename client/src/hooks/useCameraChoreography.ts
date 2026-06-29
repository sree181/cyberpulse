/**
 * useCameraChoreography — Cinematic camera path for kiosk/passive mode
 * 
 * When in passive mode (kiosk), the globe camera follows a choreographed path:
 * - Slow orbital rotation (base)
 * - Periodic smooth dips toward active hotspots
 * - Brief pauses at dramatic horizon angles
 * - Gentle altitude oscillation (breathing effect)
 * 
 * Designed for hallway/museum displays where the globe should feel alive
 * and draw attention to threat activity without user interaction.
 */
import { useEffect, useRef, useCallback } from 'react';
import type { ArcData } from '@/contexts/ThreatContext';

interface CameraWaypoint {
  lat: number;
  lng: number;
  altitude: number;
  duration: number; // ms to reach this waypoint
  pause: number;    // ms to hold at this position
}

interface CameraChoreographyOptions {
  globeRef: React.MutableRefObject<any>;
  activeArcs: ArcData[];
  isPassive: boolean; // true when in kiosk passive mode
  isZoomed: boolean;  // don't choreograph when user has zoomed
}

export function useCameraChoreography({
  globeRef,
  activeArcs,
  isPassive,
  isZoomed,
}: CameraChoreographyOptions) {
  const animFrameRef = useRef<number | null>(null);
  const waypointIndexRef = useRef(0);
  const phaseRef = useRef<'transit' | 'hold' | 'breathe'>('transit');
  const phaseStartRef = useRef(Date.now());
  const activeRef = useRef(false);

  // Generate dynamic waypoints based on current threat hotspots
  const generateWaypoints = useCallback((): CameraWaypoint[] => {
    const baseWaypoints: CameraWaypoint[] = [
      // Dramatic horizon angles
      { lat: 20, lng: -30, altitude: 2.2, duration: 8000, pause: 4000 },
      { lat: 45, lng: 30, altitude: 1.8, duration: 6000, pause: 3000 },
      { lat: -10, lng: 100, altitude: 2.0, duration: 7000, pause: 3000 },
      { lat: 55, lng: -90, altitude: 1.6, duration: 6000, pause: 5000 },
      { lat: 0, lng: 150, altitude: 2.4, duration: 8000, pause: 3000 },
    ];

    // Add hotspot dips based on active threats
    const criticalArcs = activeArcs.filter(a => a.severity === 'critical' || a.severity === 'high');
    const hotspots: CameraWaypoint[] = criticalArcs.slice(0, 3).map(arc => ({
      lat: arc.endLat,
      lng: arc.endLng,
      altitude: 1.0, // Dip closer for dramatic effect
      duration: 4000,
      pause: 3000,
    }));

    // Interleave hotspot dips with base orbital path
    const combined: CameraWaypoint[] = [];
    let hotspotIdx = 0;
    baseWaypoints.forEach((wp, i) => {
      combined.push(wp);
      // Insert a hotspot dip every 2 base waypoints
      if (i % 2 === 1 && hotspotIdx < hotspots.length) {
        combined.push(hotspots[hotspotIdx]);
        // Return to higher altitude after dip
        combined.push({
          lat: hotspots[hotspotIdx].lat + 15,
          lng: hotspots[hotspotIdx].lng + 20,
          altitude: 2.0,
          duration: 5000,
          pause: 2000,
        });
        hotspotIdx++;
      }
    });

    return combined.length > 0 ? combined : baseWaypoints;
  }, [activeArcs]);

  // Breathing effect — gentle altitude oscillation
  const breatheAmplitude = 0.08;
  const breathePeriod = 12000; // 12s full cycle

  useEffect(() => {
    if (!isPassive || isZoomed) {
      // Stop choreography
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      activeRef.current = false;
      return;
    }

    activeRef.current = true;
    const waypoints = generateWaypoints();
    waypointIndexRef.current = 0;
    phaseRef.current = 'transit';
    phaseStartRef.current = Date.now();

    const moveToNextWaypoint = () => {
      if (!globeRef.current || !activeRef.current) return;

      const wp = waypoints[waypointIndexRef.current % waypoints.length];
      const now = Date.now();
      const elapsed = now - phaseStartRef.current;

      if (phaseRef.current === 'transit') {
        // Navigate to waypoint
        if (elapsed < 100) {
          // Just started — initiate the move
          globeRef.current.pointOfView(
            { lat: wp.lat, lng: wp.lng, altitude: wp.altitude },
            wp.duration
          );
        }
        if (elapsed >= wp.duration) {
          // Arrived — switch to hold phase
          phaseRef.current = 'hold';
          phaseStartRef.current = now;
        }
      } else if (phaseRef.current === 'hold') {
        // Hold at position with breathing
        const breatheOffset = Math.sin((elapsed / breathePeriod) * Math.PI * 2) * breatheAmplitude;
        if (elapsed % 2000 < 50) {
          // Gentle altitude adjustment every 2s
          const currentPov = globeRef.current.pointOfView();
          globeRef.current.pointOfView(
            { ...currentPov, altitude: wp.altitude + breatheOffset },
            1800
          );
        }
        if (elapsed >= wp.pause) {
          // Move to next waypoint
          waypointIndexRef.current = (waypointIndexRef.current + 1) % waypoints.length;
          phaseRef.current = 'transit';
          phaseStartRef.current = now;
        }
      }

      animFrameRef.current = requestAnimationFrame(moveToNextWaypoint);
    };

    // Disable auto-rotate during choreography (we control the camera)
    if (globeRef.current) {
      const controls = globeRef.current.controls();
      if (controls) {
        controls.autoRotate = false;
      }
    }

    animFrameRef.current = requestAnimationFrame(moveToNextWaypoint);

    return () => {
      activeRef.current = false;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      // Re-enable auto-rotate when exiting passive mode
      if (globeRef.current) {
        const controls = globeRef.current.controls();
        if (controls) {
          controls.autoRotate = true;
          controls.autoRotateSpeed = 0.2;
        }
      }
    };
  }, [isPassive, isZoomed, globeRef, generateWaypoints]);
}
