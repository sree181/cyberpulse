/**
 * StatsPanel — Real-time threat statistics with animated counters
 * Displays total threats, severity breakdown, attacks/min, top country, etc.
 */
import { useThreatData } from '@/contexts/ThreatContext';
import { SEVERITY_COLORS } from '@/lib/threatEngine';

interface StatCardProps {
  label: string;
  value: string | number;
  color: string;
  subLabel?: string;
}

function StatCard({ label, value, color, subLabel }: StatCardProps) {
  return (
    <div 
      className="border border-[#00F0FF]/8 bg-[#0a0a1a]/50 px-2.5 py-1.5 relative overflow-hidden"
      style={{ borderLeftColor: `${color}66`, borderLeftWidth: '2px' }}
    >
      <div className="font-data text-[7px] tracking-[0.2em] uppercase text-[#8899aa]/50 mb-0.5">
        {label}
      </div>
      <div 
        className="font-data font-bold tabular-nums text-xl leading-none"
        style={{ color }}
      >
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
      {subLabel && (
        <div className="font-data text-[7px] text-[#8899aa]/30 mt-0.5">
          {subLabel}
        </div>
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
      <div className="flex-1 h-[3px] bg-[#0a0a1a] overflow-hidden">
        <div 
          className="h-full transition-all duration-1000 ease-out"
          style={{ 
            width: `${pct}%`, 
            backgroundColor: color,
            boxShadow: `0 0 4px ${color}44`,
          }}
        />
      </div>
      <div className="font-data text-[8px] w-5 text-right tabular-nums" style={{ color }}>
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
      <div className="px-3 py-2 border-b border-[#00F0FF]/10 shrink-0">
        <div className="font-data text-[10px] tracking-[0.2em] uppercase text-[#00F0FF]/60">
          Threat Analytics
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {/* Primary counters */}
        <div className="grid grid-cols-2 gap-1">
          <StatCard label="Total Threats" value={stats.total} color="#00F0FF" />
          <StatCard label="Attacks / Min" value={stats.attacksPerMinute} color="#FF6600" />
        </div>

        {/* Severity breakdown */}
        <div className="border border-[#00F0FF]/8 bg-[#0a0a1a]/50 p-2 space-y-1.5">
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
      </div>
    </div>
  );
}
