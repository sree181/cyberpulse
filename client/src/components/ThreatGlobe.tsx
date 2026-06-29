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
 * - Touch gestures: long-press country dossier, swipe-up timeline, double-tap reset
 * 
 * Inspired by Stripe's globe and Kaspersky's threat map.
 */
import { useEffect, useRef, useMemo, useCallback, useState } from 'react';
import Globe from 'globe.gl';
import { useThreatData, type ArcData } from '@/contexts/ThreatContext';
import { BRANDING } from '@/lib/branding';
import { MapView } from '@/components/Map';
import { trpc } from '@/lib/trpc';
import { useGlobeGestures } from '@/hooks/useGlobeGestures';
import { useCameraChoreography } from '@/hooks/useCameraChoreography';
import CountryDossier from '@/components/CountryDossier';
import TimelineScrubber from '@/components/TimelineScrubber';

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

// Map screen coordinates to approximate country code using globe reference
function findNearestCountry(arcs: ArcData[], globeInstance: any, screenX: number, screenY: number, containerRect: DOMRect): string {
  // Use globe.gl's toGlobeCoords to convert screen → lat/lng if available
  if (globeInstance && globeInstance.toGlobeCoords) {
    const relX = screenX - containerRect.left;
    const relY = screenY - containerRect.top;
    const coords = globeInstance.toGlobeCoords(relX, relY);
    if (coords && coords.lat !== undefined && coords.lng !== undefined) {
      // Find the nearest arc source to these coordinates
      let nearest = '';
      let minDist = Infinity;
      arcs.forEach(arc => {
        const dLat = arc.startLat - coords.lat;
        const dLng = arc.startLng - coords.lng;
        const dist = dLat * dLat + dLng * dLng;
        if (dist < minDist) {
          minDist = dist;
          nearest = arc.sourceCountry;
        }
      });
      if (nearest) return nearest;
    }
  }
  
  // Fallback: pick the most common source country from active arcs
  const countryCounts: Record<string, number> = {};
  arcs.forEach(arc => {
    countryCounts[arc.sourceCountry] = (countryCounts[arc.sourceCountry] || 0) + 1;
  });
  const sorted = Object.entries(countryCounts).sort(([, a], [, b]) => b - a);
  return sorted[0]?.[0] || 'US';
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
  
  // Touch interaction state
  const [dossierCountry, setDossierCountry] = useState<string | null>(null);
  const [showTimeline, setShowTimeline] = useState(false);
  const [timelineFilter, setTimelineFilter] = useState<number | null>(null);
  
  const { activeArcs, setSelectedArc } = useThreatData();

  // Default camera position
  const defaultPOV = { lat: 25, lng: -10, altitude: 2.0 };

  // Touch gesture integration
  useGlobeGestures(containerRef, {
    onLongPress: (_lat, _lng, screenX, screenY) => {
      if (isZoomedRef.current) return; // Don't trigger dossier when zoomed
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const country = findNearestCountry(activeArcs, globeRef.current, screenX, screenY, rect);
      setDossierCountry(country);
    },
    onSwipeUp: () => {
      if (!isZoomedRef.current) {
        setShowTimeline(true);
      }
    },
    onDoubleTap: () => {
      if (isZoomedRef.current) {
        returnToOverview();
      }
    },
  }, !isZoomed && !dossierCountry);

  // Camera choreography for kiosk passive mode
  // Listens for 'cyberpulse:kiosk-passive' custom event from KioskContext
  const [isPassiveMode, setIsPassiveMode] = useState(false);
  useEffect(() => {
    const handlePassive = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setIsPassiveMode(detail?.passive ?? false);
    };
    window.addEventListener('cyberpulse:kiosk-mode', handlePassive);
    return () => window.removeEventListener('cyberpulse:kiosk-mode', handlePassive);
  }, []);

  useCameraChoreography({
    globeRef,
    activeArcs,
    isPassive: isPassiveMode,
    isZoomed,
  });

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
  // When timeline is scrubbing, show a reduced/highlighted subset
  // In live mode (timelineFilter === null), show all arcs normally
  // When scrubbing, we dim arcs and pulse the playhead position indicator
  const isReplaying = timelineFilter !== null;

  const combinedArcs = useMemo(() => {
    const result: GlobeArcDatum[] = [];

    // Connection clustering: group arcs by source country to detect botnets
    const sourceGroups: Record<string, ArcData[]> = {};
    activeArcs.forEach(arc => {
      const key = arc.sourceCountry;
      if (!sourceGroups[key]) sourceGroups[key] = [];
      sourceGroups[key].push(arc);
    });

    // For clusters with 4+ arcs from same source, add a "trunk" arc
    Object.entries(sourceGroups).forEach(([_country, group]) => {
      if (group.length >= 4) {
        // Trunk arc: from source centroid to midpoint (visual hub)
        const avgStartLat = group.reduce((s, a) => s + a.startLat, 0) / group.length;
        const avgStartLng = group.reduce((s, a) => s + a.startLng, 0) / group.length;
        const avgEndLat = group.reduce((s, a) => s + a.endLat, 0) / group.length;
        const avgEndLng = group.reduce((s, a) => s + a.endLng, 0) / group.length;
        const midLat = (avgStartLat + avgEndLat) / 2;
        const midLng = (avgStartLng + avgEndLng) / 2;
        
        // Thick trunk arc representing the botnet cluster
        result.push({
          startLat: avgStartLat,
          startLng: avgStartLng,
          endLat: midLat,
          endLng: midLng,
          color: [`${group[0].color}88`, `${group[0].color}44`],
          stroke: 0.3 + group.length * 0.05, // Thicker with more connections
          dashLength: 0.6,
          dashGap: 0.4,
          animateTime: 2500,
          dashInitialGap: 0,
          id: `trunk-${_country}-${group[0].id}`,
          layer: 'trail',
        });
      }
    });
    
    activeArcs.forEach((arc, index) => {
      // Severity-based width scaling
      const trailOpacity = arc.severity === 'critical' ? '66' : arc.severity === 'high' ? '55' : '33';
      const trailEndOpacity = arc.severity === 'critical' ? '22' : '11';
      
      // Layer 1: Trail (the persistent fiber — always visible, subtle)
      // Variable width: critical arcs have thicker trails
      result.push({
        startLat: arc.startLat,
        startLng: arc.startLng,
        endLat: arc.endLat,
        endLng: arc.endLng,
        color: [`${arc.color}${trailOpacity}`, `${arc.color}${trailEndOpacity}`],
        stroke: arc.severity === 'critical' ? 0.15 : null, // Critical gets tube trail, others get hairline
        dashLength: 1,
        dashGap: 0,
        animateTime: 0,
        dashInitialGap: 0,
        id: `trail-${arc.id}`,
        layer: 'trail',
      });

      // Layer 2: Pulse (the traveling photon — bright, animated)
      // Faster animation for critical, variable width by severity
      const pulseSpeed = arc.severity === 'critical' ? 1200 : arc.severity === 'high' ? 1500 : 2000;
      const pulseWidth = arc.severity === 'critical' ? 0.6 : arc.severity === 'high' ? 0.4 : 0.25;
      const pulseDashLen = arc.severity === 'critical' ? 0.35 : 0.25; // Critical has longer visible segment
      
      result.push({
        startLat: arc.startLat,
        startLng: arc.startLng,
        endLat: arc.endLat,
        endLng: arc.endLng,
        color: [`${arc.color}FF`, `${arc.color}99`], // Full brightness head → 60% tail
        stroke: pulseWidth,
        dashLength: pulseDashLen,
        dashGap: 1 - pulseDashLen,
        animateTime: pulseSpeed + (index % 5) * 100, // Stagger for organic feel
        dashInitialGap: Math.random(),
        id: `pulse-${arc.id}`,
        layer: 'pulse',
        originalArc: arc,
      });

      // Layer 3: Lightning flash for critical attacks — brief bright burst
      if (arc.severity === 'critical') {
        result.push({
          startLat: arc.startLat,
          startLng: arc.startLng,
          endLat: arc.endLat,
          endLng: arc.endLng,
          color: ['#FFFFFFEE', `${arc.color}00`], // White flash fading to transparent
          stroke: 0.8,
          dashLength: 0.15,
          dashGap: 0.85,
          animateTime: 600, // Very fast — lightning speed
          dashInitialGap: Math.random() * 0.5,
          id: `flash-${arc.id}`,
          layer: 'pulse',
          originalArc: arc,
        });
      }
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

  // Hex-bin heatmap data — all target locations for density aggregation
  const hexBinData = useMemo(() => {
    return activeArcs.map(arc => ({
      lat: arc.endLat,
      lng: arc.endLng,
      weight: arc.severity === 'critical' ? 4 : arc.severity === 'high' ? 2.5 : arc.severity === 'medium' ? 1.5 : 1,
    }));
  }, [activeArcs]);

  // Orbital ring — sensor nodes at fixed altitude representing monitored infrastructure
  const orbitalNodes = useMemo(() => {
    const sensors = [
      { lat: 38.9, lng: -77.0, label: 'US-EAST HQ', active: true },
      { lat: 37.4, lng: -122.1, label: 'US-WEST DC', active: true },
      { lat: 51.5, lng: -0.1, label: 'UK OFFICE', active: true },
      { lat: 50.1, lng: 8.7, label: 'EU-CENTRAL DC', active: true },
      { lat: 1.35, lng: 103.8, label: 'APAC DC', active: true },
      { lat: 35.7, lng: 139.7, label: 'JP NODE', active: false },
      { lat: -33.9, lng: 151.2, label: 'AU NODE', active: false },
      { lat: 55.8, lng: 37.6, label: 'MONITOR-RU', active: true },
      { lat: 39.9, lng: 116.4, label: 'MONITOR-CN', active: true },
      { lat: -23.5, lng: -46.6, label: 'SA NODE', active: false },
    ];
    // Check which sensors are being targeted
    const targetedSensors = new Set<string>();
    activeArcs.forEach(arc => {
      sensors.forEach(s => {
        const dist = Math.abs(arc.endLat - s.lat) + Math.abs(arc.endLng - s.lng);
        if (dist < 5) targetedSensors.add(s.label);
      });
    });
    return sensors.map(s => ({
      ...s,
      underAttack: targetedSensors.has(s.label),
      altitude: 0.15, // Fixed orbital altitude
    }));
  }, [activeArcs]);

  // Dynamic pulse rings at target cities — stacking concentric rings at impact locations
  // Rings are generated from active arcs, with severity-based color and size
  const ringsData = useMemo(() => {
    // Aggregate targets by location (rounded to 1 decimal for grouping)
    const targetMap: Record<string, { lat: number; lng: number; count: number; maxSeverity: string }> = {};
    
    activeArcs.forEach(arc => {
      const key = `${arc.endLat.toFixed(1)},${arc.endLng.toFixed(1)}`;
      if (!targetMap[key]) {
        targetMap[key] = { lat: arc.endLat, lng: arc.endLng, count: 0, maxSeverity: 'low' };
      }
      targetMap[key].count++;
      // Track highest severity hitting this location
      const severityRank: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
      if ((severityRank[arc.severity] || 0) > (severityRank[targetMap[key].maxSeverity] || 0)) {
        targetMap[key].maxSeverity = arc.severity;
      }
    });

    return Object.values(targetMap).map(target => {
      // Color intensity based on severity
      const colorMap: Record<string, string> = {
        critical: 'rgba(200, 30, 30, 0.25)',
        high: 'rgba(221, 85, 12, 0.2)',
        medium: 'rgba(212, 160, 23, 0.15)',
        low: 'rgba(92, 138, 77, 0.1)',
      };
      // Ring size scales with attack count (stacking effect)
      const maxR = Math.min(1.5 + target.count * 0.5, 5);
      // Faster propagation for critical (more urgent visual)
      const speed = target.maxSeverity === 'critical' ? 2.5 : target.maxSeverity === 'high' ? 1.8 : 1.2;
      // Shorter repeat period for high-volume targets (more rings visible simultaneously)
      const repeat = Math.max(600, 2000 - target.count * 150);

      return {
        lat: target.lat,
        lng: target.lng,
        color: colorMap[target.maxSeverity] || colorMap.low,
        maxR,
        propagationSpeed: speed,
        repeatPeriod: repeat,
      };
    });
  }, [activeArcs]);

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
        // Dispatch cinematic dolly zoom event
        window.dispatchEvent(new CustomEvent('cyberpulse:autozoom'));
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
      .atmosphereColor('rgba(221, 85, 12, 0.35)')
      .atmosphereAltitude(0.25)
      .showAtmosphere(true)
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
      // Hex-bin heatmap — attack density at target locations
      .hexBinPointsData([])
      .hexBinPointWeight('weight')
      .hexBinResolution(3)
      .hexMargin(0.4)
      .hexTopColor((d: any) => {
        const w = d.sumWeight || 0;
        if (w > 10) return 'rgba(200, 30, 30, 0.85)';
        if (w > 5) return 'rgba(221, 85, 12, 0.75)';
        if (w > 2) return 'rgba(212, 160, 23, 0.55)';
        return 'rgba(92, 138, 77, 0.35)';
      })
      .hexSideColor((d: any) => {
        const w = d.sumWeight || 0;
        if (w > 10) return 'rgba(200, 30, 30, 0.4)';
        if (w > 5) return 'rgba(221, 85, 12, 0.3)';
        return 'rgba(92, 138, 77, 0.15)';
      })
      .hexAltitude((d: any) => Math.min((d.sumWeight || 0) * 0.008, 0.15))
      .hexBinMerge(true)
      .hexTransitionDuration(800)
      // Orbital sensor nodes — labels at altitude
      .labelsData([])
      .labelLat((d: any) => d.lat)
      .labelLng((d: any) => d.lng)
      .labelAltitude((d: any) => d.altitude || 0.15)
      .labelText((d: any) => d.underAttack ? `● ${d.label}` : `○ ${d.label}`)
      .labelSize((d: any) => d.underAttack ? 0.6 : 0.4)
      .labelDotRadius((d: any) => d.underAttack ? 0.4 : 0.2)
      .labelColor((d: any) => d.underAttack ? 'rgba(200, 30, 30, 0.9)' : d.active ? 'rgba(92, 138, 77, 0.7)' : 'rgba(100, 116, 139, 0.4)')
      .labelResolution(2)
      .labelIncludeDot(true)
      .labelDotOrientation(() => 'bottom' as any)
      // Rings — dynamic pulse rings at target cities
      .ringsData(ringsData)
      .ringColor('color')
      .ringMaxRadius((d: any) => d.maxR || 2)
      .ringPropagationSpeed((d: any) => d.propagationSpeed || 1.2)
      .ringRepeatPeriod((d: any) => d.repeatPeriod || 1800)
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

  // Update arc, point, hex-bin, orbital, and rings data
  useEffect(() => {
    if (!globeRef.current) return;
    globeRef.current.arcsData(combinedArcs);
    globeRef.current.pointsData(pointsData);
    globeRef.current.hexBinPointsData(hexBinData);
    globeRef.current.labelsData(orbitalNodes);
    globeRef.current.ringsData(ringsData);
  }, [combinedArcs, pointsData, hexBinData, orbitalNodes, ringsData]);

  // Handle Google Maps error
  const handleMapError = useCallback(() => {
    setMapLoading(false);
  }, []);

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
              onMapError={handleMapError}
            />
          )}

          {/* Map overlay info card with CVE linkage */}
          {zoomedArc && (
            <ZoomedArcInfoCard arc={zoomedArc} />
          )}
        </div>
      </div>

      {/* Attack Type Legend — bottom left (only when not zoomed and no overlays) */}
      {!isZoomed && !dossierCountry && !showTimeline && (
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
      {!isZoomed && !dossierCountry && !showTimeline && (
        <div className="absolute top-3 right-4 z-10">
          <span className="font-data text-[9px] text-[var(--color-cp-text-tertiary)] opacity-30">
            Click arc to inspect • Long-press for dossier • Swipe up for timeline
          </span>
        </div>
      )}

      {/* Country Dossier Overlay */}
      {dossierCountry && (
        <CountryDossier 
          country={dossierCountry} 
          onClose={() => setDossierCountry(null)} 
        />
      )}

      {/* Timeline Scrubber */}
      <TimelineScrubber 
        isVisible={showTimeline} 
        onClose={() => { setShowTimeline(false); setTimelineFilter(null); }} 
        onTimeChange={(ts) => setTimelineFilter(ts)}
      />

      {/* Timeline toggle button — bottom right, subtle */}
      {!isZoomed && !showTimeline && !dossierCountry && (
        <button
          onClick={() => setShowTimeline(true)}
          className="absolute bottom-3 right-4 z-10 px-2.5 py-1 rounded-md bg-[var(--color-cp-surface)]/80 backdrop-blur-sm border border-[var(--color-cp-border)] text-[9px] font-data text-[var(--color-cp-text-tertiary)] hover:text-[var(--color-cp-accent)] hover:border-[var(--color-cp-accent)] transition-all cursor-pointer"
        >
          ⏱ 24H Timeline
        </button>
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
