/**
 * StatsPanel — Real-time threat statistics with animated counters
 * ENHANCED: Glowing counters, animated severity bars, pulsing critical alerts
 */
import { useThreatData } from '@/contexts/ThreatContext';
import { SEVERITY_COLORS } from '@/lib/threatEngine';
import { useState, useEffect, useRef } from 'react';

function AnimatedNumber({ value, color }: { value: number; color: string }) {
  const [display, setDisplay] = useState(0);
  const prevRef = useRef(0);

  useEffect(() => {
    const start = prevRef.current;
    const diff = value - start;
    if (diff === 0) return;
    const duration = 800;
    const startTime = Date.now();
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(start + diff * eased));
      if (progress < 1) requestAnimationFrame(animate);
      else prevRef.current = value;
    };
    requestAnimationFrame(animate);
  }, [value]);

  return (
    <span 
      className="font-data font-bold tabular-nums text-xl leading-none"
      style={{ color, textShadow: `0 0 8px ${color}44` }}
    >
      {display.toLocaleString()}
    </span>
  );
}

interface StatCardProps {
  label: string;
  value: string | number;
  color: string;
  subLabel?: string;
  pulse?: boolean;
}

function StatCard({ label, value, color, subLabel, pulse }: StatCardProps) {
  return (
    <div 
      className="border border-[#00F0FF]/8 bg-[#0a0a1a]/50 px-2.5 py-1.5 relative overflow-hidden group"
      style={{ borderLeftColor: `${color}66`, borderLeftWidth: '2px' }}
    >
      {/* Subtle background glow */}
      <div 
        className="absolute inset-0 opacity-[0.03]"
        style={{ background: `radial-gradient(ellipse at left, ${color}, transparent 70%)` }}
      />
      <div className="font-data text-[7px] tracking-[0.2em] uppercase text-[#8899aa]/50 mb-0.5 relative">
        {label}
      </div>
      <div className="relative">
        {typeof value === 'number' ? (
          <AnimatedNumber value={value} color={color} />
        ) : (
          <span 
            className="font-data font-bold tabular-nums text-xl leading-none"
            style={{ color, textShadow: `0 0 8px ${color}44` }}
          >
            {value}
          </span>
        )}
      </div>
      {subLabel && (
        <div className="font-data text-[7px] text-[#8899aa]/30 mt-0.5 relative">
          {subLabel}
        </div>
      )}
      {pulse && (
        <div 
          className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full animate-pulse"
          style={{ backgroundColor: color }}
        />
      )}
    </div>
  );
}

function SeverityBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="font-data text-[7px] tracking-wider uppercase w-12 text-right" style={{ color: `${color}88` }}>
        {label}
      </div>
      <div className="flex-1 h-[4px] bg-[#0a0a1a] overflow-hidden rounded-full">
        <div 
          className="h-full transition-all duration-1000 ease-out rounded-full"
          style={{ 
            width: `${pct}%`, 
            backgroundColor: color,
            boxShadow: `0 0 6px ${color}66, 0 0 2px ${color}`,
          }}
        />
      </div>
      <div className="font-data text-[8px] w-8 text-right tabular-nums" style={{ color }}>
        {count}
      </div>
    </div>
  );
}

export default function StatsPanel() {
  const { stats } = useThreatData();

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-3 py-2 border-b border-[#00F0FF]/10 shrink-0 relative">
        <div className="font-data text-[10px] tracking-[0.2em] uppercase text-[#00F0FF]/60">
          Threat Analytics
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-[#00F0FF]/20 via-[#00F0FF]/5 to-transparent" />
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {/* Primary counters */}
        <div className="grid grid-cols-2 gap-1">
          <StatCard label="Total Threats" value={stats.total} color="#00F0FF" />
          <StatCard label="Attacks / Min" value={stats.attacksPerMinute} color="#FF6600" pulse />
        </div>

        {/* Severity breakdown */}
        <div className="border border-[#00F0FF]/8 bg-[#0a0a1a]/50 p-2 space-y-2">
          <div className="font-data text-[7px] tracking-[0.2em] uppercase text-[#8899aa]/50 mb-1">
            Severity Distribution
          </div>
          <SeverityBar label="Critical" count={stats.critical} total={stats.total} color={SEVERITY_COLORS.critical} />
          <SeverityBar label="High" count={stats.high} total={stats.total} color={SEVERITY_COLORS.high} />
          <SeverityBar label="Medium" count={stats.medium} total={stats.total} color={SEVERITY_COLORS.medium} />
          <SeverityBar label="Low" count={stats.low} total={stats.total} color={SEVERITY_COLORS.low} />
        </div>

        {/* Secondary stats */}
        <div className="grid grid-cols-2 gap-1">
          <StatCard label="Top Source" value={stats.topCountry} color="#FFD700" subLabel="Country" />
          <StatCard label="Top Vector" value={stats.topAttackType.split(' ')[0]} color="#FF1493" subLabel="Attack type" />
        </div>

        {/* Blocked rate */}
        <div className="border border-[#00F0FF]/8 bg-[#0a0a1a]/50 px-2.5 py-2 relative overflow-hidden">
          <div className="font-data text-[7px] tracking-[0.2em] uppercase text-[#8899aa]/50 mb-1">
            Threat Mitigation Rate
          </div>
          <div className="flex items-end gap-2">
            <span 
              className="font-data font-bold text-2xl tabular-nums leading-none text-[#00FF88]"
              style={{ textShadow: '0 0 10px rgba(0,255,136,0.3)' }}
            >
              {stats.blockedPercent.toFixed(1)}%
            </span>
            <span className="font-data text-[8px] text-[#00FF88]/40 mb-0.5">blocked</span>
          </div>
          {/* Progress bar */}
          <div className="mt-1.5 h-[3px] bg-[#0a0a1a] overflow-hidden rounded-full">
            <div 
              className="h-full rounded-full transition-all duration-2000"
              style={{ 
                width: `${stats.blockedPercent}%`,
                background: 'linear-gradient(90deg, #00FF88, #00F0FF)',
                boxShadow: '0 0 6px rgba(0,255,136,0.4)',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
