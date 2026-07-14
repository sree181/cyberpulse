/**
 * ThreatGlobe — Event-Level Intelligence Visualization
 * 
 * REDESIGN: Each arc on the globe corresponds EXACTLY to a threat feed entry.
 * 
 * Visual Architecture:
 * - PRIMARY LAYER: Individual Event Arcs (1 arc = 1 threat feed entry)
 *   Each arc uses the EXACT source→target coordinates from the event.
 *   Color = attack type, Stroke = severity, Animation = directional pulse
 * - SECONDARY LAYER: Corridor Beams (faint background showing aggregate patterns)
 *   Very low opacity, wide, static — shows "where campaigns are happening"
 * - TARGET RINGS: Dynamic pressure indicators (pulse rate = attack volume)
 * - SOURCE HOTSPOTS: Glow at countries with concentrated attackers
 * 
 * Key Principle: If you see "SSH Brute Force from 45.33.32.156 → EU-CENTRAL DC :22"
 * in the threat feed, you MUST see an arc from Shanghai to Frankfurt on the globe.
 */
import { useEffect, useRef, useMemo, useCallback, useState } from 'react';
import Globe from 'globe.gl';
import { useThreatData, type ArcData } from '@/contexts/ThreatContext';
import { BRANDING } from '@/lib/branding';
import { MapView } from '@/components/Map';
import { trpc } from '@/lib/trpc';
import type { Corridor } from '@/lib/corridorEngine';

// Attack type legend (matches threat feed colors)
const ATTACK_TYPE_LEGEND = [
  { label: 'SSH Brute Force', color: BRANDING.attackColors['SSH Brute Force'] },
  { label: 'Port Scan', color: BRANDING.attackColors['Port Scan'] },
  { label: 'SQL Injection', color: BRANDING.attackColors['SQL Injection'] },
  { label: 'DDoS', color: BRANDING.attackColors['DDoS'] },
  { label: 'Malware C2', color: BRANDING.attackColors['Malware C2'] },
];

