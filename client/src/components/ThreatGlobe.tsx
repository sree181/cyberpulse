/**
 * ThreatGlobe — The centerpiece 3D globe visualization
 * 
 * Redesign: Clean, cinematic globe. No scan lines, no vignette overlays,
 * no competing text overlays. Let the globe speak for itself.
 * Subtle atmosphere, restrained arc colors, clean target rings.
 */
import { useEffect, useRef, useMemo } from 'react';
import Globe from 'globe.gl';
import { useThreatData } from '@/contexts/ThreatContext';
import { BRANDING } from '@/lib/branding';

export default function ThreatGlobe() {
  const containerRef = useRef<HTMLDivElement>(null);
  const globeRef = useRef<any>(null);
  const { activeArcs } = useThreatData();

  const arcsData = useMemo(() => activeArcs.map(arc => ({
    startLat: arc.startLat,
    startLng: arc.startLng,
    endLat: arc.endLat,
    endLng: arc.endLng,
    color: [`${BRANDING.accentColor}B3`, `${BRANDING.accentColor}0D`],
    stroke: Math.min(arc.stroke * 0.6, 1.2),
  })), [activeArcs]);

  // Source points — subtle dots at attack origins
  const pointsData = useMemo(() => {
    const seen = new Set<string>();
    return activeArcs.filter(arc => {
      const key = `${arc.startLat.toFixed(1)},${arc.startLng.toFixed(1)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).map(arc => ({
      lat: arc.startLat,
      lng: arc.startLng,
      color: `${BRANDING.accentColor}99`,
      size: 0.12,
      altitude: 0.005,
    }));
  }, [activeArcs]);

  // Target ring data — subtle pulsing at target locations
  const ringsData = useMemo(() => [
    { lat: 38.9072, lng: -77.0369, color: 'rgba(221, 85, 12, 0.35)', maxR: 3, propagationSpeed: 2, repeatPeriod: 1200 },
    { lat: 37.3861, lng: -122.0839, color: 'rgba(221, 85, 12, 0.35)', maxR: 3, propagationSpeed: 2, repeatPeriod: 1200 },
    { lat: 50.1109, lng: 8.6821, color: 'rgba(221, 85, 12, 0.35)', maxR: 3, propagationSpeed: 2, repeatPeriod: 1200 },
    { lat: 1.3521, lng: 103.8198, color: 'rgba(221, 85, 12, 0.35)', maxR: 3, propagationSpeed: 2, repeatPeriod: 1200 },
    { lat: 51.5074, lng: -0.1278, color: 'rgba(221, 85, 12, 0.35)', maxR: 3, propagationSpeed: 2, repeatPeriod: 1200 },
  ], []);

  useEffect(() => {
    if (!containerRef.current) return;

    const globe = Globe()
      .globeImageUrl('//unpkg.com/three-globe/example/img/earth-night.jpg')
      .bumpImageUrl('//unpkg.com/three-globe/example/img/earth-topology.png')
      .backgroundImageUrl('//unpkg.com/three-globe/example/img/night-sky.png')
      .atmosphereColor('rgba(221, 85, 12, 0.3)')
      .atmosphereAltitude(0.18)
      // Arcs
      .arcsData([])
      .arcColor('color')
      .arcStroke('stroke')
      .arcDashLength(0.5)
      .arcDashGap(0.2)
      .arcDashAnimateTime(1800)
      .arcAltitudeAutoScale(0.35)
      // Points
      .pointsData([])
      .pointColor('color')
      .pointAltitude('altitude')
      .pointRadius('size')
      // Rings
      .ringsData(ringsData)
      .ringColor('color')
      .ringMaxRadius(3)
      .ringPropagationSpeed(2)
      .ringRepeatPeriod(1200)
      (containerRef.current);

    // Camera
    globe.pointOfView({ lat: 25, lng: -10, altitude: 2.0 });
    
    // Auto-rotate — slow, contemplative
    const controls = globe.controls();
    if (controls) {
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.2;
      controls.enableZoom = false;
      controls.enablePan = false;
    }

    globeRef.current = globe;

    // Handle resize
    const handleResize = () => {
      if (containerRef.current && globeRef.current) {
        globeRef.current.width(containerRef.current.clientWidth);
        globeRef.current.height(containerRef.current.clientHeight);
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [ringsData]);

  // Update arcs and points data
  useEffect(() => {
    if (globeRef.current) {
      globeRef.current.arcsData(arcsData);
      globeRef.current.pointsData(pointsData);
    }
  }, [arcsData, pointsData]);

  return (
    <div className="relative w-full h-full overflow-hidden rounded-lg">
      {/* Globe container */}
      <div 
        ref={containerRef} 
        className="w-full h-full"
      />

      {/* Minimal bottom info */}
      <div className="absolute bottom-3 left-4 z-10">
        <span className="font-data text-caption text-[var(--color-cp-text-tertiary)] tabular-nums">
          {activeArcs.length} active vectors
        </span>
      </div>
    </div>
  );
}
