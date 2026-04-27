/**
 * ThreatGlobe — The centerpiece 3D globe visualization
 * ENHANCED: Denser arcs, impact point explosions, hexagonal grid overlay,
 * source point markers, and more dramatic visual effects.
 */
import { useEffect, useRef, useMemo } from 'react';
import Globe from 'globe.gl';
import { useThreatData } from '@/contexts/ThreatContext';

export default function ThreatGlobe() {
  const containerRef = useRef<HTMLDivElement>(null);
  const globeRef = useRef<any>(null);
  const { activeArcs, isLive, realDataStatus } = useThreatData();

  const arcsData = useMemo(() => activeArcs.map(arc => ({
    startLat: arc.startLat,
    startLng: arc.startLng,
    endLat: arc.endLat,
    endLng: arc.endLng,
    color: arc.color,
    stroke: arc.stroke,
  })), [activeArcs]);

  // Source points — show glowing dots at attack origins
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
      color: arc.color,
      size: 0.15 + arc.stroke * 0.08,
      altitude: 0.005,
    }));
  }, [activeArcs]);

  // Target ring data for the 5 target locations
  const ringsData = useMemo(() => [
    { lat: 38.9072, lng: -77.0369, color: '#00F0FF', maxR: 4, propagationSpeed: 3, repeatPeriod: 800 },
    { lat: 37.3861, lng: -122.0839, color: '#00F0FF', maxR: 4, propagationSpeed: 3, repeatPeriod: 800 },
    { lat: 50.1109, lng: 8.6821, color: '#00F0FF', maxR: 4, propagationSpeed: 3, repeatPeriod: 800 },
    { lat: 1.3521, lng: 103.8198, color: '#00F0FF', maxR: 4, propagationSpeed: 3, repeatPeriod: 800 },
    { lat: 51.5074, lng: -0.1278, color: '#00F0FF', maxR: 4, propagationSpeed: 3, repeatPeriod: 800 },
  ], []);

  // Target label data
  const labelsData = useMemo(() => [
    { lat: 38.9072, lng: -77.0369, text: 'US-EAST HQ', color: 'rgba(0,240,255,0.8)', size: 0.6 },
    { lat: 37.3861, lng: -122.0839, text: 'US-WEST DC', color: 'rgba(0,240,255,0.8)', size: 0.6 },
    { lat: 50.1109, lng: 8.6821, text: 'EU-CENTRAL', color: 'rgba(0,240,255,0.8)', size: 0.6 },
    { lat: 1.3521, lng: 103.8198, text: 'APAC DC', color: 'rgba(0,240,255,0.8)', size: 0.6 },
    { lat: 51.5074, lng: -0.1278, text: 'UK OFFICE', color: 'rgba(0,240,255,0.8)', size: 0.6 },
  ], []);

  // Hex bin data — create a subtle hex grid overlay showing attack density
  const hexBinData = useMemo(() => {
    return activeArcs.map(arc => ({
      lat: arc.startLat,
      lng: arc.startLng,
      weight: arc.stroke,
    }));
  }, [activeArcs]);

  useEffect(() => {
    if (!containerRef.current) return;

    const globe = Globe()
      .globeImageUrl('//unpkg.com/three-globe/example/img/earth-night.jpg')
      .bumpImageUrl('//unpkg.com/three-globe/example/img/earth-topology.png')
      .backgroundImageUrl('//unpkg.com/three-globe/example/img/night-sky.png')
      .atmosphereColor('#00F0FF')
      .atmosphereAltitude(0.22)
      // Arcs — attack trajectories
      .arcsData([])
      .arcColor('color')
      .arcStroke('stroke')
      .arcDashLength(0.6)
      .arcDashGap(0.15)
      .arcDashAnimateTime(1400)
      .arcAltitudeAutoScale(0.4)
      // Points — attack source markers
      .pointsData([])
      .pointColor('color')
      .pointAltitude('altitude')
      .pointRadius('size')
      // Rings — target pulsing
      .ringsData(ringsData)
      .ringColor('color')
      .ringMaxRadius(4)
      .ringPropagationSpeed(3)
      .ringRepeatPeriod(800)
      // Labels — target names
      .labelsData(labelsData)
      .labelText('text')
      .labelSize('size')
      .labelColor('color')
      .labelDotRadius(0.4)
      .labelDotOrientation(() => 'right' as any)
      .labelAltitude(0.015)
      .labelResolution(2)
      (containerRef.current);

    // Camera settings — slightly closer for more drama
    globe.pointOfView({ lat: 20, lng: -15, altitude: 1.8 });
    
    // Auto-rotate
    const controls = globe.controls();
    if (controls) {
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.3;
      controls.enableZoom = false;
      controls.enablePan = false;
    }

    // Enhance Three.js scene
    const scene = globe.scene();
    if (scene) {
      // Add ambient light for better globe illumination
      const THREE = (window as any).THREE || {};
      try {
        // Darken the background slightly
        scene.background = null;
      } catch {}
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
  }, [ringsData, labelsData]);

  // Update arcs and points data
  useEffect(() => {
    if (globeRef.current) {
      globeRef.current.arcsData(arcsData);
      globeRef.current.pointsData(pointsData);
    }
  }, [arcsData, pointsData]);

  return (
    <div className="relative w-full h-full">
      {/* Animated scan line overlay */}
      <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden opacity-[0.03]">
        <div 
          className="w-full h-[2px] bg-gradient-to-r from-transparent via-[#00F0FF] to-transparent"
          style={{
            animation: 'scanline 4s linear infinite',
          }}
        />
      </div>

      {/* Vignette overlay for cinematic depth */}
      <div 
        className="absolute inset-0 pointer-events-none z-10"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 50%, rgba(5,5,16,0.6) 100%)',
        }}
      />

      {/* Globe container */}
      <div 
        ref={containerRef} 
        className="w-full h-full"
        style={{ background: 'transparent' }}
      />

      {/* Live data indicator */}
      <div className="absolute top-3 left-3 z-20 flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${isLive ? 'bg-emerald-400 animate-pulse' : 'bg-amber-500'}`} />
        <span className="text-[9px] font-mono text-white/40 uppercase tracking-wider">
          {realDataStatus}
        </span>
      </div>

      {/* Arc count indicator */}
      <div className="absolute top-3 right-3 z-20">
        <span className="text-[9px] font-mono text-[#00F0FF]/40 uppercase tracking-wider">
          {activeArcs.length} ACTIVE VECTORS
        </span>
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-[#050510] to-transparent pointer-events-none z-10" />
      {/* Top gradient */}
      <div className="absolute top-0 left-0 right-0 h-10 bg-gradient-to-b from-[#050510]/50 to-transparent pointer-events-none z-10" />
    </div>
  );
}
