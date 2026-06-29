/**
 * GlobeOverlays — Additional visual layers rendered as SVG overlays on the globe
 * 
 * 1. Day/Night Terminator — a gradient shadow boundary that moves based on time
 * 2. Comet Tails — fading afterimage trails for recent attack arcs
 * 3. Orbital Ring — a visible ring path connecting sensor nodes
 */
import { useEffect, useState, useMemo } from 'react';
import { useThreatData, type ArcData } from '@/contexts/ThreatContext';

// Simple mercator-like projection for overlay positioning
function projectToScreen(lat: number, lng: number, width: number, height: number) {
  const x = ((lng + 180) / 360) * width;
  const y = ((90 - lat) / 180) * height;
  return { x, y };
}

// Calculate the sun's approximate longitude based on UTC time
function getSunLongitude(): number {
  const now = new Date();
  const hours = now.getUTCHours() + now.getUTCMinutes() / 60;
  // Sun is at longitude 0 at 12:00 UTC, moves 15° per hour westward
  return ((12 - hours) * 15) % 360;
}

interface CometTail {
  id: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  color: string;
  opacity: number;
  createdAt: number;
}

export default function GlobeOverlays() {
  const { activeArcs } = useThreatData();
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [cometTails, setCometTails] = useState<CometTail[]>([]);
  const [sunLng, setSunLng] = useState(getSunLongitude());

  // Update dimensions based on container
  useEffect(() => {
    const updateDims = () => {
      const globe = document.querySelector('[class*="globe"]')?.parentElement;
      if (globe) {
        setDimensions({ width: globe.clientWidth, height: globe.clientHeight });
      } else {
        setDimensions({ width: window.innerWidth * 0.55, height: window.innerHeight * 0.6 });
      }
    };
    updateDims();
    window.addEventListener('resize', updateDims);
    return () => window.removeEventListener('resize', updateDims);
  }, []);

  // Update sun position every minute
  useEffect(() => {
    const interval = setInterval(() => setSunLng(getSunLongitude()), 60000);
    return () => clearInterval(interval);
  }, []);

  // Track recent arcs for comet tail effect
  const prevArcsRef = useMemo(() => new Set<string>(), []);
  
  useEffect(() => {
    const now = Date.now();
    const newTails: CometTail[] = [];
    
    activeArcs.forEach(arc => {
      if (!prevArcsRef.has(arc.id)) {
        prevArcsRef.add(arc.id);
        const start = projectToScreen(arc.startLat, arc.startLng, dimensions.width, dimensions.height);
        const end = projectToScreen(arc.endLat, arc.endLng, dimensions.width, dimensions.height);
        newTails.push({
          id: `tail-${arc.id}-${now}`,
          startX: start.x,
          startY: start.y,
          endX: end.x,
          endY: end.y,
          color: arc.color,
          opacity: 0.6,
          createdAt: now,
        });
      }
    });

    if (newTails.length > 0) {
      setCometTails(prev => [...prev, ...newTails].slice(-30)); // Keep max 30 tails
    }

    // Fade out old tails
    const fadeInterval = setInterval(() => {
      setCometTails(prev => 
        prev
          .map(t => ({ ...t, opacity: t.opacity - 0.02 }))
          .filter(t => t.opacity > 0)
      );
    }, 100);

    return () => clearInterval(fadeInterval);
  }, [activeArcs, dimensions, prevArcsRef]);

  // Day/night terminator gradient position
  const terminatorX = ((sunLng + 180) / 360) * dimensions.width;

  // Sensor node positions for orbital ring derivation
  const sensorPositions = useMemo(() => [
    { lat: 38.9, lng: -77.0 },
    { lat: 37.4, lng: -122.1 },
    { lat: 51.5, lng: -0.1 },
    { lat: 50.1, lng: 8.7 },
    { lat: 1.35, lng: 103.8 },
    { lat: 35.7, lng: 139.7 },
    { lat: -33.9, lng: 151.2 },
    { lat: 55.8, lng: 37.6 },
    { lat: 39.9, lng: 116.4 },
    { lat: -23.5, lng: -46.6 },
  ], []);

  // Orbital ring path — derived from actual sensor node positions
  // Sort by longitude to create a smooth ring connecting all nodes
  const orbitalPath = useMemo(() => {
    const sorted = [...sensorPositions].sort((a, b) => a.lng - b.lng);
    const projected = sorted.map(s => projectToScreen(s.lat, s.lng, dimensions.width, dimensions.height));
    
    if (projected.length < 2) return '';
    
    // Create a smooth curve through all sensor positions using quadratic bezier
    let path = `M ${projected[0].x.toFixed(1)} ${projected[0].y.toFixed(1)}`;
    for (let i = 1; i < projected.length; i++) {
      const prev = projected[i - 1];
      const curr = projected[i];
      const cpx = (prev.x + curr.x) / 2;
      const cpy = Math.min(prev.y, curr.y) - 15; // Curve upward slightly
      path += ` Q ${cpx.toFixed(1)} ${cpy.toFixed(1)} ${curr.x.toFixed(1)} ${curr.y.toFixed(1)}`;
    }
    // Close the loop back to start
    const last = projected[projected.length - 1];
    const first = projected[0];
    const cpx = (last.x + first.x + dimensions.width) / 3; // Wrap around
    const cpy = dimensions.height * 0.3;
    path += ` Q ${cpx.toFixed(1)} ${cpy.toFixed(1)} ${first.x.toFixed(1)} ${first.y.toFixed(1)}`;
    
    return path;
  }, [dimensions, sensorPositions]);

  // Sensor node dots on the orbital ring
  const sensorDots = useMemo(() => {
    return sensorPositions.map((s, i) => {
      const pos = projectToScreen(s.lat, s.lng, dimensions.width, dimensions.height);
      return { ...pos, id: i };
    });
  }, [sensorPositions, dimensions]);

  return (
    <svg
      className="absolute inset-0 pointer-events-none z-[2]"
      width={dimensions.width}
      height={dimensions.height}
      style={{ mixBlendMode: 'screen' }}
    >
      <defs>
        {/* Day/night terminator gradient */}
        <linearGradient id="terminator-grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="rgba(0,0,0,0)" />
          <stop offset="40%" stopColor="rgba(0,0,0,0)" />
          <stop offset="50%" stopColor="rgba(0,5,20,0.3)" />
          <stop offset="60%" stopColor="rgba(0,5,20,0.5)" />
          <stop offset="100%" stopColor="rgba(0,5,20,0.5)" />
        </linearGradient>

        {/* Orbital ring glow filter */}
        <filter id="orbital-glow">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Comet tail gradient */}
        <linearGradient id="comet-fade" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="white" stopOpacity="0.8" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Globe-clipped day/night terminator — circular clip to match globe shape */}
      <clipPath id="globe-clip">
        <circle cx={dimensions.width / 2} cy={dimensions.height / 2} r={Math.min(dimensions.width, dimensions.height) * 0.4} />
      </clipPath>
      <g clipPath="url(#globe-clip)">
        <rect
          x={terminatorX}
          y={0}
          width={dimensions.width}
          height={dimensions.height}
          fill="url(#terminator-grad)"
          opacity={0.35}
        />
      </g>

      {/* Orbital Ring Path — connecting sensor nodes */}
      {orbitalPath && (
        <path
          d={orbitalPath}
          fill="none"
          stroke="rgba(92, 138, 77, 0.2)"
          strokeWidth={1}
          strokeDasharray="6 3"
          filter="url(#orbital-glow)"
        />
      )}

      {/* Sensor node dots on the orbital ring */}
      {sensorDots.map(dot => (
        <circle
          key={dot.id}
          cx={dot.x}
          cy={dot.y}
          r={2.5}
          fill="rgba(92, 138, 77, 0.6)"
          stroke="rgba(92, 138, 77, 0.3)"
          strokeWidth={1}
        />
      ))}

      {/* Animated orbital dot traveling along the ring */}
      {orbitalPath && (
        <circle r={3} fill="rgba(92, 138, 77, 0.9)">
          <animateMotion
            dur="25s"
            repeatCount="indefinite"
            path={orbitalPath}
          />
        </circle>
      )}

      {/* Comet Tails — fading afterimage trails */}
      {cometTails.map(tail => (
        <line
          key={tail.id}
          x1={tail.startX}
          y1={tail.startY}
          x2={tail.endX}
          y2={tail.endY}
          stroke={tail.color}
          strokeWidth={1.5}
          opacity={tail.opacity}
          strokeLinecap="round"
        />
      ))}
    </svg>
  );
}
