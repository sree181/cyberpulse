/**
 * ThreatGlobe — Corridor-Based Intelligence Visualization
 * 
 * REDESIGN: From ornamental spaghetti to meaningful data encoding.
 * 
 * Visual Architecture:
 * - PRIMARY LAYER: Attack Corridors (source_country → target)
 *   Width = volume (log scale), Color = severity, Opacity = recency
 * - SECONDARY LAYER: Event Pulses (bright dots traveling along corridors)
 *   One pulse per new event, lives 3 seconds
 * - TARGET RINGS: Dynamic pressure indicators (pulse rate = attack volume)
 * - SOURCE HOTSPOTS: Glow at countries with concentrated attackers
 * 
 * Information Hierarchy:
 * - Hallway (5m): "3 hot corridors, biggest from East Asia"
 * - Stops (2m): "That thick red beam is SSH brute force, 40+ events/min"
 * - Touches: "IP 45.33.32.156 in Shanghai, targeting port 22"
 */
import { useEffect, useRef, useMemo, useCallback, useState } from 'react';
import Globe from 'globe.gl';
import { useThreatData, type ArcData } from '@/contexts/ThreatContext';
import { BRANDING } from '@/lib/branding';
import { MapView } from '@/components/Map';
import { trpc } from '@/lib/trpc';
import type { Corridor, CorridorPulse, TargetPressure } from '@/lib/corridorEngine';

// Severity legend (replaces attack-type legend — severity is what matters at globe scale)
const SEVERITY_LEGEND = [
  { label: 'Critical', color: '#FF2D2D', description: 'Active campaign' },
  { label: 'High', color: '#FF8C00', description: 'Sustained attack' },
  { label: 'Medium', color: '#00D4FF', description: 'Probing' },
  { label: 'Low', color: '#4A9EFF', description: 'Background noise' },
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

// Globe arc datum for the corridor-based rendering
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
  layer: 'corridor' | 'pulse';
  // For click/drill-down
  corridor?: Corridor;
  originalArc?: ArcData;
}

