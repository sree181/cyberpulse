/**
 * ThreatFlatMap — 2D Flat World Map with GPU-Accelerated Attack Arcs
 * 
 * Uses Maplibre GL JS for the base map with CARTO Dark Matter tiles,
 * and Deck.gl ArcLayer for rendering attack trajectories on the GPU.
 * 
 * Replaces the previous D3 + SVG implementation for better performance
 * at 4K/8K resolutions on the Planar wall display.
 */
import { useEffect, useRef, useMemo, useCallback } from 'react';
import { useThreatData, type ArcData } from '@/contexts/ThreatContext';
import { BRANDING } from '@/lib/branding';
import maplibregl from 'maplibre-gl';
import { Deck } from '@deck.gl/core';
import { ArcLayer, ScatterplotLayer } from '@deck.gl/layers';
import 'maplibre-gl/dist/maplibre-gl.css';

// Stadia Alidade Smooth Dark — better land/water contrast than CARTO Dark Matter
const DARK_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  name: 'CyberPulse Flat Map',
  sources: {
    'stadia-dark': {
      type: 'raster',
      tiles: [
        'https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}@2x.png',
      ],
      tileSize: 256,
      attribution: '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a> &copy; <a href="https://openmaptiles.org/">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxzoom: 20,
    },
  },
  layers: [
    {
      id: 'background',
      type: 'background',
      paint: { 'background-color': '#080e18' },
    },
    {
      id: 'stadia-dark',
      type: 'raster',
      source: 'stadia-dark',
      minzoom: 0,
      maxzoom: 20,
      paint: {
        'raster-opacity': 0.85,
        'raster-saturation': -0.1,
        'raster-contrast': 0.05,
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
  const deckRef = useRef<Deck | null>(null);
  const animFrameRef = useRef<number>(0);

  // Initialize Maplibre GL map and Deck.gl overlay
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
    });

    // Create Deck.gl instance overlaid on the map
    const deck = new Deck({
      parent: containerRef.current,
      style: {
        position: 'absolute',
        top: '0',
        left: '0',
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
      },
      viewState: {
        longitude: 20,
        latitude: 20,
        zoom: 1.5,
        pitch: 0,
        bearing: 0,
      },
      controller: false,
      layers: [],
    });

    mapRef.current = map;
    deckRef.current = deck;

    // Sync Deck.gl viewState with Maplibre (in case of future interaction)
    map.on('move', () => {
      const center = map.getCenter();
      const zoom = map.getZoom();
      const pitch = map.getPitch();
      const bearing = map.getBearing();
      deck.setProps({
        viewState: {
          longitude: center.lng,
          latitude: center.lat,
          zoom,
          pitch,
          bearing,
        },
      });
    });

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      deck.finalize();
      map.remove();
      mapRef.current = null;
      deckRef.current = null;
    };
  }, []);

  // Update Deck.gl layers when data changes
  const updateLayers = useCallback(() => {
    if (!deckRef.current) return;

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
        if (d.severity === 'critical') return 4;
        if (d.severity === 'high') return 3;
        return 2;
      },
      getHeight: 0.4,
      greatCircle: true,
      widthMinPixels: 1,
      widthMaxPixels: 6,
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

    deckRef.current.setProps({
      layers: [targetLayer, sourceLayer, arcLayer],
    });
  }, [activeArcs, sourceHotspots, targetPressures]);

  // Animate — re-render layers periodically for opacity fade
  useEffect(() => {
    let running = true;

    const animate = () => {
      if (!running) return;
      updateLayers();
      animFrameRef.current = requestAnimationFrame(animate);
    };

    // Start animation loop (throttled to ~15fps for layer updates)
    const interval = setInterval(() => {
      updateLayers();
    }, 66); // ~15fps is enough for opacity fading

    // Initial render
    updateLayers();

    return () => {
      running = false;
      clearInterval(interval);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [updateLayers]);

  return (
    <div className="relative w-full h-full overflow-hidden rounded-lg">
      {/* Maplibre GL + Deck.gl container */}
      <div ref={containerRef} className="w-full h-full" style={{ background: '#080e18' }} />

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
