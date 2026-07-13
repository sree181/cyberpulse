/**
 * ThreatFlatMap — 2D Flat World Map with Attack Arcs
 * 
 * Uses Natural Earth 110m country outlines (via world-atlas/topojson)
 * rendered as filled SVG polygons with a dark theme.
 * Attack arcs are drawn on top as animated SVG curves.
 * 
 * Inspired by Kaspersky CyberMap / Checkpoint ThreatMap.
 */
import { useMemo, useEffect, useRef, useState } from 'react';
import { useThreatData, type ArcData } from '@/contexts/ThreatContext';
import { BRANDING } from '@/lib/branding';
import * as topojson from 'topojson-client';
import worldData from 'world-atlas/countries-110m.json';

// Convert TopoJSON to GeoJSON features once at module level
const worldGeo = topojson.feature(
  worldData as any,
  (worldData as any).objects.countries
) as any;

// Mercator projection: lat/lng → x/y (0-1 range)
function latLngToXY(lat: number, lng: number): [number, number] {
  const x = (lng + 180) / 360;
  const latRad = (Math.max(-85, Math.min(85, lat)) * Math.PI) / 180;
  const mercN = Math.log(Math.tan(Math.PI / 4 + latRad / 2));
  const y = 0.5 - mercN / (2 * Math.PI);
  return [x, y];
}

// Convert GeoJSON coordinates to SVG path string using Mercator projection
function geoToSvgPath(geometry: any, width: number, height: number): string {
  const paths: string[] = [];
  
  const projectRing = (ring: number[][]) => {
    return ring.map(([lng, lat]) => {
      const [x, y] = latLngToXY(lat, lng);
      return `${x * width},${y * height}`;
    });
  };

  if (geometry.type === 'Polygon') {
    for (const ring of geometry.coordinates) {
      const points = projectRing(ring);
      if (points.length > 0) {
        paths.push(`M${points[0]} L${points.slice(1).join(' L')} Z`);
      }
    }
  } else if (geometry.type === 'MultiPolygon') {
    for (const polygon of geometry.coordinates) {
      for (const ring of polygon) {
        const points = projectRing(ring);
        if (points.length > 0) {
          paths.push(`M${points[0]} L${points.slice(1).join(' L')} Z`);
        }
      }
    }
  }
  
  return paths.join(' ');
}

// Generate a quadratic bezier arc control point
function getArcControlPoint(x1: number, y1: number, x2: number, y2: number, height: number): [number, number] {
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const arcHeight = Math.min(dist * 0.3, height * 0.15);
  const perpX = -dy / dist;
  const perpY = dx / dist;
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

  // Pre-compute country SVG paths
  const countryPaths = useMemo(() => {
    return worldGeo.features.map((feature: any) => ({
      id: feature.id || feature.properties?.name || Math.random().toString(),
      name: feature.properties?.name || '',
      path: geoToSvgPath(feature.geometry, width, height),
    }));
  }, [width, height]);

  // Convert arcs to SVG paths
  const arcPaths = useMemo(() => {
    return activeArcs.map((arc) => {
      let [x1, y1] = latLngToXY(arc.startLat, arc.startLng);
      let [x2, y2] = latLngToXY(arc.endLat, arc.endLng);

      x1 *= width;
      y1 *= height;
      x2 *= width;
      y2 *= height;

      // Skip arcs that cross the date line
      const wrapDist = Math.abs(arc.startLng - arc.endLng);
      if (wrapDist > 180) return null;

      const [cpx, cpy] = getArcControlPoint(x1, y1, x2, y2, height);

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
        style={{ background: '#040a12' }}
      >
        {/* Graticule (grid lines) */}
        <g opacity="0.15">
          {/* Latitude lines */}
          {[-60, -30, 0, 30, 60].map(lat => {
            const [, y] = latLngToXY(lat, 0);
            return (
              <line
                key={`lat-${lat}`}
                x1={0} y1={y * height}
                x2={width} y2={y * height}
                stroke="#3a6080"
                strokeWidth="0.5"
                strokeDasharray="4 6"
              />
            );
          })}
          {/* Longitude lines */}
          {[-150, -120, -90, -60, -30, 0, 30, 60, 90, 120, 150].map(lng => {
            const [x] = latLngToXY(0, lng);
            return (
              <line
                key={`lng-${lng}`}
                x1={x * width} y1={0}
                x2={x * width} y2={height}
                stroke="#3a6080"
                strokeWidth="0.5"
                strokeDasharray="4 6"
              />
            );
          })}
        </g>

        {/* Country shapes — filled polygons */}
        <g>
          {countryPaths.map((country: { id: string; name: string; path: string }) => (
            <path
              key={country.id}
              d={country.path}
              fill="#0f2035"
              stroke="#1a3a55"
              strokeWidth="0.5"
              opacity="0.9"
            />
          ))}
        </g>

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
              filter="url(#mapGlow)"
            />
            <circle
              cx={h.x} cy={h.y} r="3.5"
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
              strokeWidth={a.severity === 'critical' ? 3.5 : a.severity === 'high' ? 2.5 : 1.5}
              opacity={a.opacity * 0.35}
              strokeLinecap="round"
              filter="url(#mapGlow)"
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
              cx={a.x1} cy={a.y1} r="3.5"
              fill={a.color}
              opacity={a.opacity}
            >
              <animate
                attributeName="r"
                values="3.5;5;3.5"
                dur="2s"
                repeatCount="indefinite"
              />
            </circle>
            {/* Target dot */}
            <circle
              cx={a.x2} cy={a.y2} r="3"
              fill={a.color}
              opacity={a.opacity * 0.8}
            />
          </g>
        ))}

        {/* SVG filters */}
        <defs>
          <filter id="mapGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
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
