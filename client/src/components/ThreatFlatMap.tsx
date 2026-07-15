/**
 * ThreatFlatMap — 2D Flat World Map with Attack Arcs
 * 
 * Uses ONLY Maplibre GL JS native layers for rendering. No Deck.gl.
 * This guarantees pixel-perfect alignment because all geometry (arcs, dots)
 * is rendered by the same engine in the same coordinate system as the map tiles.
 * 
 * Arcs are computed as quadratic Bezier curves in geographic coordinates,
 * then rendered as Maplibre GeoJSON line layers.
 */
import { useEffect, useRef, useCallback } from 'react';
import { useThreatData, type ArcData } from '@/contexts/ThreatContext';
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
  numPoints: number = 40,
  curvature: number = 0.3
): [number, number][] {
  // Midpoint
  const midLng = (srcLng + dstLng) / 2;
  const midLat = (srcLat + dstLat) / 2;

  // Direction vector (src → dst)
  const dLng = dstLng - srcLng;
  const dLat = dstLat - srcLat;

  // Perpendicular offset (rotated 90°) — this creates the curve
  // Scale by distance to make longer arcs curve more
  const dist = Math.sqrt(dLng * dLng + dLat * dLat);
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

// Attack type legend
const ATTACK_TYPE_LEGEND = [
  { label: 'SSH Brute Force', color: BRANDING.attackColors['SSH Brute Force'] },
  { label: 'Port Scan', color: BRANDING.attackColors['Port Scan'] },
  { label: 'SQL Injection', color: BRANDING.attackColors['SQL Injection'] },
  { label: 'DDoS', color: BRANDING.attackColors['DDoS'] },
  { label: 'Malware C2', color: BRANDING.attackColors['Malware C2'] },
];

export default function ThreatFlatMap() {
  const { activeArcs, sourceHotspots, targetPressures } = useThreatData();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const sourcesAdded = useRef(false);

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
      // Add empty GeoJSON sources for arcs, sources, and targets
      map.addSource('attack-arcs', {
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

      // Target pressure circles (rendered first, behind arcs)
      map.addLayer({
        id: 'target-pressure-fill',
        type: 'circle',
        source: 'target-pressures',
        paint: {
          'circle-radius': ['get', 'radius'],
          'circle-color': ['get', 'color'],
          'circle-opacity': ['get', 'opacity'],
          'circle-blur': 0.5,
        },
      });

      // Source hotspot circles
      map.addLayer({
        id: 'source-hotspots-glow',
        type: 'circle',
        source: 'source-hotspots',
        paint: {
          'circle-radius': ['get', 'radius'],
          'circle-color': ['get', 'color'],
          'circle-opacity': ['get', 'opacity'],
          'circle-blur': 0.4,
        },
      });

      map.addLayer({
        id: 'source-hotspots-core',
        type: 'circle',
        source: 'source-hotspots',
        paint: {
          'circle-radius': ['*', ['get', 'radius'], 0.4],
          'circle-color': ['get', 'color'],
          'circle-opacity': ['min', ['*', ['get', 'opacity'], 1.8], 1],
        },
      });

      // Arc lines — rendered on top of everything
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

      // Arc glow effect (wider, more transparent line behind)
      map.addLayer({
        id: 'attack-arcs-glow',
        type: 'line',
        source: 'attack-arcs',
        paint: {
          'line-color': ['get', 'color'],
          'line-width': ['*', ['get', 'width'], 3],
          'line-opacity': ['*', ['get', 'opacity'], 0.25],
          'line-blur': 3,
        },
        layout: {
          'line-cap': 'round',
          'line-join': 'round',
        },
      }, 'attack-arcs-line'); // Insert below the main arc line

      // Source endpoint dots (on top of arcs)
      map.addLayer({
        id: 'arc-source-dots',
        type: 'circle',
        source: 'attack-arcs',
        filter: ['==', ['geometry-type'], 'Point'],
        paint: {
          'circle-radius': 4,
          'circle-color': ['get', 'color'],
          'circle-opacity': 0.9,
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

  // Update map data when arcs/hotspots change
  const updateMapData = useCallback(() => {
    const map = mapRef.current;
    if (!map || !sourcesAdded.current) return;

    const now = Date.now();

    // ─── Build arc features ───
    const arcFeatures: GeoJSON.Feature[] = [];
    const sourcePointFeatures: GeoJSON.Feature[] = [];

    for (const arc of activeArcs) {
      const age = now - arc.timestamp;
      const opacity = Math.max(0.15, 1 - (age / 12000)); // Fade over 12s
      const width = arc.severity === 'critical' ? 3 : arc.severity === 'high' ? 2.5 : 1.5;

      // Compute the curved arc path in geographic coordinates
      const path = computeArcPath(
        arc.startLng, arc.startLat,
        arc.endLng, arc.endLat,
        40, // segments
        0.25 // curvature
      );

      // Arc line feature
      arcFeatures.push({
        type: 'Feature',
        properties: {
          color: arc.color,
          width: width,
          opacity: opacity,
          id: arc.id,
        },
        geometry: {
          type: 'LineString',
          coordinates: path,
        },
      });

      // Source point (start of arc)
      sourcePointFeatures.push({
        type: 'Feature',
        properties: {
          color: arc.color,
          opacity: opacity,
        },
        geometry: {
          type: 'Point',
          coordinates: [arc.startLng, arc.startLat],
        },
      });
    }

    // ─── Build source hotspot features ───
    const hotspotFeatures: GeoJSON.Feature[] = sourceHotspots.map((h: any) => ({
      type: 'Feature' as const,
      properties: {
        radius: Math.max(6, h.radius * 20),
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
        radius: Math.max(8, t.maxRadius * 12),
        color: t.color,
        opacity: Math.min(0.5, t.pressure * 0.3),
      },
      geometry: {
        type: 'Point' as const,
        coordinates: [t.lng, t.lat],
      },
    }));

    // Update all sources
    const arcSource = map.getSource('attack-arcs') as maplibregl.GeoJSONSource;
    const hotspotSource = map.getSource('source-hotspots') as maplibregl.GeoJSONSource;
    const targetSource = map.getSource('target-pressures') as maplibregl.GeoJSONSource;

    if (arcSource) {
      // Combine arc lines and source points into one collection
      arcSource.setData({
        type: 'FeatureCollection',
        features: [...arcFeatures, ...sourcePointFeatures],
      });
    }
    if (hotspotSource) {
      hotspotSource.setData({
        type: 'FeatureCollection',
        features: hotspotFeatures,
      });
    }
    if (targetSource) {
      targetSource.setData({
        type: 'FeatureCollection',
        features: targetFeatures,
      });
    }
  }, [activeArcs, sourceHotspots, targetPressures]);

  // Animate — re-render periodically for opacity fade
  useEffect(() => {
    let running = true;

    const interval = setInterval(() => {
      if (running) updateMapData();
    }, 100); // ~10fps for smooth fading

    // Initial render
    updateMapData();

    return () => {
      running = false;
      clearInterval(interval);
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
                  boxShadow: `0 0 4px ${item.color}66`,
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
