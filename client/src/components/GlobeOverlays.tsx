/**
 * GlobeOverlays — Lightweight CSS/SVG overlays on top of the globe
 * 
 * These are purely DOM-based (no WebGL objects) to avoid GPU overload:
 * 1. Day/Night Terminator — gradient shadow showing Earth's shadow boundary
 * 2. Orbital Ring — SVG ellipse with animated sensor dots
 * 3. Comet Tails — fading trail markers for recent critical attacks
 * 
 * All positioned absolutely over the globe container.
 */
import { useMemo } from 'react';
import { useThreatData } from '@/contexts/ThreatContext';

export default function GlobeOverlays() {
  const { activeArcs, stats } = useThreatData();

  // Calculate terminator position based on current time (UTC hour → rotation angle)
  const terminatorAngle = useMemo(() => {
    const hour = new Date().getUTCHours();
    return ((hour - 12) / 24) * 360;
  }, []);

  // Derive intensity for visual effects
  const intensity = Math.min(1, (stats.critical + stats.high * 0.5) / 20);

  // Recent critical attack positions for comet tails (max 5)
  const cometPositions = useMemo(() => {
    return activeArcs
      .filter(a => a.severity === 'critical' || a.severity === 'high')
      .slice(0, 5)
      .map(a => ({
        x: ((a.endLng + 180) / 360) * 100,
        y: ((90 - a.endLat) / 180) * 100,
        severity: a.severity,
        id: a.id,
      }));
  }, [activeArcs]);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-lg">
      {/* Day/Night Terminator — subtle gradient shadow */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          background: `linear-gradient(${terminatorAngle}deg, transparent 40%, rgba(0,0,0,0.6) 60%, rgba(0,0,0,0.8) 75%)`,
          borderRadius: '50%',
          margin: '10%',
        }}
      />

      {/* Orbital Ring — SVG ellipse with sensor dots */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Orbital path */}
        <ellipse
          cx="50"
          cy="50"
          rx="42"
          ry="16"
          fill="none"
          stroke="rgba(221, 85, 12, 0.15)"
          strokeWidth="0.2"
          strokeDasharray="2 1"
          transform="rotate(-15 50 50)"
        >
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="-15 50 50"
            to="345 50 50"
            dur="120s"
            repeatCount="indefinite"
          />
        </ellipse>

        {/* Sensor nodes on the orbital ring */}
        {[0, 60, 120, 180, 240, 300].map((angle) => {
          const rad = (angle - 15) * (Math.PI / 180);
          const x = 50 + 42 * Math.cos(rad);
          const y = 50 + 16 * Math.sin(rad);
          return (
            <circle
              key={angle}
              cx={x}
              cy={y}
              r="0.6"
              fill={`rgba(221, 85, 12, ${0.3 + intensity * 0.4})`}
            >
              <animate
                attributeName="opacity"
                values="0.3;0.8;0.3"
                dur={`${3 + angle * 0.01}s`}
                repeatCount="indefinite"
              />
            </circle>
          );
        })}
      </svg>

      {/* Comet Tails — fading markers at critical impact sites */}
      {cometPositions.map((comet) => (
        <div
          key={comet.id}
          className="absolute w-3 h-3"
          style={{
            left: `${comet.x}%`,
            top: `${comet.y}%`,
            transform: 'translate(-50%, -50%)',
          }}
        >
          <div
            className="absolute inset-0 rounded-full animate-ping"
            style={{
              backgroundColor: comet.severity === 'critical'
                ? 'rgba(220, 50, 30, 0.3)'
                : 'rgba(221, 85, 12, 0.25)',
              animationDuration: '2s',
            }}
          />
          <div
            className="absolute inset-[25%] rounded-full"
            style={{
              backgroundColor: comet.severity === 'critical'
                ? 'rgba(220, 50, 30, 0.6)'
                : 'rgba(221, 85, 12, 0.5)',
            }}
          />
        </div>
      ))}
    </div>
  );
}
