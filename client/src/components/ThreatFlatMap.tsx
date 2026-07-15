/**
 * ThreatFlatMap — 2D Flat World Map with GPU-Accelerated Attack Arcs
 * 
 * Uses Maplibre GL JS for the base map with CARTO Dark Matter tiles (brightness-boosted),
 * and Deck.gl ArcLayer via MapboxOverlay for perfectly synchronized rendering.
 * 
 * MapboxOverlay ensures Deck.gl layers are rendered in the same coordinate system
 * as the Maplibre map, so arcs start exactly at source and end exactly at target.
 */
import { useEffect, useRef, useCallback } from 'react';
import { useThreatData, type ArcData } from '@/contexts/ThreatContext';
import { BRANDING } from '@/lib/branding';
import maplibregl from 'maplibre-gl';
import { MapboxOverlay } from '@deck.gl/mapbox';
import { ArcLayer, ScatterplotLayer } from '@deck.gl/layers';
import 'maplibre-gl/dist/maplibre-gl.css';

// CARTO Dark Matter with brightness boost — no auth required, better contrast
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

// Parse hex color to RGBA array [r, g, b, a]
function hexToRGBA(hex: string, alpha = 255): [number, number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b, alpha];
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
  const overlayRef = useRef<MapboxOverlay | null>(null);

  // Initialize Maplibre GL map with MapboxOverlay (Deck.gl)
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
      renderWorldCopies: false, // Prevent map from repeating horizontally
    });

    // Create MapboxOverlay — interleaved mode renders Deck.gl layers WITHIN
    // the Maplibre render pipeline, ensuring pixel-perfect alignment even when
    // parent containers have CSS transforms (will-change, translateZ, etc.)
    const overlay = new MapboxOverlay({
      interleaved: true,
      layers: [],
    });

    // Add the overlay immediately — it handles its own initialization timing
    map.addControl(overlay as any);

    mapRef.current = map;
    overlayRef.current = overlay;

    return () => {
      overlay.finalize();
      map.remove();
      mapRef.current = null;
      overlayRef.current = null;
    };
  }, []);

  // Update Deck.gl layers when data changes
  const updateLayers = useCallback(() => {
    if (!overlayRef.current) return;

    const now = Date.now();

    // Arc layer — GPU-instanced attack trajectories
    const arcLayer = new ArcLayer({
      id: 'attack-arcs',
      data: activeArcs,
      getSourcePosition: (d: ArcData) => [d.startLng, d.startLat],
      getTargetPosition: (d: ArcData) => [d.endLng, d.endLat],
      getSourceColor: (d: ArcData) => {
        const age = now - d.timestamp;
        const alpha = Math.max(80, 255 - Math.floor((age / 10000) * 175));
        return hexToRGBA(d.color, alpha);
      },
      getTargetColor: (d: ArcData) => {
        const age = now - d.timestamp;
        const alpha = Math.max(50, 200 - Math.floor((age / 10000) * 150));
        return hexToRGBA(d.color, alpha);
      },
      getWidth: (d: ArcData) => {
        if (d.severity === 'critical') return 3;
        if (d.severity === 'high') return 2.5;
        return 1.5;
      },
      getHeight: 0.3, // Visible arc curve
      greatCircle: true,
      numSegments: 50, // Smooth arc curve
      widthMinPixels: 1,
      widthMaxPixels: 4,
      updateTriggers: {
        getSourceColor: [now],
        getTargetColor: [now],
      },
    });

    // Source hotspots — scatterplot
    const sourceLayer = new ScatterplotLayer({
      id: 'source-hotspots',
      data: sourceHotspots,
      getPosition: (d: any) => [d.lng, d.lat],
      getRadius: (d: any) => Math.max(20000, d.radius * 80000),
      getFillColor: (d: any) => hexToRGBA(d.color, Math.floor(d.intensity * 120)),
      getLineColor: (d: any) => hexToRGBA(d.color, 200),
      lineWidthMinPixels: 1,
      stroked: true,
      filled: true,
      radiusMinPixels: 4,
      radiusMaxPixels: 30,
    });

    // Target pressure points
    const targetLayer = new ScatterplotLayer({
      id: 'target-pressure',
      data: targetPressures,
      getPosition: (d: any) => [d.lng, d.lat],
      getRadius: (d: any) => Math.max(15000, d.maxRadius * 40000),
      getFillColor: (d: any) => hexToRGBA(d.color, Math.floor(d.pressure * 80)),
      getLineColor: (d: any) => hexToRGBA(d.color, Math.floor(d.pressure * 180)),
      lineWidthMinPixels: 1,
      stroked: true,
      filled: true,
      radiusMinPixels: 5,
      radiusMaxPixels: 25,
    });

    overlayRef.current.setProps({
      layers: [targetLayer, sourceLayer, arcLayer],
    });
  }, [activeArcs, sourceHotspots, targetPressures]);

  // Animate — re-render layers periodically for opacity fade
  useEffect(() => {
    let running = true;

    const interval = setInterval(() => {
      if (running) updateLayers();
    }, 66); // ~15fps for opacity fading

    // Initial render
    updateLayers();

    return () => {
      running = false;
      clearInterval(interval);
    };
  }, [updateLayers]);

  return (
    <div className="relative w-full h-full overflow-hidden rounded-lg">
      {/* Maplibre GL + Deck.gl MapboxOverlay container */}
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
