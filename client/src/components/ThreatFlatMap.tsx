/**
 * ThreatFlatMap — 2D Flat World Map with Attack Arcs
 * 
 * Inspired by Kaspersky CyberMap / Checkpoint ThreatMap:
 * - Dark flat world map (Mercator projection)
 * - Animated arcs drawn as SVG quadratic curves
 * - Source/target dots with glow effects
 * - Same data source as the 3D globe (activeArcs from ThreatContext)
 */
import { useMemo, useEffect, useRef, useState } from 'react';
import { useThreatData, type ArcData } from '@/contexts/ThreatContext';
import { BRANDING } from '@/lib/branding';

// Simple Mercator projection: lat/lng → x/y (0-1 range)
function latLngToXY(lat: number, lng: number): [number, number] {
  const x = (lng + 180) / 360;
  // Mercator y with clamping
  const latRad = (Math.max(-85, Math.min(85, lat)) * Math.PI) / 180;
  const mercN = Math.log(Math.tan(Math.PI / 4 + latRad / 2));
  const y = 0.5 - mercN / (2 * Math.PI);
  return [x, y];
}

// Generate a quadratic bezier curve control point (arc above the line)
function getControlPoint(x1: number, y1: number, x2: number, y2: number): [number, number] {
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.sqrt(dx * dx + dy * dy);
  // Arc height proportional to distance, perpendicular to the line
  const arcHeight = Math.min(dist * 0.35, 0.15);
  // Perpendicular direction (rotate 90 degrees, always curve upward)
  const perpX = -dy / dist;
  const perpY = dx / dist;
  // Choose direction that curves upward (negative y in SVG)
  const sign = perpY < 0 ? 1 : -1;
  return [midX + perpX * arcHeight * sign, midY + perpY * arcHeight * sign];
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
  const [dimensions, setDimensions] = useState({ width: 1200, height: 600 });

  // Responsive sizing
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const { width, height } = dimensions;

  // Convert arcs to SVG paths
  const arcPaths = useMemo(() => {
    return activeArcs.map((arc) => {
      let [x1, y1] = latLngToXY(arc.startLat, arc.startLng);
      let [x2, y2] = latLngToXY(arc.endLat, arc.endLng);

      // Scale to pixel coords
      x1 *= width;
      y1 *= height;
      x2 *= width;
      y2 *= height;

      // Handle wrapping (if arc crosses the date line, skip for simplicity)
      const wrapDist = Math.abs(arc.startLng - arc.endLng);
      if (wrapDist > 180) return null;

      const [cx, cy] = getControlPoint(x1, y1, x2, y2);
      const controlX = cx * width / width; // already in pixel space from getControlPoint
      const controlY = cy * height / height;

      // Actually recalculate control point in pixel space
      const midX = (x1 + x2) / 2;
      const midY = (y1 + y2) / 2;
      const dx = x2 - x1;
      const dy = y2 - y1;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const arcHeight = Math.min(dist * 0.3, height * 0.15);
      const perpX = -dy / dist;
      const perpY = dx / dist;
      const sign = perpY < 0 ? 1 : -1;
      const cpx = midX + perpX * arcHeight * sign;
      const cpy = midY + perpY * arcHeight * sign;

      // Age-based opacity
      const age = Date.now() - arc.timestamp;
      const maxAge = 10000;
      const opacity = Math.max(0.3, 1 - (age / maxAge) * 0.7);

      return {
        id: arc.id,
        path: `M ${x1} ${y1} Q ${cpx} ${cpy} ${x2} ${y2}`,
        color: arc.color,
        opacity,
        severity: arc.severity,
        x1, y1, x2, y2,
        arc,
      };
    }).filter(Boolean) as Array<{
      id: string;
      path: string;
      color: string;
      opacity: number;
      severity: string;
      x1: number; y1: number; x2: number; y2: number;
      arc: ArcData;
    }>;
  }, [activeArcs, width, height]);

  // Source hotspots as dots
  const hotspotDots = useMemo(() => {
    return sourceHotspots.map((h) => {
      const [x, y] = latLngToXY(h.lat, h.lng);
      return {
        x: x * width,
        y: y * height,
        color: h.color,
        radius: Math.max(4, h.radius * 12),
        country: h.country,
        intensity: h.intensity,
      };
    });
  }, [sourceHotspots, width, height]);

  // Target pressure rings
  const targetDots = useMemo(() => {
    return targetPressures.map((t) => {
      const [x, y] = latLngToXY(t.lat, t.lng);
      return {
        x: x * width,
        y: y * height,
        color: t.color,
        radius: Math.max(5, t.maxRadius * 6),
        pressure: t.pressure,
      };
    });
  }, [targetPressures, width, height]);

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden rounded-lg">
      {/* Dark map background */}
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="absolute inset-0"
        style={{ background: '#050d18' }}
      >
        {/* World map outline — simplified continents */}
        <WorldMapPath width={width} height={height} />

        {/* Target pressure rings (pulsing) */}
        {targetDots.map((t, i) => (
          <g key={`target-${i}`}>
            <circle
              cx={t.x} cy={t.y} r={t.radius}
              fill="none"
              stroke={t.color}
              strokeWidth="1"
              opacity="0.4"
            >
              <animate
                attributeName="r"
                values={`${t.radius};${t.radius * 2.5};${t.radius}`}
                dur={`${2 + (1 - t.pressure) * 2}s`}
                repeatCount="indefinite"
              />
              <animate
                attributeName="opacity"
                values="0.5;0.1;0.5"
                dur={`${2 + (1 - t.pressure) * 2}s`}
                repeatCount="indefinite"
              />
            </circle>
            <circle
              cx={t.x} cy={t.y} r="3"
              fill={t.color}
              opacity="0.7"
            />
          </g>
        ))}

        {/* Source hotspot glows */}
        {hotspotDots.map((h, i) => (
          <g key={`hotspot-${i}`}>
            <circle
              cx={h.x} cy={h.y} r={h.radius}
              fill={h.color}
              opacity={h.intensity * 0.3}
              filter="url(#glow)"
            />
            <circle
              cx={h.x} cy={h.y} r="3"
              fill={h.color}
              opacity="0.9"
            />
          </g>
        ))}

        {/* Attack arcs */}
        {arcPaths.map((a) => (
          <g key={a.id}>
            {/* Glow trail */}
            <path
              d={a.path}
              fill="none"
              stroke={a.color}
              strokeWidth={a.severity === 'critical' ? 3 : a.severity === 'high' ? 2.5 : 1.5}
              opacity={a.opacity * 0.4}
              strokeLinecap="round"
              filter="url(#glow)"
            />
            {/* Main arc */}
            <path
              d={a.path}
              fill="none"
              stroke={a.color}
              strokeWidth={a.severity === 'critical' ? 2 : a.severity === 'high' ? 1.5 : 1}
              opacity={a.opacity}
              strokeLinecap="round"
              strokeDasharray="8 4"
            >
              <animate
                attributeName="stroke-dashoffset"
                values="0;-24"
                dur="1.5s"
                repeatCount="indefinite"
              />
            </path>
            {/* Source dot */}
            <circle
              cx={a.x1} cy={a.y1} r="3"
              fill={a.color}
              opacity={a.opacity}
            />
            {/* Target dot */}
            <circle
              cx={a.x2} cy={a.y2} r="2.5"
              fill={a.color}
              opacity={a.opacity * 0.7}
            />
          </g>
        ))}

        {/* SVG filters */}
        <defs>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
      </svg>

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

// ═══════════════════════════════════════════════════════════════════════════════
// WORLD MAP SVG PATH — Simplified continent outlines
// ═══════════════════════════════════════════════════════════════════════════════

function WorldMapPath({ width, height }: { width: number; height: number }) {
  // Use a simplified world map with country boundaries
  // This renders a dotted grid pattern for the landmasses (like Checkpoint)
  const dots = useMemo(() => {
    // Major landmass approximate boundaries (lat/lng pairs defining rough continent shapes)
    const landPoints: Array<[number, number]> = [];
    
    // Generate a grid of points and check if they're roughly on land
    const step = 4; // degrees between dots
    for (let lat = -60; lat <= 72; lat += step) {
      for (let lng = -180; lng <= 180; lng += step) {
        if (isLand(lat, lng)) {
          landPoints.push([lat, lng]);
        }
      }
    }
    
    return landPoints.map(([lat, lng]) => {
      const [x, y] = latLngToXY(lat, lng);
      return { x: x * width, y: y * height };
    });
  }, [width, height]);

  // Also generate grid lines for latitude/longitude
  const gridLines = useMemo(() => {
    const lines: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
    // Latitude lines
    for (let lat = -60; lat <= 80; lat += 30) {
      const [, y] = latLngToXY(lat, 0);
      lines.push({ x1: 0, y1: y * height, x2: width, y2: y * height });
    }
    // Longitude lines
    for (let lng = -180; lng <= 180; lng += 40) {
      const [x] = latLngToXY(0, lng);
      lines.push({ x1: x * width, y1: 0, x2: x * width, y2: height });
    }
    return lines;
  }, [width, height]);

  return (
    <g>
      {/* Grid lines */}
      {gridLines.map((line, i) => (
        <line
          key={`grid-${i}`}
          x1={line.x1} y1={line.y1}
          x2={line.x2} y2={line.y2}
          stroke="rgba(60, 100, 140, 0.12)"
          strokeWidth="0.5"
        />
      ))}
      {/* Land dots */}
      {dots.map((dot, i) => (
        <circle
          key={i}
          cx={dot.x}
          cy={dot.y}
          r="1.8"
          fill="rgba(100, 160, 200, 0.4)"
        />
      ))}
    </g>
  );
}

// Simple land detection (rough approximation for visual purposes)
function isLand(lat: number, lng: number): boolean {
  // North America
  if (lat >= 25 && lat <= 72 && lng >= -170 && lng <= -50) {
    if (lat >= 48 && lng <= -130) return true; // Alaska/Canada west
    if (lat >= 25 && lat <= 50 && lng >= -130 && lng <= -65) return true; // US/Canada
    if (lat >= 50 && lng >= -140 && lng <= -55) return true; // Northern Canada
    return false;
  }
  // Central America & Caribbean
  if (lat >= 7 && lat <= 25 && lng >= -120 && lng <= -60) return true;
  // South America
  if (lat >= -56 && lat <= 12 && lng >= -82 && lng <= -34) {
    if (lng >= -82 && lng <= -34 && lat >= -56) return true;
  }
  // Europe
  if (lat >= 35 && lat <= 72 && lng >= -12 && lng <= 40) return true;
  // Africa
  if (lat >= -35 && lat <= 37 && lng >= -18 && lng <= 52) {
    if (lat >= 20 && lng >= 30 && lng <= 52) return true; // NE Africa
    if (lat >= -35 && lat <= 20 && lng >= -18 && lng <= 52) return true;
    if (lat >= 20 && lng >= -18 && lng <= 30) return true; // NW Africa
    return false;
  }
  // Middle East
  if (lat >= 12 && lat <= 42 && lng >= 25 && lng <= 65) return true;
  // Russia / Central Asia
  if (lat >= 40 && lat <= 72 && lng >= 40 && lng <= 180) return true;
  // South Asia
  if (lat >= 5 && lat <= 40 && lng >= 65 && lng <= 100) return true;
  // East Asia
  if (lat >= 18 && lat <= 55 && lng >= 100 && lng <= 145) return true;
  // Southeast Asia
  if (lat >= -10 && lat <= 20 && lng >= 95 && lng <= 140) return true;
  // Australia
  if (lat >= -45 && lat <= -10 && lng >= 110 && lng <= 155) return true;
  // Japan / Korea
  if (lat >= 30 && lat <= 46 && lng >= 125 && lng <= 146) return true;
  
  return false;
}
