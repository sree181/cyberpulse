/**
 * useCameraChoreography — Cinematic camera paths for kiosk/passive mode
 * 
 * When kiosk mode enters passive state, this hook takes over the globe camera
 * and performs slow, dramatic orbital movements:
 * - Gentle altitude oscillation (breathing effect)
 * - Smooth latitude drift toward active hotspots
 * - Occasional dramatic low-angle sweeps
 * 
 * All JS-only — no extra GPU objects, no WebGL load.
 */
import { useEffect, useRef } from 'react';

interface CameraChoreographyOptions {
  globeRef: React.MutableRefObject<any>;
  isPassive: boolean;
  hotspots?: { lat: number; lng: number }[];
}

export function useCameraChoreography({ globeRef, isPassive, hotspots = [] }: CameraChoreographyOptions) {
  const animFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!isPassive || !globeRef.current) {
      // When returning to interactive, cancel animation and restore defaults
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      return;
    }

    startTimeRef.current = Date.now();

    // Camera path waypoints — dramatic angles
    const waypoints = [
      { lat: 30, lng: -20, altitude: 2.2 },   // Atlantic overview
      { lat: 45, lng: 30, altitude: 1.8 },    // Europe close
      { lat: 10, lng: 100, altitude: 2.0 },   // Asia-Pacific
      { lat: -10, lng: -60, altitude: 2.4 },  // South America wide
      { lat: 55, lng: 80, altitude: 1.6 },    // Russia/Central Asia low angle
      { lat: 35, lng: -100, altitude: 1.9 },  // North America
    ];

    // Add hotspot waypoints (zoom toward active attack sources)
    if (hotspots.length > 0) {
      const topHotspot = hotspots[0];
      waypoints.splice(2, 0, { lat: topHotspot.lat, lng: topHotspot.lng, altitude: 1.4 });
    }

    let currentWaypoint = 0;
    const TRANSITION_DURATION = 12000; // 12s per transition — slow and cinematic

    const animate = () => {
      if (!globeRef.current) return;

      const elapsed = Date.now() - startTimeRef.current;
      const waypointElapsed = elapsed % TRANSITION_DURATION;
      const progress = waypointElapsed / TRANSITION_DURATION;

      // Smooth easing (ease-in-out cubic)
      const eased = progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;

      const nextWaypoint = (currentWaypoint + 1) % waypoints.length;
      const from = waypoints[currentWaypoint];
      const to = waypoints[nextWaypoint];

      // Interpolate camera position
      const lat = from.lat + (to.lat - from.lat) * eased;
      const lng = from.lng + (to.lng - from.lng) * eased;
      // Add subtle breathing oscillation to altitude
      const breathe = Math.sin(elapsed * 0.0003) * 0.15;
      const altitude = from.altitude + (to.altitude - from.altitude) * eased + breathe;

      globeRef.current.pointOfView({ lat, lng, altitude }, 0);

      // Advance waypoint
      if (waypointElapsed >= TRANSITION_DURATION - 16) {
        currentWaypoint = nextWaypoint;
        startTimeRef.current = Date.now();
      }

      animFrameRef.current = requestAnimationFrame(animate);
    };

    // Disable auto-rotate when choreography takes over
    const controls = globeRef.current.controls();
    if (controls) {
      controls.autoRotate = false;
    }

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      // Restore auto-rotate when leaving passive mode
      if (globeRef.current) {
        const controls = globeRef.current.controls();
        if (controls) {
          controls.autoRotate = true;
          controls.autoRotateSpeed = 0.2;
        }
      }
    };
  }, [isPassive, globeRef, hotspots]);
}