export default function ThreatGlobe() {
  const containerRef = useRef<HTMLDivElement>(null);
  const globeRef = useRef<any>(null);
  const autoZoomTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isZoomedRef = useRef(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomedArc, setZoomedArc] = useState<ArcData | null>(null);
  const [zoomedCorridor, setZoomedCorridor] = useState<Corridor | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [mapLoading, setMapLoading] = useState(true);
  const mapMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  
  const { activeArcs, corridors, corridorPulses, targetPressures, sourceHotspots, setSelectedArc } = useThreatData();

  // Default camera position
  const defaultPOV = { lat: 25, lng: -10, altitude: 2.0 };

  /**
   * CORRIDOR-BASED ARC DATASET
   * 
   * Each corridor produces TWO entries:
   * 1. A "corridor beam" — width proportional to volume, opacity to recency
   *    This is the PRIMARY visual — the "I can see 3 hot corridors" layer
   * 2. Event pulses — thin bright segments traveling along the corridor
   *    These show "something just happened" without spaghetti
   */
  const combinedArcs = useMemo(() => {
    const result: GlobeArcDatum[] = [];
    
    // Layer 1: Corridor beams (the meaningful aggregated flows)
    corridors.forEach((corridor) => {
      // Width encodes volume, opacity encodes recency
      const baseOpacity = Math.round(corridor.opacity * 255).toString(16).padStart(2, '0');
      const dimOpacity = Math.round(corridor.opacity * 0.4 * 255).toString(16).padStart(2, '0');
      
      result.push({
        startLat: corridor.sourceLat,
        startLng: corridor.sourceLng,
        endLat: corridor.targetLat,
        endLng: corridor.targetLng,
        color: [`${corridor.color}${baseOpacity}`, `${corridor.color}${dimOpacity}`],
        stroke: corridor.width, // Width = volume (0.3 to 4.0)
        dashLength: 1,          // Full length visible — solid beam
        dashGap: 0,
        animateTime: 0,         // Static — the beam persists
        dashInitialGap: 0,
        id: `corridor-${corridor.id}`,
        layer: 'corridor',
        corridor,
      });
    });

    // Layer 2: Event pulses (thin bright dots traveling along corridors)
    corridorPulses.forEach((pulse) => {
      // Find the corridor this pulse belongs to
      const corridor = corridors.find(c => c.id === pulse.corridorId);
      if (!corridor) return;

      const pulseColor = corridor.color;
      result.push({
        startLat: corridor.sourceLat,
        startLng: corridor.sourceLng,
        endLat: corridor.targetLat,
        endLng: corridor.targetLng,
        color: [`${pulseColor}FF`, `${pulseColor}66`], // Bright head, dim tail
        stroke: Math.min(corridor.width * 0.6, 1.5), // Thinner than corridor
        dashLength: 0.15,       // Short segment — a "data packet"
        dashGap: 0.85,
        animateTime: corridor.pulseSpeed, // Speed encodes urgency
        dashInitialGap: Math.random(),
        id: `pulse-${pulse.id}`,
        layer: 'pulse',
        originalArc: pulse.arc,
        corridor,
      });
    });

    return result;
  }, [corridors, corridorPulses]);

  // Source hotspot points — glow at countries with concentrated attackers
  const pointsData = useMemo(() => {
    return sourceHotspots.map(hotspot => ({
      lat: hotspot.lat,
      lng: hotspot.lng,
      color: hotspot.color,
      size: hotspot.radius * 0.08,
      altitude: 0.001,
      label: `${hotspot.country}: ${hotspot.totalEvents} attacks`,
    }));
  }, [sourceHotspots]);

  // Dynamic target rings — pulse rate/size based on actual attack pressure
  const ringsData = useMemo(() => {
    if (targetPressures.length === 0) {
      // Fallback: subtle static rings at known targets
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
      propagationSpeed: 2.5 - target.pressure * 1.8, // Higher pressure = faster propagation
      repeatPeriod: target.pulseRate,
    }));
  }, [targetPressures]);

  // Zoom to a corridor (shows the most recent event from that corridor)
  const zoomToCorridor = useCallback((corridor: Corridor) => {
    if (!globeRef.current) return;
    
    const arc = corridor.recentEvents[corridor.recentEvents.length - 1];
    if (!arc) return;

    isZoomedRef.current = true;
    setIsZoomed(true);
    setZoomedArc(arc);
    setZoomedCorridor(corridor);
    setSelectedArc(arc);
    setMapLoading(true);
    
    setTimeout(() => setShowMap(true), 800);

    globeRef.current.pointOfView(
      { lat: corridor.sourceLat, lng: corridor.sourceLng, altitude: 0.6 },
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
  }, []);

  // Zoom to a specific arc (for pulse clicks)
  const zoomToArc = useCallback((arc: ArcData) => {
    if (!globeRef.current) return;
    
    isZoomedRef.current = true;
    setIsZoomed(true);
    setZoomedArc(arc);
    setZoomedCorridor(null);
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
    setZoomedCorridor(null);
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

  // Stable refs for auto-zoom
  const corridorsRef = useRef<Corridor[]>([]);
  useEffect(() => { corridorsRef.current = corridors; }, [corridors]);
  const activeArcsRef = useRef<ArcData[]>([]);
  useEffect(() => { activeArcsRef.current = activeArcs; }, [activeArcs]);

  // Auto-zoom on the hottest corridor every 30s
  useEffect(() => {
    autoZoomTimerRef.current = setInterval(() => {
      if (isZoomedRef.current) return;

      const currentCorridors = corridorsRef.current;
      // Find the most critical corridor
      const criticalCorridor = currentCorridors.find(c => c.dominantSeverity === 'critical')
        || currentCorridors.find(c => c.dominantSeverity === 'high' && c.eventCount > 5);
      
      if (criticalCorridor) {
        zoomToCorridor(criticalCorridor);
      }
    }, 30000);

    return () => {
      if (autoZoomTimerRef.current) clearInterval(autoZoomTimerRef.current);
    };
  }, [zoomToCorridor]);

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
      .arcAltitudeAutoScale(0.35)
      .arcCurveResolution(64)
      // Click handler — corridors and pulses both clickable
      .onArcClick((arc: any) => {
        if (arc && arc.layer === 'corridor' && arc.corridor) {
          zoomToCorridor(arc.corridor);
        } else if (arc && arc.layer === 'pulse' && arc.originalArc) {
          zoomToArc(arc.originalArc);
        }
      })
      // Points — source hotspot markers
      .pointsData([])
      .pointColor('color')
      .pointAltitude('altitude')
      .pointRadius('size')
      // Rings — dynamic target pressure
      .ringsData(ringsData)
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

    // ─── Display Engineering: Long-press for corridor inspection ──────
    const handleLongPress = () => {
      const currentCorridors = corridorsRef.current;
      if (currentCorridors.length > 0) {
        const target = currentCorridors.find(c => c.dominantSeverity === 'critical') 
          || currentCorridors.find(c => c.dominantSeverity === 'high') 
          || currentCorridors[0];
        if (target) zoomToCorridor(target);
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
  }, [ringsData, zoomToArc, zoomToCorridor]);

  // Update arc, point, and ring data
  useEffect(() => {
    if (!globeRef.current) return;
    globeRef.current.arcsData(combinedArcs);
    globeRef.current.pointsData(pointsData);
  }, [combinedArcs, pointsData]);

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

          {/* Info card with corridor context */}
          {zoomedArc && (
            <ZoomedInfoCard arc={zoomedArc} corridor={zoomedCorridor} />
          )}
        </div>
      </div>

      {/* Corridor Legend — bottom left (only when not zoomed) */}
      {!isZoomed && (
        <div className="absolute bottom-3 left-4 z-10">
          <div className="flex flex-col gap-1.5">
            <div className="font-data text-[9px] text-[var(--color-cp-text-tertiary)] opacity-60 uppercase tracking-wider mb-0.5">
              Corridor Severity
            </div>
            {SEVERITY_LEGEND.map(item => (
              <div key={item.label} className="flex items-center gap-2">
                {/* Width indicator bar */}
                <div className="relative w-6 h-[3px] rounded-full overflow-hidden">
                  <div 
                    className="absolute inset-0 rounded-full"
                    style={{ 
                      backgroundColor: item.color,
                      boxShadow: `0 0 4px ${item.color}66`,
                      opacity: item.label === 'Critical' ? 1 : item.label === 'High' ? 0.8 : 0.6,
                    }}
                  />
                </div>
                <span className="font-data text-[9px] text-[var(--color-cp-text-tertiary)] opacity-70">
                  {item.label}
                </span>
                <span className="font-data text-[8px] text-[var(--color-cp-text-tertiary)] opacity-40">
                  {item.description}
                </span>
              </div>
            ))}
          </div>
          {/* Corridor count and width explanation */}
          <div className="mt-2 flex flex-col gap-0.5">
            <div className="font-data text-caption text-[var(--color-cp-text-tertiary)] tabular-nums opacity-50">
              {corridors.length} active corridor{corridors.length !== 1 ? 's' : ''}
            </div>
            <div className="font-data text-[8px] text-[var(--color-cp-text-tertiary)] opacity-30">
              Width = volume · Brightness = recency
            </div>
          </div>
        </div>
      )}

      {/* Corridor info — top left when zoomed but map not yet shown */}
      {isZoomed && zoomedArc && !showMap && (
        <div className="absolute top-3 left-4 right-4 z-10 flex items-center justify-between">
          <div className="bg-[var(--color-cp-surface)]/90 backdrop-blur-sm border border-[var(--color-cp-border)] rounded-md px-3 py-2 max-w-[320px]">
            <div className="flex items-center gap-2">
              <div 
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: zoomedArc.color }}
              />
              <span className="font-data text-body font-medium text-[var(--color-cp-text-primary)]">
                {zoomedCorridor 
                  ? `${zoomedCorridor.sourceCountry} → ${zoomedCorridor.targetName}`
                  : zoomedArc.attackType
                }
              </span>
              {zoomedCorridor && (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--color-cp-accent)]/10 text-[var(--color-cp-accent)] font-mono">
                  {zoomedCorridor.eventCount} events
                </span>
              )}
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
            Click corridor to inspect
          </span>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ZOOMED INFO CARD — Shows corridor context + event details + CVE linkage
// ═══════════════════════════════════════════════════════════════════════════════

function ZoomedInfoCard({ arc, corridor }: { arc: ArcData; corridor: Corridor | null }) {
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
      {/* Corridor header (if available) */}
      {corridor && (
        <div className="mb-2 pb-2 border-b border-[var(--color-cp-border)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div 
                className="w-3 h-1 rounded-full"
                style={{ backgroundColor: corridor.color }}
              />
              <span className="font-data text-body font-semibold text-[var(--color-cp-text-primary)]">
                {corridor.sourceCountry} → {corridor.targetName}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${
                corridor.dominantSeverity === 'critical' ? 'bg-red-500/15 text-red-400' :
                corridor.dominantSeverity === 'high' ? 'bg-amber-500/15 text-amber-400' :
                'bg-cyan-500/15 text-cyan-400'
              }`}>
                {corridor.dominantSeverity.toUpperCase()}
              </span>
              <span className="font-data text-[9px] text-[var(--color-cp-text-tertiary)]">
                {corridor.eventCount} events · {corridor.dominantAttackType}
              </span>
            </div>
          </div>
          {/* Trend indicator */}
          <div className="flex items-center gap-1.5 mt-1">
            <span className={`text-[8px] font-medium ${
              corridor.trend === 'accelerating' ? 'text-red-400' :
              corridor.trend === 'stable' ? 'text-amber-400' :
              'text-green-400'
            }`}>
              {corridor.trend === 'accelerating' ? '↑ ESCALATING' :
               corridor.trend === 'stable' ? '→ SUSTAINED' :
               '↓ DECAYING'}
            </span>
            <span className="text-[8px] text-[var(--color-cp-text-tertiary)]">
              · {corridor.recentCount} in last 30s
            </span>
          </div>
        </div>
      )}

      {/* Latest event details */}
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
