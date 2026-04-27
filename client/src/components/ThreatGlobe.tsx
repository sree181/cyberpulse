/**
 * ThreatGlobe — The centerpiece 3D globe visualization
 * Design: Dark Ops Command Center — near-black globe with night-lights texture,
 * cyan atmospheric glow, and animated attack arcs color-coded by type.
 */
import { useEffect, useRef, useMemo, useCallback } from 'react';
import Globe from 'globe.gl';
import { useThreatData } from '@/contexts/ThreatContext';

export default function ThreatGlobe() {
  const containerRef = useRef<HTMLDivElement>(null);
  const globeRef = useRef<any>(null);
  const { activeArcs } = useThreatData();

  const arcsData = useMemo(() => activeArcs.map(arc => ({
    startLat: arc.startLat,
    startLng: arc.startLng,
    endLat: arc.endLat,
    endLng: arc.endLng,
    color: arc.color,
    stroke: arc.stroke,
  })), [activeArcs]);

  // Target ring data for the 5 target locations
  const ringsData = useMemo(() => [
    { lat: 38.9072, lng: -77.0369, color: '#00F0FF', maxR: 3, propagationSpeed: 2, repeatPeriod: 1200 },
    { lat: 37.3861, lng: -122.0839, color: '#00F0FF', maxR: 3, propagationSpeed: 2, repeatPeriod: 1200 },
    { lat: 50.1109, lng: 8.6821, color: '#00F0FF', maxR: 3, propagationSpeed: 2, repeatPeriod: 1200 },
    { lat: 1.3521, lng: 103.8198, color: '#00F0FF', maxR: 3, propagationSpeed: 2, repeatPeriod: 1200 },
    { lat: 51.5074, lng: -0.1278, color: '#00F0FF', maxR: 3, propagationSpeed: 2, repeatPeriod: 1200 },
  ], []);

  // Target label data
  const labelsData = useMemo(() => [
    { lat: 38.9072, lng: -77.0369, text: 'US-EAST HQ', color: 'rgba(0,240,255,0.7)', size: 0.5 },
    { lat: 37.3861, lng: -122.0839, text: 'US-WEST DC', color: 'rgba(0,240,255,0.7)', size: 0.5 },
    { lat: 50.1109, lng: 8.6821, text: 'EU-CENTRAL', color: 'rgba(0,240,255,0.7)', size: 0.5 },
    { lat: 1.3521, lng: 103.8198, text: 'APAC DC', color: 'rgba(0,240,255,0.7)', size: 0.5 },
    { lat: 51.5074, lng: -0.1278, text: 'UK OFFICE', color: 'rgba(0,240,255,0.7)', size: 0.5 },
  ], []);

  useEffect(() => {
    if (!containerRef.current) return;

    const globe = Globe()
      .globeImageUrl('//unpkg.com/three-globe/example/img/earth-night.jpg')
      .bumpImageUrl('//unpkg.com/three-globe/example/img/earth-topology.png')
      .backgroundImageUrl('//unpkg.com/three-globe/example/img/night-sky.png')
      .atmosphereColor('#00F0FF')
      .atmosphereAltitude(0.18)
      .arcsData([])
      .arcColor('color')
      .arcStroke('stroke')
      .arcDashLength(0.5)
      .arcDashGap(0.25)
      .arcDashAnimateTime(1800)
      .arcAltitudeAutoScale(0.35)
      .ringsData(ringsData)
      .ringColor('color')
      .ringMaxRadius(3)
      .ringPropagationSpeed(2)
      .ringRepeatPeriod(1200)
      .labelsData(labelsData)
      .labelText('text')
      .labelSize('size')
      .labelColor('color')
      .labelDotRadius(0.35)
      .labelDotOrientation(() => 'right' as any)
      .labelAltitude(0.01)
      .labelResolution(2)
      (containerRef.current);

    // Camera settings
    globe.pointOfView({ lat: 25, lng: -20, altitude: 2.0 });
    
    // Auto-rotate
    const controls = globe.controls();
    if (controls) {
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.25;
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
  }, [ringsData, labelsData]);

  // Update arcs data
  useEffect(() => {
    if (globeRef.current) {
      globeRef.current.arcsData(arcsData);
    }
  }, [arcsData]);

  return (
    <div className="relative w-full h-full">
      {/* Subtle scan line overlay */}
      <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden opacity-[0.02]">
        <div className="w-full h-[2px] bg-[#00F0FF] animate-scanline" />
      </div>
      {/* Globe container */}
      <div 
        ref={containerRef} 
        className="w-full h-full"
        style={{ background: 'transparent' }}
      />
      {/* Bottom gradient fade into network topology */}
      <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[#050510] to-transparent pointer-events-none z-10" />
      {/* Top gradient for seamless header blend */}
      <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-[#050510]/50 to-transparent pointer-events-none z-10" />
    </div>
  );
}
