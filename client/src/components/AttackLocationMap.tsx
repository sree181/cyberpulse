/**
 * AttackLocationMap — Auto-cycling Maplibre GL map showing recent attack source locations
 * 
 * Displays a dark-themed raster map that automatically cycles through
 * the most recent attack source locations every 8 seconds.
 * Shows a pulsing marker at each attack source with a brief info overlay.
 * 
 * Designed for passive wall display — no interaction required.
 * Uses Maplibre GL JS with CARTO Dark Matter tiles (brightness-boosted).
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { useThreatData, type ArcData } from '@/contexts/ThreatContext';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

// CARTO Dark Matter with brightness boost — no auth required, better contrast
const DARK_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  name: 'CyberPulse Dark',
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

const CYCLE_INTERVAL = 8000; // 8 seconds per location

export default function AttackLocationMap() {
  const { activeArcs } = useThreatData();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const cycleTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [currentArc, setCurrentArc] = useState<ArcData | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const arcsRef = useRef<ArcData[]>([]);

  // Keep arcs ref updated
  useEffect(() => {
    arcsRef.current = activeArcs;
  }, [activeArcs]);

  // Initialize Maplibre GL map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: DARK_STYLE,
      center: [20, 30],
      zoom: 3,
      interactive: false, // Passive display — no interaction
      attributionControl: false,
      fadeDuration: 0,
      renderWorldCopies: false, // Prevent map from repeating horizontally
    });

    map.on('load', () => {
      mapRef.current = map;

      // Show first arc immediately if available
      const arcs = arcsRef.current;
      if (arcs.length > 0) {
        const arc = arcs[0];
        setCurrentArc(arc);
        panToArc(arc);
      }
    });

    return () => {
      if (cycleTimerRef.current) clearInterval(cycleTimerRef.current);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Auto-cycle through attack locations
  useEffect(() => {
    cycleTimerRef.current = setInterval(() => {
      const arcs = arcsRef.current;
      if (arcs.length === 0 || !mapRef.current) return;

      setCurrentIndex(prev => {
        const nextIdx = (prev + 1) % arcs.length;
        const arc = arcs[nextIdx];
        setCurrentArc(arc);
        panToArc(arc);
        return nextIdx;
      });
    }, CYCLE_INTERVAL);

    return () => {
      if (cycleTimerRef.current) clearInterval(cycleTimerRef.current);
    };
  }, []);

  // Pan map and update marker for a given arc
  const panToArc = useCallback((arc: ArcData) => {
    if (!mapRef.current) return;

    const lngLat: [number, number] = [arc.startLng, arc.startLat];

    // Smooth fly to new location
    mapRef.current.flyTo({
      center: lngLat,
      zoom: 6,
      duration: 1500,
      essential: true,
    });

    // Remove existing marker
    if (markerRef.current) {
      markerRef.current.remove();
    }

    // Create pulsing marker element
    const el = document.createElement('div');
    el.innerHTML = `
      <div style="
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="
          width: 16px; height: 16px;
          background: ${arc.color};
          border: 2px solid rgba(255,255,255,0.9);
          border-radius: 50%;
          box-shadow: 0 0 8px ${arc.color}AA, 0 0 20px ${arc.color}55;
          animation: pulse-marker 2s infinite;
        "></div>
        <div style="
          position: absolute;
          width: 40px; height: 40px;
          border: 1px solid ${arc.color}66;
          border-radius: 50%;
          animation: ring-expand 2s infinite;
        "></div>
      </div>
    `;

    const marker = new maplibregl.Marker({ element: el })
      .setLngLat(lngLat)
      .addTo(mapRef.current);

    markerRef.current = marker;
  }, []);

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Maplibre GL Map */}
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Info overlay — bottom of map panel */}
      {currentArc && (
        <div className="absolute bottom-2 left-2 right-2 z-10">
          <div className="bg-[var(--color-cp-base)]/85 backdrop-blur-sm border border-[var(--color-cp-border)] rounded-md px-3 py-2">
            <div className="flex items-center gap-2">
              <div 
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: currentArc.color, boxShadow: `0 0 6px ${currentArc.color}` }}
              />
              <span className="font-data text-caption text-[var(--color-cp-text-primary)] font-medium">
                {currentArc.attackType}
              </span>
              <span className="font-data text-caption text-[var(--color-cp-text-tertiary)] ml-auto tabular-nums">
                {currentArc.sourceIp}
              </span>
            </div>
            <div className="mt-1 flex items-center gap-2 text-caption text-[var(--color-cp-text-secondary)]">
              <span className="font-data">{currentArc.sourceCity}, {currentArc.sourceCountry}</span>
              <span className="text-[var(--color-cp-text-tertiary)]">&rarr;</span>
              <span className="font-data">{currentArc.targetName}:{currentArc.port}</span>
            </div>
          </div>
        </div>
      )}

      {/* Header label */}
      <div className="absolute top-2 left-3 z-10">
        <span className="font-data text-[9px] text-[var(--color-cp-text-tertiary)] uppercase tracking-wider opacity-60">
          Attack Source
        </span>
      </div>

      {/* Cycle indicator dots */}
      {activeArcs.length > 0 && (
        <div className="absolute top-2 right-3 z-10 flex items-center gap-1">
          {activeArcs.slice(0, Math.min(8, activeArcs.length)).map((_, i) => (
            <div
              key={i}
              className={`w-1 h-1 rounded-full transition-all duration-300 ${
                i === currentIndex % Math.min(8, activeArcs.length)
                  ? 'bg-[var(--color-cp-accent)] scale-150'
                  : 'bg-[var(--color-cp-text-tertiary)]/30'
              }`}
            />
          ))}
        </div>
      )}

      {/* CSS animations for marker */}
      <style>{`
        @keyframes pulse-marker {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.3); }
        }
        @keyframes ring-expand {
          0% { transform: scale(0.5); opacity: 1; }
          100% { transform: scale(2); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
