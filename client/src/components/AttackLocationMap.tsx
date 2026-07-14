/**
 * AttackLocationMap — Auto-cycling Google Map showing recent attack source locations
 * 
 * Displays a dark-themed Google Map that automatically cycles through
 * the most recent attack source locations every 8 seconds.
 * Shows a marker at each attack source with a brief info overlay.
 * 
 * Designed for passive wall display — no interaction required.
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { useThreatData, type ArcData } from '@/contexts/ThreatContext';
import { MapView } from '@/components/Map';

// Dark map style matching the dashboard aesthetic
const DARK_MAP_STYLES: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#0C2340' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0C2340' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#6a8ab5' }] },
  { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#1a3a5c' }] },
  { featureType: 'administrative.country', elementType: 'labels.text.fill', stylers: [{ color: '#5a7a9a' }] },
  { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#0a1e38' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#152d4a' }] },
  { featureType: 'road', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#1a3a5c' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#050d18' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#3a5a7a' }] },
];

const CYCLE_INTERVAL = 8000; // 8 seconds per location

export default function AttackLocationMap() {
  const { activeArcs } = useThreatData();
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const cycleTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [currentArc, setCurrentArc] = useState<ArcData | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const arcsRef = useRef<ArcData[]>([]);

  // Keep arcs ref updated
  useEffect(() => {
    arcsRef.current = activeArcs;
  }, [activeArcs]);

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

    const position = { lat: arc.startLat, lng: arc.startLng };

    // Smooth pan to new location
    mapRef.current.panTo(position);
    mapRef.current.setZoom(6);

    // Update or create marker
    if (markerRef.current) {
      markerRef.current.position = position;
      markerRef.current.title = `${arc.attackType} from ${arc.sourceIp}`;
      // Update marker content
      const content = createMarkerContent(arc);
      markerRef.current.content = content;
    }
  }, []);

  // Create custom marker element
  const createMarkerContent = (arc: ArcData): HTMLElement => {
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
    return el;
  };

  // Handle map ready
  const handleMapReady = useCallback((map: google.maps.Map) => {
    mapRef.current = map;

    map.setOptions({
      styles: DARK_MAP_STYLES,
      disableDefaultUI: true,
      zoomControl: false,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      gestureHandling: 'none', // No interaction — passive display
      keyboardShortcuts: false,
    });

    // Create initial marker (hidden until first arc)
    const initialMarker = new google.maps.marker.AdvancedMarkerElement({
      map,
      position: { lat: 0, lng: 0 },
      title: '',
    });
    markerRef.current = initialMarker;

    // Show first arc immediately if available
    const arcs = arcsRef.current;
    if (arcs.length > 0) {
      const arc = arcs[0];
      setCurrentArc(arc);
      panToArc(arc);
    }
  }, [panToArc]);

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Google Map */}
      <MapView
        className="w-full h-full"
        initialCenter={{ lat: 30, lng: 20 }}
        initialZoom={3}
        onMapReady={handleMapReady}
      />

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
