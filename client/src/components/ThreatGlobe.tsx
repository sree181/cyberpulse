/**
 * ThreatGlobe — Cinematic 3D Globe Visualization
 * 
 * Visual Design:
 * - DUAL-LAYER arc system using per-arc accessor functions:
 *   Layer 1: Persistent "fiber optic" trails — hairline, always visible, low opacity
 *   Layer 2: Animated "photon pulses" — bright segments traveling along the fiber
 * - Color-coded by attack type with subtle gradient (source bright → target faded)
 * - Hybrid zoom: auto-zoom on critical attacks every 30s + click-to-zoom
 * - Google Maps detail panel on zoom
 * 
 * Inspired by Stripe's globe and Kaspersky's threat map.
 */
import { useEffect, useRef, useMemo, useCallback, useState } from 'react';
import Globe from 'globe.gl';
import { useThreatData, type ArcData } from '@/contexts/ThreatContext';
import { BRANDING } from '@/lib/branding';
import { MapView } from '@/components/Map';
import { trpc } from '@/lib/trpc';

// Attack type legend entries
const LEGEND_ITEMS = [
  { type: 'SSH Brute Force', color: BRANDING.attackColors['SSH Brute Force'] },
  { type: 'DDoS', color: BRANDING.attackColors['DDoS'] },
  { type: 'SQL Injection', color: BRANDING.attackColors['SQL Injection'] },
  { type: 'Ransomware', color: BRANDING.attackColors['Ransomware'] },
  { type: 'Port Scan', color: BRANDING.attackColors['Port Scan'] },
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

// Arc datum type for the combined dual-layer dataset
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
  layer: 'trail' | 'pulse';
  // Original arc data for click handling
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
  const [showMap, setShowMap] = useState(false);
  const [mapLoading, setMapLoading] = useState(true);
  const mapMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  
  const { activeArcs, setSelectedArc } = useThreatData();

  // Default camera position
  const defaultPOV = { lat: 25, lng: -10, altitude: 2.0 };

  /**
   * COMBINED DUAL-LAYER ARC DATASET
   * 
   * Each active arc produces TWO entries in the arcsData array:
   * 1. A "trail" arc — solid, hairline (1px Line), low opacity, no animation
   *    This creates the persistent "fiber optic cable" visual
   * 2. A "pulse" arc — tube geometry, bright, short dash segment animated along the path
   *    This creates the "data packet traveling along the fiber" visual
   * 
   * Per-arc accessor functions allow different dash/stroke properties per entry.
   */
  const combinedArcs = useMemo(() => {
    const result: GlobeArcDatum[] = [];
    
    activeArcs.forEach((arc, index) => {
      // Layer 1: Trail (the persistent fiber — always visible, subtle)
      result.push({
        startLat: arc.startLat,
        startLng: arc.startLng,
        endLat: arc.endLat,
        endLng: arc.endLng,
        color: [`${arc.color}44`, `${arc.color}11`], // 27% → 7% opacity gradient
        stroke: null, // null = ThreeJS Line (1px constant width, elegant hairline)
        dashLength: 1,    // Full length visible
        dashGap: 0,       // No gaps — solid line
        animateTime: 0,   // No animation — static trail
        dashInitialGap: 0,
        id: `trail-${arc.id}`,
        layer: 'trail',
      });

      // Layer 2: Pulse (the traveling photon — bright, animated)
      result.push({
        startLat: arc.startLat,
        startLng: arc.startLng,
        endLat: arc.endLat,
        endLng: arc.endLng,
        color: [`${arc.color}EE`, `${arc.color}88`], // 93% → 53% opacity (bright head, dimmer tail)
        stroke: arc.severity === 'critical' ? 0.45 : arc.severity === 'high' ? 0.35 : 0.25,
        dashLength: 0.25,  // 25% of arc visible — substantial enough to see
        dashGap: 0.75,     // 75% invisible — creates single traveling segment
        animateTime: 1800 + (index % 5) * 200, // Stagger speeds slightly for organic feel
        dashInitialGap: Math.random(), // Random starting position — avoids synchronized movement
        id: `pulse-${arc.id}`,
        layer: 'pulse',
        originalArc: arc,
      });
    });

    return result;
  }, [activeArcs]);

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
      color: `${arc.color}55`,
      size: 0.06,
      altitude: 0.002,
    }));
  }, [activeArcs]);

  // Target rings — subtle pulsing at destinations
  const ringsData = useMemo(() => [
    { lat: 38.9072, lng: -77.0369, color: 'rgba(221, 85, 12, 0.12)', maxR: 2, propagationSpeed: 1.2, repeatPeriod: 1800 },
    { lat: 37.3861, lng: -122.0839, color: 'rgba(221, 85, 12, 0.12)', maxR: 2, propagationSpeed: 1.2, repeatPeriod: 1800 },
    { lat: 50.1109, lng: 8.6821, color: 'rgba(221, 85, 12, 0.12)', maxR: 2, propagationSpeed: 1.2, repeatPeriod: 1800 },
    { lat: 1.3521, lng: 103.8198, color: 'rgba(221, 85, 12, 0.12)', maxR: 2, propagationSpeed: 1.2, repeatPeriod: 1800 },
    { lat: 51.5074, lng: -0.1278, color: 'rgba(221, 85, 12, 0.12)', maxR: 2, propagationSpeed: 1.2, repeatPeriod: 1800 },
  ], []);

  // Zoom to a specific arc location
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

  // Stable ref for auto-zoom
  const activeArcsRef = useRef<ArcData[]>([]);
  useEffect(() => { activeArcsRef.current = activeArcs; }, [activeArcs]);

  // Auto-zoom on critical attacks every 30s (stable interval)
  useEffect(() => {
    autoZoomTimerRef.current = setInterval(() => {
      if (isZoomedRef.current) return;

      const arcs = activeArcsRef.current;
      const criticalArc = arcs.find(a => a.severity === 'critical') 
        || arcs.find(a => a.severity === 'high');
      
      if (criticalArc) {
        zoomToArc(criticalArc);
      }
    }, 30000);

    return () => {
      if (autoZoomTimerRef.current) clearInterval(autoZoomTimerRef.current);
    };
  }, [zoomToArc]);

  // Initialize globe with per-arc accessor functions
  useEffect(() => {
    if (!containerRef.current) return;

    const globe = Globe()
      .globeImageUrl('//unpkg.com/three-globe/example/img/earth-night.jpg')
      .bumpImageUrl('//unpkg.com/three-globe/example/img/earth-topology.png')
      .backgroundImageUrl('//unpkg.com/three-globe/example/img/night-sky.png')
      .atmosphereColor('rgba(221, 85, 12, 0.2)')
      .atmosphereAltitude(0.15)
      // ARCS — per-arc accessor functions for dual-layer rendering
      .arcsData([])
      .arcColor('color')
      .arcStroke((d: any) => d.stroke)                    // null=Line, number=Tube
      .arcDashLength((d: any) => d.dashLength)            // 1=solid, 0.25=photon segment
      .arcDashGap((d: any) => d.dashGap)                  // 0=no gap, 0.75=traveling effect
      .arcDashInitialGap((d: any) => d.dashInitialGap)    // Random start offset
      .arcDashAnimateTime((d: any) => d.animateTime)      // 0=static, 1800+=animated
      .arcAltitudeAutoScale(0.3)  // Elegant, restrained arc height
      .arcCurveResolution(64)     // Silky smooth curves
      // Click handler — only respond to pulse arcs (not trails)
      .onArcClick((arc: any) => {
        if (arc && arc.layer === 'pulse' && arc.originalArc) {
          zoomToArc(arc.originalArc);
        }
      })
      // Points — subtle origin markers
      .pointsData([])
      .pointColor('color')
      .pointAltitude('altitude')
      .pointRadius('size')
      // Rings — subtle target pulsing
      .ringsData(ringsData)
      .ringColor('color')
      .ringMaxRadius(2)
      .ringPropagationSpeed(1.2)
      .ringRepeatPeriod(1800)
      (containerRef.current);

    // Camera
    globe.pointOfView(defaultPOV);
    
    // Auto-rotate — slow, contemplative
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

    return () => {
      window.removeEventListener('resize', handleResize);
      if (autoZoomTimerRef.current) clearInterval(autoZoomTimerRef.current);
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    };
  }, [ringsData, zoomToArc]);

  // Update arc and point data
  useEffect(() => {
    if (!globeRef.current) return;
    globeRef.current.arcsData(combinedArcs);
    globeRef.current.pointsData(pointsData);
  }, [combinedArcs, pointsData]);

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

      {/* Google Maps Detail Panel */}
      <div className={`absolute top-0 right-0 bottom-0 w-[40%] z-20 transition-all duration-700 ease-in-out transform ${
        showMap ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0 pointer-events-none'
      }`}>
        <div className="w-full h-full border-l border-[var(--color-cp-border)] overflow-hidden relative">
          {/* Map header */}
          <div className="absolute top-0 left-0 right-0 z-30 bg-[var(--color-cp-surface)]/95 backdrop-blur-sm border-b border-[var(--color-cp-border)] px-3 py-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-cp-accent)] animate-pulse" />
                <span className="font-data text-caption text-[var(--color-cp-text-secondary)] uppercase tracking-wider">
                  Attack Source Location
                </span>
              </div>
              <button
                onClick={returnToOverview}
                className="text-[var(--color-cp-text-tertiary)] hover:text-[var(--color-cp-text-primary)] transition-colors text-caption font-data cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>

          {/* Map loading state */}
          {mapLoading && showMap && (
            <div className="absolute inset-0 z-25 flex items-center justify-center bg-[var(--color-cp-base)]">
              <div className="flex flex-col items-center gap-2">
                <div className="w-5 h-5 border-2 border-[var(--color-cp-accent)]/30 border-t-[var(--color-cp-accent)] rounded-full animate-spin" />
                <span className="font-data text-caption text-[var(--color-cp-text-tertiary)]">Loading map...</span>
              </div>
            </div>
          )}

          {/* Map */}
          {showMap && zoomedArc && (
            <MapView
              className="w-full h-full"
              initialCenter={{ lat: zoomedArc.startLat, lng: zoomedArc.startLng }}
              initialZoom={8}
              onMapReady={handleMapReady}
            />
          )}

          {/* Map overlay info card with CVE linkage */}
          {zoomedArc && (
            <ZoomedArcInfoCard arc={zoomedArc} />
          )}
        </div>
      </div>

      {/* Attack Type Legend — bottom left (only when not zoomed) */}
      {!isZoomed && (
        <div className="absolute bottom-3 left-4 z-10">
          <div className="flex flex-col gap-1">
            {LEGEND_ITEMS.map(item => (
              <div key={item.type} className="flex items-center gap-1.5">
                <div className="relative flex items-center">
                  {/* Trail line representation */}
                  <div 
                    className="w-4 h-[1px]"
                    style={{ backgroundColor: `${item.color}44` }}
                  />
                  {/* Photon dot */}
                  <div 
                    className="absolute left-1 w-1.5 h-1.5 rounded-full"
                    style={{ 
                      backgroundColor: item.color,
                      boxShadow: `0 0 3px ${item.color}88`
                    }}
                  />
                </div>
                <span className="font-data text-[9px] text-[var(--color-cp-text-tertiary)] opacity-70 ml-0.5">
                  {item.type}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-2 font-data text-caption text-[var(--color-cp-text-tertiary)] tabular-nums opacity-50">
            {activeArcs.length} active vectors
          </div>
        </div>
      )}

      {/* Zoom info card — top left when zoomed but map not yet shown */}
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

      {/* Subtle interaction hint */}
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
// ZOOMED ARC INFO CARD — Shows attack details + CVE linkage
// ═══════════════════════════════════════════════════════════════════════════════

function ZoomedArcInfoCard({ arc }: { arc: ArcData }) {
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
      {/* Attack header */}
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

      {/* CVE Linkage section — only shows if we have a match */}
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
