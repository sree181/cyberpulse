/**
 * ThreatFlatMap — 2D Flat World Map with Attack Arcs
 * 
 * Uses ONLY Maplibre GL JS native layers for rendering. No Deck.gl.
 * This guarantees pixel-perfect alignment because all geometry (arcs, dots)
 * is rendered by the same engine in the same coordinate system as the map tiles.
 * 
 * ENHANCEMENTS:
 * - Animated traveling dots along each arc (source → target directionality)
 * - Increased curvature and line widths for Planar display visibility
 * - Multi-layer glow effect with gradient-like coloring for dynamic visualization
 */
import { useEffect, useRef, useCallback } from 'react';
import { useThreatData } from '@/contexts/ThreatContext';
import { BRANDING } from '@/lib/branding';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

// CARTO Dark Matter with brightness boost — no auth required
const DARK_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  name: 'CyberPulse Flat Map',
  sources: {
    'carto-dark': {
      type: 'raster',
      tiles: [
        'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
        'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
        'https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
      ],
      tileSize: 256,
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
      maxzoom: 18,
    },
  },
  layers: [
    {
      id: 'background',
      type: 'background',
      paint: { 'background-color': '#0a1628' },
    },
    {
      id: 'carto-dark',
      type: 'raster',
      source: 'carto-dark',
      minzoom: 0,
      maxzoom: 18,
      paint: {
        'raster-opacity': 0.95,
        'raster-saturation': -0.1,
        'raster-contrast': 0.15,
        'raster-brightness-min': 0.08,
        'raster-brightness-max': 0.85,
      },
    },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════
// GEOGRAPHIC ARC COMPUTATION
// Compute a curved path between two points using a quadratic Bezier curve
// in geographic coordinates. The control point is offset perpendicular to
// the midpoint of the great circle, creating a visible curve.
// ═══════════════════════════════════════════════════════════════════════════

function computeArcPath(
  srcLng: number, srcLat: number,
  dstLng: number, dstLat: number,
  numPoints: number = 50,
  curvature: number = 0.35
): [number, number][] {
  // Midpoint
  const midLng = (srcLng + dstLng) / 2;
  const midLat = (srcLat + dstLat) / 2;

  // Direction vector (src → dst)
  const dLng = dstLng - srcLng;
  const dLat = dstLat - srcLat;

  // Perpendicular offset (rotated 90°) — this creates the curve
  const perpLng = -dLat * curvature;
  const perpLat = dLng * curvature;

  // Control point — offset from midpoint perpendicular to the line
  // Always curve "upward" (toward north) for visual consistency
  const sign = perpLat >= 0 ? 1 : -1;
  const ctrlLng = midLng + perpLng * sign;
  const ctrlLat = midLat + Math.abs(perpLat);

  // Generate points along the quadratic Bezier curve
  const points: [number, number][] = [];
  for (let i = 0; i <= numPoints; i++) {
    const t = i / numPoints;
    const oneMinusT = 1 - t;

    // Quadratic Bezier: B(t) = (1-t)²·P0 + 2(1-t)t·P1 + t²·P2
    const lng = oneMinusT * oneMinusT * srcLng
      + 2 * oneMinusT * t * ctrlLng
      + t * t * dstLng;
    const lat = oneMinusT * oneMinusT * srcLat
      + 2 * oneMinusT * t * ctrlLat
      + t * t * dstLat;

    points.push([lng, lat]);
  }

  return points;
}

/**
 * Get a point along the arc at parameter t (0 = source, 1 = target)
 * Used for the animated traveling dot
 */
function getPointOnArc(path: [number, number][], t: number): [number, number] {
  const clampedT = Math.max(0, Math.min(1, t));
  const index = clampedT * (path.length - 1);
  const lower = Math.floor(index);
  const upper = Math.min(lower + 1, path.length - 1);
  const frac = index - lower;

  return [
    path[lower][0] + (path[upper][0] - path[lower][0]) * frac,
    path[lower][1] + (path[upper][1] - path[lower][1]) * frac,
  ];
}

/**
 * Lighten a hex color by a factor (0-1) for gradient head effect
 */
function lightenColor(hex: string, factor: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const lr = Math.min(255, Math.round(r + (255 - r) * factor));
  const lg = Math.min(255, Math.round(g + (255 - g) * factor));
  const lb = Math.min(255, Math.round(b + (255 - b) * factor));
  return `#${lr.toString(16).padStart(2, '0')}${lg.toString(16).padStart(2, '0')}${lb.toString(16).padStart(2, '0')}`;
}

// Attack type legend
const ATTACK_TYPE_LEGEND = [
  { label: 'SSH Brute Force', color: BRANDING.attackColors['SSH Brute Force'] },
  { label: 'Port Scan', color: BRANDING.attackColors['Port Scan'] },
  { label: 'SQL Injection', color: BRANDING.attackColors['SQL Injection'] },
  { label: 'DDoS', color: BRANDING.attackColors['DDoS'] },
  { label: 'Malware C2', color: BRANDING.attackColors['Malware C2'] },
];

// Travel speed: how fast the dot moves along the arc (0-1 per second)
const DOT_SPEED = 0.15; // Full arc traversal in ~6.5 seconds
const DOT_TRAIL_LENGTH = 0.12; // Trail behind the dot (12% of arc)

export default function ThreatFlatMap() {
  const { activeArcs, sourceHotspots, targetPressures } = useThreatData();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const sourcesAdded = useRef(false);
  const animFrameRef = useRef<number>(0);

  // Initialize Maplibre GL map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: DARK_STYLE,
      center: [20, 20],
      zoom: 1.5,
      interactive: false, // Passive display
      attributionControl: false,
      fadeDuration: 0,
      maxZoom: 6,
      minZoom: 1,
      renderWorldCopies: false,
    });

    map.on('load', () => {
      // ─── GeoJSON sources ───
      map.addSource('attack-arcs', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });

      map.addSource('arc-glow-outer', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });

      map.addSource('traveling-dots', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });

      map.addSource('dot-trails', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });

      map.addSource('source-hotspots', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });

      map.addSource('target-pressures', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });

      map.addSource('source-dots', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });

      map.addSource('target-dots', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });

      // ─── LAYER STACK (bottom to top) ───

      // 1. Target pressure circles (subtle background glow)
      map.addLayer({
        id: 'target-pressure-fill',
        type: 'circle',
        source: 'target-pressures',
        paint: {
          'circle-radius': ['get', 'radius'],
          'circle-color': ['get', 'color'],
          'circle-opacity': ['get', 'opacity'],
          'circle-blur': 0.6,
        },
      });

      // 2. Source hotspot glow (outer)
      map.addLayer({
        id: 'source-hotspots-glow',
        type: 'circle',
        source: 'source-hotspots',
        paint: {
          'circle-radius': ['get', 'radius'],
          'circle-color': ['get', 'color'],
          'circle-opacity': ['get', 'opacity'],
          'circle-blur': 0.5,
        },
      });

      // 3. Arc outer glow — widest, most diffuse (creates the "bloom" effect)
      map.addLayer({
        id: 'arc-glow-outer-layer',
        type: 'line',
        source: 'arc-glow-outer',
        paint: {
          'line-color': ['get', 'color'],
          'line-width': ['get', 'glowWidth'],
          'line-opacity': ['get', 'glowOpacity'],
          'line-blur': 6,
        },
        layout: {
          'line-cap': 'round',
          'line-join': 'round',
        },
      });

      // 4. Arc mid glow — medium width
      map.addLayer({
        id: 'attack-arcs-glow',
        type: 'line',
        source: 'attack-arcs',
        paint: {
          'line-color': ['get', 'color'],
          'line-width': ['*', ['get', 'width'], 2.5],
          'line-opacity': ['*', ['get', 'opacity'], 0.3],
          'line-blur': 3,
        },
        layout: {
          'line-cap': 'round',
          'line-join': 'round',
        },
      });

      // 5. Arc core line — the main visible arc
      map.addLayer({
        id: 'attack-arcs-line',
        type: 'line',
        source: 'attack-arcs',
        paint: {
          'line-color': ['get', 'color'],
          'line-width': ['get', 'width'],
          'line-opacity': ['get', 'opacity'],
        },
        layout: {
          'line-cap': 'round',
          'line-join': 'round',
        },
      });

      // 6. Arc bright center — thin bright line for "hot core" effect
      map.addLayer({
        id: 'attack-arcs-core',
        type: 'line',
        source: 'attack-arcs',
        paint: {
          'line-color': ['get', 'lightColor'],
          'line-width': ['*', ['get', 'width'], 0.4],
          'line-opacity': ['*', ['get', 'opacity'], 0.7],
        },
        layout: {
          'line-cap': 'round',
          'line-join': 'round',
        },
      });

      // 7. Dot trail — short glowing line segment behind the traveling dot
      map.addLayer({
        id: 'dot-trail-layer',
        type: 'line',
        source: 'dot-trails',
        paint: {
          'line-color': ['get', 'color'],
          'line-width': ['get', 'width'],
          'line-opacity': ['get', 'opacity'],
          'line-blur': 1,
        },
        layout: {
          'line-cap': 'round',
          'line-join': 'round',
        },
      });

      // 8. Traveling dot — animated circle moving along the arc
      map.addLayer({
        id: 'traveling-dots-glow',
        type: 'circle',
        source: 'traveling-dots',
        paint: {
          'circle-radius': ['get', 'glowRadius'],
          'circle-color': ['get', 'color'],
          'circle-opacity': ['*', ['get', 'opacity'], 0.4],
          'circle-blur': 0.5,
        },
      });

      map.addLayer({
        id: 'traveling-dots-core',
        type: 'circle',
        source: 'traveling-dots',
        paint: {
          'circle-radius': ['get', 'radius'],
          'circle-color': ['get', 'lightColor'],
          'circle-opacity': ['get', 'opacity'],
        },
      });

      // 9. Source endpoint dots
      map.addLayer({
        id: 'source-dots-layer',
        type: 'circle',
        source: 'source-dots',
        paint: {
          'circle-radius': 5,
          'circle-color': ['get', 'color'],
          'circle-opacity': ['get', 'opacity'],
          'circle-stroke-width': 1.5,
          'circle-stroke-color': ['get', 'lightColor'],
          'circle-stroke-opacity': ['*', ['get', 'opacity'], 0.6],
        },
      });

      // 10. Target endpoint dots (diamond-like with stroke)
      map.addLayer({
        id: 'target-dots-layer',
        type: 'circle',
        source: 'target-dots',
        paint: {
          'circle-radius': 6,
          'circle-color': ['get', 'color'],
          'circle-opacity': ['*', ['get', 'opacity'], 0.8],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
          'circle-stroke-opacity': ['*', ['get', 'opacity'], 0.5],
        },
      });

      sourcesAdded.current = true;
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      sourcesAdded.current = false;
    };
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // ANIMATION LOOP
  // Updates arc opacity fade, traveling dot positions, and trail segments
  // ═══════════════════════════════════════════════════════════════════════════
  const updateMapData = useCallback(() => {
    const map = mapRef.current;
    if (!map || !sourcesAdded.current) return;

    const now = Date.now();

    // ─── Build arc features ───
    const arcFeatures: GeoJSON.Feature[] = [];
    const glowFeatures: GeoJSON.Feature[] = [];
    const dotFeatures: GeoJSON.Feature[] = [];
    const trailFeatures: GeoJSON.Feature[] = [];
    const srcDotFeatures: GeoJSON.Feature[] = [];
    const tgtDotFeatures: GeoJSON.Feature[] = [];

    for (const arc of activeArcs) {
      const age = now - arc.timestamp;
      const opacity = Math.max(0.1, 1 - (age / 14000)); // Fade over 14s
      
      // Increased widths for Planar display
      const width = arc.severity === 'critical' ? 4.5 
        : arc.severity === 'high' ? 3.5 
        : 2.5;

      const lightColor = lightenColor(arc.color, 0.5);

      // Compute the curved arc path — increased curvature (0.35)
      const path = computeArcPath(
        arc.startLng, arc.startLat,
        arc.endLng, arc.endLat,
        50, // more segments for smoother curve
        0.35 // increased curvature for dramatic arcs
      );

      // ── Arc line feature (core + glow) ──
      arcFeatures.push({
        type: 'Feature',
        properties: {
          color: arc.color,
          lightColor: lightColor,
          width: width,
          opacity: opacity,
          id: arc.id,
        },
        geometry: {
          type: 'LineString',
          coordinates: path,
        },
      });

      // ── Outer glow feature (wider, more diffuse) ──
      glowFeatures.push({
        type: 'Feature',
        properties: {
          color: arc.color,
          glowWidth: width * 5,
          glowOpacity: opacity * 0.15,
        },
        geometry: {
          type: 'LineString',
          coordinates: path,
        },
      });

      // ── Traveling dot — moves from source to target ──
      // Each arc gets a dot that travels at DOT_SPEED
      // The dot loops: once it reaches the end, it restarts
      const travelTime = age / 1000; // seconds since arc appeared
      const dotT = (travelTime * DOT_SPEED) % 1.0; // 0→1 looping

      const dotPos = getPointOnArc(path, dotT);
      const dotRadius = arc.severity === 'critical' ? 6 : arc.severity === 'high' ? 5 : 4;

      dotFeatures.push({
        type: 'Feature',
        properties: {
          color: arc.color,
          lightColor: lightColor,
          radius: dotRadius,
          glowRadius: dotRadius * 2.5,
          opacity: opacity * 0.9,
        },
        geometry: {
          type: 'Point',
          coordinates: dotPos,
        },
      });

      // ── Dot trail — short line segment behind the dot ──
      const trailStart = Math.max(0, dotT - DOT_TRAIL_LENGTH);
      const trailPoints: [number, number][] = [];
      const trailSteps = 8;
      for (let i = 0; i <= trailSteps; i++) {
        const tt = trailStart + (dotT - trailStart) * (i / trailSteps);
        trailPoints.push(getPointOnArc(path, tt));
      }

      if (trailPoints.length >= 2) {
        trailFeatures.push({
          type: 'Feature',
          properties: {
            color: lightColor,
            width: width * 0.8,
            opacity: opacity * 0.6,
          },
          geometry: {
            type: 'LineString',
            coordinates: trailPoints,
          },
        });
      }

      // ── Source endpoint dot ──
      srcDotFeatures.push({
        type: 'Feature',
        properties: {
          color: arc.color,
          lightColor: lightColor,
          opacity: opacity,
        },
        geometry: {
          type: 'Point',
          coordinates: [arc.startLng, arc.startLat],
        },
      });

      // ── Target endpoint dot ──
      tgtDotFeatures.push({
        type: 'Feature',
        properties: {
          color: arc.color,
          opacity: opacity,
        },
        geometry: {
          type: 'Point',
          coordinates: [arc.endLng, arc.endLat],
        },
      });
    }

    // ─── Build source hotspot features ───
    const hotspotFeatures: GeoJSON.Feature[] = sourceHotspots.map((h: any) => ({
      type: 'Feature' as const,
      properties: {
        radius: Math.max(8, h.radius * 24),
        color: h.color,
        opacity: Math.min(0.7, h.intensity * 0.5),
      },
      geometry: {
        type: 'Point' as const,
        coordinates: [h.lng, h.lat],
      },
    }));

    // ─── Build target pressure features ───
    const targetFeatures: GeoJSON.Feature[] = targetPressures.map((t: any) => ({
      type: 'Feature' as const,
      properties: {
        radius: Math.max(10, t.maxRadius * 14),
        color: t.color,
        opacity: Math.min(0.5, t.pressure * 0.3),
      },
      geometry: {
        type: 'Point' as const,
        coordinates: [t.lng, t.lat],
      },
    }));

    // ─── Update all sources ───
    const arcSource = map.getSource('attack-arcs') as maplibregl.GeoJSONSource;
    const glowSource = map.getSource('arc-glow-outer') as maplibregl.GeoJSONSource;
    const dotSource = map.getSource('traveling-dots') as maplibregl.GeoJSONSource;
    const trailSource = map.getSource('dot-trails') as maplibregl.GeoJSONSource;
    const hotspotSource = map.getSource('source-hotspots') as maplibregl.GeoJSONSource;
    const targetSource = map.getSource('target-pressures') as maplibregl.GeoJSONSource;
    const srcDotSource = map.getSource('source-dots') as maplibregl.GeoJSONSource;
    const tgtDotSource = map.getSource('target-dots') as maplibregl.GeoJSONSource;

    if (arcSource) arcSource.setData({ type: 'FeatureCollection', features: arcFeatures });
    if (glowSource) glowSource.setData({ type: 'FeatureCollection', features: glowFeatures });
    if (dotSource) dotSource.setData({ type: 'FeatureCollection', features: dotFeatures });
    if (trailSource) trailSource.setData({ type: 'FeatureCollection', features: trailFeatures });
    if (hotspotSource) hotspotSource.setData({ type: 'FeatureCollection', features: hotspotFeatures });
    if (targetSource) targetSource.setData({ type: 'FeatureCollection', features: targetFeatures });
    if (srcDotSource) srcDotSource.setData({ type: 'FeatureCollection', features: srcDotFeatures });
    if (tgtDotSource) tgtDotSource.setData({ type: 'FeatureCollection', features: tgtDotFeatures });
  }, [activeArcs, sourceHotspots, targetPressures]);

  // Animation loop using requestAnimationFrame for smooth dot movement
  useEffect(() => {
    let running = true;

    const animate = () => {
      if (!running) return;
      updateMapData();
      animFrameRef.current = requestAnimationFrame(animate);
    };

    // Start animation
    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      running = false;
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [updateMapData]);

  return (
    <div className="relative w-full h-full overflow-hidden rounded-lg">
      {/* Maplibre GL map container — ALL rendering happens here */}
      <div ref={containerRef} className="w-full h-full" style={{ background: '#0a1628' }} />

      {/* Attack Type Legend — bottom left */}
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
                  boxShadow: `0 0 6px ${item.color}88`,
                }}
              />
              <span className="font-data text-[9px] text-[var(--color-cp-text-tertiary)] opacity-70">
                {item.label}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-2 flex flex-col gap-0.5">
          <div className="font-data text-caption text-[var(--color-cp-text-tertiary)] tabular-nums opacity-50">
            {activeArcs.length} active event{activeArcs.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>
    </div>
  );
}
