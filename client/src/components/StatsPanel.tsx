/**
 * StatsPanel — Compact threat analytics
 * 
 * Redesign: Clean cards, no glowing effects, consistent typography.
 * Only severity bars use color encoding. Everything else is neutral.
 */
import { useThreatData } from '@/contexts/ThreatContext';

function SeverityBar({ label, count, total, level }: { label: string; count: number; total: number; level: string }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="flex items-center gap-2">
      <span className="text-caption text-[var(--color-cp-text-tertiary)] w-14 text-right">{label}</span>
      <div className="flex-1 h-[3px] bg-[var(--color-cp-base)] rounded-full overflow-hidden">
        <div 
          className={`h-full rounded-full transition-all duration-1000 ease-out severity-dot-${level}`}
          style={{ width: `${Math.max(pct, 2)}%` }}
        />
      </div>
      <span className="font-data text-caption text-[var(--color-cp-text-secondary)] w-6 text-right tabular-nums">{count}</span>
    </div>
  );
}

export default function StatsPanel() {
  const { stats } = useThreatData();

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="cp-panel-header">
        <span className="text-label text-[var(--color-cp-text-tertiary)]">Analytics</span>
      </div>

      <div className="cp-panel-body flex-1 flex flex-col gap-4 overflow-y-auto">
        {/* Severity breakdown */}
        <div className="space-y-2">
          <span className="text-caption text-[var(--color-cp-text-tertiary)] uppercase tracking-wider">Severity</span>
          <div className="space-y-1.5">
            <SeverityBar label="Critical" count={stats.critical} total={stats.total} level="critical" />
            <SeverityBar label="High" count={stats.high} total={stats.total} level="high" />
            <SeverityBar label="Medium" count={stats.medium} total={stats.total} level="medium" />
            <SeverityBar label="Low" count={stats.low} total={stats.total} level="low" />
          </div>
        </div>

        {/* Key stats */}
        <div className="space-y-2">
          <span className="text-caption text-[var(--color-cp-text-tertiary)] uppercase tracking-wider">Summary</span>
          <div className="space-y-2">
            <div className="flex justify-between items-baseline">
              <span className="text-body text-[var(--color-cp-text-secondary)]">Top Source</span>
              <span className="font-data text-body text-[var(--color-cp-text-primary)]">{stats.topCountry}</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-body text-[var(--color-cp-text-secondary)]">Top Vector</span>
              <span className="font-data text-body text-[var(--color-cp-text-primary)]">{stats.topAttackType}</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-body text-[var(--color-cp-text-secondary)]">Blocked</span>
              <span className="font-data text-body text-[var(--color-cp-accent)]">{stats.blockedPercent.toFixed(1)}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