// Dark map style for the detail view
const DARK_MAP_STYLES: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#0C2340' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0C2340' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8a9ab5' }] },
  { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#1a3a5c' }] },
  { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#0a1e38' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#0e2848' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#152d4a' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#1a3a5c' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#0e2848' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#050d18' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#3a5a7a' }] },
];

// Globe arc datum
interface GlobeArcDatum {
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  color: string[];
  stroke: number | null;
  dashLength: number;
  dashGap: number;
  animateTime: number;
  dashInitialGap: number;
  id: string;
  layer: 'event' | 'corridor';
  // For click/drill-down
  originalArc?: ArcData;
  corridor?: Corridor;
}

export default function ThreatGlobe() {
  const containerRef = useRef<HTMLDivElement>(null);
  const globeRef = useRef<any>(null);
  const autoZoomTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isZoomedRef = useRef(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomedArc, setZoomedArc] = useState<ArcData | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [mapLoading, setMapLoading] = useState(true);
  const mapMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  
  const { activeArcs, corridors, targetPressures, sourceHotspots, setSelectedArc } = useThreatData();

  // Default camera position — closer to globe for better arc visibility
  const defaultPOV = { lat: 20, lng: 30, altitude: 1.6 };

  /**
   * EVENT-LEVEL ARC DATASET
   * 
   * PRIMARY LAYER: Each activeArc = one visible arc on the globe.
   * These use the EXACT coordinates from the threat event.
   * The threat feed shows "IP → Target :port" and the globe shows
   * the corresponding arc from that IP's location to that target's location.
   * 
   * SECONDARY LAYER: Corridors as faint background beams (very low opacity).
   * These show aggregate patterns but don't compete with individual events.
   */
  const combinedArcs = useMemo(() => {
    const result: GlobeArcDatum[] = [];
    
    // Layer 1 (BACKGROUND): Corridor beams — very faint, wide, showing aggregate patterns
    corridors.forEach((corridor) => {
      // Very low opacity so they don't compete with event arcs
      result.push({
        startLat: corridor.sourceLat,
        startLng: corridor.sourceLng,
        endLat: corridor.targetLat,
        endLng: corridor.targetLng,
        color: [`${corridor.color}18`, `${corridor.color}08`], // Very faint (0.09 → 0.03 opacity)
        stroke: corridor.width * 1.5, // Wide but transparent — "ghost corridor"
        dashLength: 1,
        dashGap: 0,
        animateTime: 0, // Static background
        dashInitialGap: 0,
        id: `corridor-${corridor.id}`,
        layer: 'corridor',
        corridor,
      });
    });

    // Layer 2 (PRIMARY): Individual event arcs — each one maps 1:1 to a threat feed entry
    activeArcs.forEach((arc) => {
      // Thick, bold strokes for large-format display visibility
      const severityStroke = arc.severity === 'critical' ? 4.0 
        : arc.severity === 'high' ? 3.0 
        : 2.0;
      
      // Animation speed based on severity (critical = fast, low = slow)
      const animSpeed = arc.severity === 'critical' ? 1000 
        : arc.severity === 'high' ? 1500 
        : arc.severity === 'medium' ? 2000 
        : 2800;

      // Age-based opacity: newer arcs are fully opaque, older ones fade slightly
      const age = Date.now() - arc.timestamp;
      const maxAge = 10000; // arcs live 10 seconds
      const ageFactor = Math.max(0.5, 1 - (age / maxAge) * 0.5);
      const headOpacity = Math.round(ageFactor * 255).toString(16).padStart(2, '0');
      const tailOpacity = Math.round(ageFactor * 0.6 * 255).toString(16).padStart(2, '0');

      result.push({
        startLat: arc.startLat,
        startLng: arc.startLng,
        endLat: arc.endLat,
        endLng: arc.endLng,
        color: [`${arc.color}${headOpacity}`, `${arc.color}${tailOpacity}`],
        stroke: severityStroke,
        dashLength: 0.6,       // Longer visible segment (more visible projectile)
        dashGap: 0.15,         // Smaller gap = more continuous look
        animateTime: animSpeed, // Directional animation speed
        dashInitialGap: Math.random() * 0.3, // Less stagger for campaign coherence
        id: `event-${arc.id}`,
        layer: 'event',
        originalArc: arc,
      });
    });

    return result;
  }, [activeArcs, corridors]);

  // Source hotspot glow elements
  const hotspotElements = useMemo(() => {
    return sourceHotspots.map(hotspot => ({
      lat: hotspot.lat,
      lng: hotspot.lng,
      color: hotspot.color,
      radius: hotspot.radius,
      intensity: hotspot.intensity,
      country: hotspot.country,
      totalEvents: hotspot.totalEvents,
    }));
  }, [sourceHotspots]);

  // Create/update glow DOM elements for source hotspots
  const hotspotElementFn = useCallback((d: any) => {
    const el = document.createElement('div');
    const size = Math.max(30, d.radius * 25);
    el.style.width = `${size}px`;
    el.style.height = `${size}px`;
    el.style.borderRadius = '50%';
    el.style.background = `radial-gradient(circle, ${d.color} 0%, transparent 70%)`;
    el.style.boxShadow = `0 0 ${size * 0.6}px ${size * 0.3}px ${d.color}`;
    el.style.animation = `pulse-glow ${2 + (1 - d.intensity) * 2}s ease-in-out infinite`;
    el.style.pointerEvents = 'none';
    el.style.transform = 'translate(-50%, -50%)';
    el.title = `${d.country}: ${d.totalEvents} attacks`;
    return el;
  }, []);

  // Dynamic target rings
  const ringsData = useMemo(() => {
    if (targetPressures.length === 0) {
      return [
        { lat: 38.9072, lng: -77.0369, color: 'rgba(221, 85, 12, 0.08)', maxR: 1.5, propagationSpeed: 0.8, repeatPeriod: 2500 },
        { lat: 37.3861, lng: -122.0839, color: 'rgba(221, 85, 12, 0.08)', maxR: 1.5, propagationSpeed: 0.8, repeatPeriod: 2500 },
        { lat: 50.1109, lng: 8.6821, color: 'rgba(221, 85, 12, 0.08)', maxR: 1.5, propagationSpeed: 0.8, repeatPeriod: 2500 },
        { lat: 1.3521, lng: 103.8198, color: 'rgba(221, 85, 12, 0.08)', maxR: 1.5, propagationSpeed: 0.8, repeatPeriod: 2500 },
        { lat: 51.5074, lng: -0.1278, color: 'rgba(221, 85, 12, 0.08)', maxR: 1.5, propagationSpeed: 0.8, repeatPeriod: 2500 },
      ];
    }
    return targetPressures.map(target => ({
      lat: target.lat,
      lng: target.lng,
      color: target.color,
      maxR: target.maxRadius,
      propagationSpeed: 2.5 - target.pressure * 1.8,
      repeatPeriod: target.pulseRate,
    }));
  }, [targetPressures]);

  // Zoom to a specific arc
  const zoomToArc = useCallback((arc: ArcData) => {
    if (!globeRef.current) return;
    
    isZoomedRef.current = true;
    setIsZoomed(true);
    setZoomedArc(arc);
    setSelectedArc(arc);
    setMapLoading(true);
    
    setTimeout(() => setShowMap(true), 800);

    globeRef.current.pointOfView(
      { lat: arc.startLat, lng: arc.startLng, altitude: 0.6 },
      1500
    );

    const controls = globeRef.current.controls();
    if (controls) {
      controls.autoRotate = false;
    }

    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    inactivityTimerRef.current = setTimeout(() => {
      returnToOverview();
    }, 15000);
  }, [setSelectedArc]);

  // Return to default overview
  const returnToOverview = useCallback(() => {
    if (!globeRef.current) return;
    
    isZoomedRef.current = false;
    setIsZoomed(false);
    setZoomedArc(null);
    setShowMap(false);
    setMapLoading(true);
    setSelectedArc(null);

    if (mapMarkerRef.current) {
      mapMarkerRef.current.map = null;
      mapMarkerRef.current = null;
    }

    globeRef.current.pointOfView(defaultPOV, 1500);

    const controls = globeRef.current.controls();
    if (controls) {
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.2;
    }

    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
  }, [setSelectedArc]);

  // Stable refs for auto-zoom and callbacks
  const activeArcsRef = useRef<ArcData[]>([]);
  useEffect(() => { activeArcsRef.current = activeArcs; }, [activeArcs]);

  const zoomToArcRef = useRef(zoomToArc);
  useEffect(() => { zoomToArcRef.current = zoomToArc; }, [zoomToArc]);

  const ringsDataRef = useRef(ringsData);
  useEffect(() => { ringsDataRef.current = ringsData; }, [ringsData]);

  // Auto-track: gently pan the globe to face where arcs are concentrated
  // This ensures arcs are always visible (not on the far side of the globe)
  useEffect(() => {
    autoZoomTimerRef.current = setInterval(() => {
      if (isZoomedRef.current || !globeRef.current) return;

      const arcs = activeArcsRef.current;
      if (arcs.length === 0) return;

      // Compute centroid of all active arc midpoints
      let sumLat = 0, sumLng = 0;
      arcs.forEach(a => {
        sumLat += (a.startLat + a.endLat) / 2;
        sumLng += (a.startLng + a.endLng) / 2;
      });
      const centroidLat = sumLat / arcs.length;
      const centroidLng = sumLng / arcs.length;

      // Gently pan toward the centroid (smooth 3s transition)
      const currentPov = globeRef.current.pointOfView();
      // Only pan if the centroid is significantly different from current view
      const latDiff = Math.abs(currentPov.lat - centroidLat);
      const lngDiff = Math.abs(currentPov.lng - centroidLng);
      if (latDiff > 15 || lngDiff > 25) {
        globeRef.current.pointOfView(
          { lat: centroidLat, lng: centroidLng, altitude: currentPov.altitude },
          3000 // smooth 3-second pan
        );
      }
    }, 8000); // Check every 8 seconds

    return () => {
      if (autoZoomTimerRef.current) clearInterval(autoZoomTimerRef.current);
    };
  }, []);

  // Initialize globe
  useEffect(() => {
    if (!containerRef.current) return;

    const globe = Globe()
      .globeImageUrl('//unpkg.com/three-globe/example/img/earth-night.jpg')
      .bumpImageUrl('//unpkg.com/three-globe/example/img/earth-topology.png')
      .backgroundImageUrl('//unpkg.com/three-globe/example/img/night-sky.png')
      .atmosphereColor('rgba(221, 85, 12, 0.2)')
      .atmosphereAltitude(0.15)
      // ARCS — per-arc accessor functions
      .arcsData([])
      .arcColor('color')
      .arcStroke((d: any) => d.stroke)
      .arcDashLength((d: any) => d.dashLength)
      .arcDashGap((d: any) => d.dashGap)
      .arcDashInitialGap((d: any) => d.dashInitialGap)
      .arcDashAnimateTime((d: any) => d.animateTime)
      .arcAltitudeAutoScale(0.5)
      .arcCurveResolution(64)
      // Click handler — event arcs are clickable
      .onArcClick((arc: any) => {
        if (arc && arc.layer === 'event' && arc.originalArc) {
          zoomToArcRef.current(arc.originalArc);
        }
      })
      // HTML Elements — source hotspot glow
      .htmlElementsData([])
      .htmlElement(hotspotElementFn)
      .htmlAltitude(0.01)
      // Rings — dynamic target pressure
      .ringsData(ringsDataRef.current)
      .ringColor('color')
      .ringMaxRadius((d: any) => d.maxR || 2)
      .ringPropagationSpeed((d: any) => d.propagationSpeed || 1.2)
      .ringRepeatPeriod((d: any) => d.repeatPeriod || 1800)
      (containerRef.current);

    // Camera
    globe.pointOfView(defaultPOV);
    
    // Auto-rotate
    const controls = globe.controls();
    if (controls) {
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.2;
      controls.enableZoom = true;
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

    // ─── Display Engineering: Attract Mode Globe Speed ───────────────────
    const attractObserver = new MutationObserver(() => {
      const speed = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--globe-rotate-speed') || '0.2');
      const ctrl = globeRef.current?.controls();
      if (ctrl) {
        ctrl.autoRotateSpeed = speed;
      }
    });
    attractObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['style'] });

    // ─── Display Engineering: Pinch Gesture for Globe Zoom ───────────────
    const handlePinch = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!globeRef.current) return;
      const pov = globeRef.current.pointOfView();
      const zoomDelta = detail.type === 'pinch_out' ? -0.3 : 0.3;
      const newAlt = Math.max(0.4, Math.min(4.0, pov.altitude + zoomDelta));
      globeRef.current.pointOfView({ ...pov, altitude: newAlt }, 500);
    };
    window.addEventListener('display-pinch', handlePinch);

    // ─── Display Engineering: Long-press for arc inspection ──────
    const handleLongPress = () => {
      const arcs = activeArcsRef.current;
      if (arcs.length > 0) {
        const target = arcs.find(a => a.severity === 'critical') 
          || arcs.find(a => a.severity === 'high') 
          || arcs[0];
        if (target) zoomToArcRef.current(target);
      }
    };
    window.addEventListener('display-long-press', handleLongPress);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('display-pinch', handlePinch);
      window.removeEventListener('display-long-press', handleLongPress);
      attractObserver.disconnect();
      if (autoZoomTimerRef.current) clearInterval(autoZoomTimerRef.current);
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Initialize once — data updates handled by separate effects

  // Update arc, point, and ring data
  useEffect(() => {
    if (!globeRef.current) return;
    globeRef.current.arcsData(combinedArcs);
    globeRef.current.htmlElementsData(hotspotElements);
  }, [combinedArcs, hotspotElements]);

  // Update rings separately (dynamic pressure)
  useEffect(() => {
    if (!globeRef.current) return;
    globeRef.current.ringsData(ringsData);
  }, [ringsData]);

  // Handle Google Maps ready
  const handleMapReady = useCallback((map: google.maps.Map) => {
    setMapLoading(false);
    if (!zoomedArc) return;

    map.setOptions({
      styles: DARK_MAP_STYLES,
      disableDefaultUI: true,
      zoomControl: true,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
    });

    const position = { lat: zoomedArc.startLat, lng: zoomedArc.startLng };
    
    const markerContent = document.createElement('div');
    markerContent.innerHTML = `
      <div style="
        width: 14px; height: 14px; 
        background: ${zoomedArc.color}; 
        border: 2px solid rgba(255,255,255,0.9);
        border-radius: 50%; 
        box-shadow: 0 0 6px ${zoomedArc.color}AA, 0 0 16px ${zoomedArc.color}55;
      "></div>
    `;

    const marker = new google.maps.marker.AdvancedMarkerElement({
      map,
      position,
      content: markerContent,
      title: `${zoomedArc.attackType} from ${zoomedArc.sourceIp}`,
    });

    mapMarkerRef.current = marker;
  }, [zoomedArc]);

  return (
    <div className="relative w-full h-full overflow-hidden rounded-lg">
      {/* Globe container */}
      <div 
        ref={containerRef} 
        className={`absolute inset-0 cursor-pointer transition-all duration-700 ease-in-out ${
          showMap ? 'right-[40%]' : ''
        }`}
      />

      {/* Map detail panel (slides in from right on zoom) */}
      <div className={`absolute top-0 right-0 bottom-0 w-[40%] transition-all duration-700 ease-in-out ${
        showMap ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
      }`}>
        <div className="relative w-full h-full bg-[var(--color-cp-surface)]/50 backdrop-blur-sm border-l border-[var(--color-cp-border)]">
          {mapLoading && (
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <div className="w-5 h-5 border-2 border-[var(--color-cp-accent)] border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          
          {showMap && zoomedArc && (
            <MapView
              initialCenter={{ lat: zoomedArc.startLat, lng: zoomedArc.startLng }}
              initialZoom={6}
              onMapReady={handleMapReady}
            />
          )}

          {/* Info card with event details */}
          {zoomedArc && (
            <ZoomedInfoCard arc={zoomedArc} />
          )}
        </div>
      </div>

      {/* Attack Type Legend — bottom left (only when not zoomed) */}
      {!isZoomed && (
        <div className="absolute bottom-3 left-4 z-10">
          <div className="flex flex-col gap-1.5">
            <div className="font-data text-[9px] text-[var(--color-cp-text-tertiary)] opacity-60 uppercase tracking-wider mb-0.5">
              Attack Type
            </div>
            {ATTACK_TYPE_LEGEND.map(item => (
              <div key={item.label} className="flex items-center gap-2">
                <div 
                  className="w-5 h-[2px] rounded-full"
                  style={{ 
                    backgroundColor: item.color,
                    boxShadow: `0 0 4px ${item.color}66`,
                  }}
                />
                <span className="font-data text-[9px] text-[var(--color-cp-text-tertiary)] opacity-70">
                  {item.label}
                </span>
              </div>
            ))}
          </div>
          {/* Active event count */}
          <div className="mt-2 flex flex-col gap-0.5">
            <div className="font-data text-caption text-[var(--color-cp-text-tertiary)] tabular-nums opacity-50">
              {activeArcs.length} active event{activeArcs.length !== 1 ? 's' : ''}
            </div>
            <div className="font-data text-[8px] text-[var(--color-cp-text-tertiary)] opacity-30">
              Each arc = one threat feed entry
            </div>
          </div>
        </div>
      )}

      {/* Event info — top left when zoomed but map not yet shown */}
      {isZoomed && zoomedArc && !showMap && (
        <div className="absolute top-3 left-4 right-4 z-10 flex items-center justify-between">
          <div className="bg-[var(--color-cp-surface)]/90 backdrop-blur-sm border border-[var(--color-cp-border)] rounded-md px-3 py-2 max-w-[320px]">
            <div className="flex items-center gap-2">
              <div 
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: zoomedArc.color }}
              />
              <span className="font-data text-body font-medium text-[var(--color-cp-text-primary)]">
                {zoomedArc.attackType}
              </span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--color-cp-accent)]/10 text-[var(--color-cp-accent)] font-mono">
                {zoomedArc.sourceCountry} → {zoomedArc.targetName}
              </span>
            </div>
          </div>
          <button
            onClick={returnToOverview}
            className="bg-[var(--color-cp-surface)]/90 backdrop-blur-sm border border-[var(--color-cp-border)] rounded-md px-3 py-1.5 text-caption font-data text-[var(--color-cp-text-secondary)] hover:text-[var(--color-cp-text-primary)] hover:border-[var(--color-cp-accent)] transition-all duration-200 cursor-pointer"
          >
            ← Overview
          </button>
        </div>
      )}

      {/* Interaction hint */}
      {!isZoomed && (
        <div className="absolute top-3 right-4 z-10">
          <span className="font-data text-[9px] text-[var(--color-cp-text-tertiary)] opacity-30">
            Click arc to inspect
          </span>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ZOOMED INFO CARD — Shows event details + CVE linkage
// ═══════════════════════════════════════════════════════════════════════════════

function ZoomedInfoCard({ arc }: { arc: ArcData }) {
  const { data: linkageData } = trpc.ai.attackLinkage.useQuery(undefined, {
    refetchInterval: 15 * 60 * 1000,
    retry: 1,
  });

  // Find linkage for this attack type
  const matchedLinkage = useMemo(() => {
    if (!linkageData?.linkages) return null;
    return linkageData.linkages.find(
      (l: any) => l.attackType === arc.attackType || l.port === arc.port
    );
  }, [linkageData, arc.attackType, arc.port]);

  return (
    <div className="absolute bottom-3 left-3 right-3 z-30 bg-[var(--color-cp-surface)]/95 backdrop-blur-sm border border-[var(--color-cp-border)] rounded-md px-3 py-2">
      {/* Event header */}
      <div className="flex items-center gap-2 mb-1.5">
        <div 
          className="w-2.5 h-2.5 rounded-full"
          style={{ backgroundColor: arc.color }}
        />
        <span className="font-data text-body font-medium text-[var(--color-cp-text-primary)]">
          {arc.attackType}
        </span>
        <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${
          arc.severity === 'critical' ? 'bg-[var(--color-cp-critical)]/15 severity-critical' :
          arc.severity === 'high' ? 'bg-[var(--color-cp-high)]/15 severity-high' :
          'bg-[var(--color-cp-medium)]/15 severity-medium'
        }`}>
          {arc.severity.toUpperCase()}
        </span>
      </div>

      {/* Attack details grid */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-caption font-data">
        <div className="text-[var(--color-cp-text-tertiary)]">Source IP</div>
        <div className="text-[var(--color-cp-text-secondary)] font-mono">{arc.sourceIp}</div>
        <div className="text-[var(--color-cp-text-tertiary)]">Location</div>
        <div className="text-[var(--color-cp-text-secondary)]">{arc.sourceCity}, {arc.sourceCountry}</div>
        <div className="text-[var(--color-cp-text-tertiary)]">Target</div>
        <div className="text-[var(--color-cp-text-secondary)]">{arc.targetName}</div>
        <div className="text-[var(--color-cp-text-tertiary)]">Port / Protocol</div>
        <div className="text-[var(--color-cp-text-secondary)]">:{arc.port} ({arc.protocol})</div>
      </div>

      {/* CVE Linkage section */}
      {matchedLinkage && (
        <div className="mt-2 pt-2 border-t border-[var(--color-cp-border)]">
          <div className="flex items-center gap-1.5 mb-1">
            <div className="w-1.5 h-1.5 rounded-full bg-violet-500" />
            <span className="text-[9px] text-violet-400 font-medium uppercase tracking-wider">Linked CVEs</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(matchedLinkage.linkedCVEs || []).slice(0, 3).map((cve: any) => (
              <div key={cve.cveId} className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-[var(--color-cp-elevated)] border border-[var(--color-cp-border)]">
                <span className="font-data text-[9px] text-[var(--color-cp-text-primary)]">{cve.cveId}</span>
                {cve.cvssScore && (
                  <span className="font-data text-[8px] text-[var(--color-cp-high)]">{cve.cvssScore.toFixed(1)}</span>
                )}
                <span className="font-data text-[8px] text-violet-400">{cve.confidence}%</span>
              </div>
            ))}
          </div>
          {matchedLinkage.mitreTechnique && (
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-[8px] text-[var(--color-cp-text-tertiary)]">MITRE:</span>
              <span className="text-[8px] text-[var(--color-cp-text-secondary)] font-data">{matchedLinkage.mitreTechnique}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
