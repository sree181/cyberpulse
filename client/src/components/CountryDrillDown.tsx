/**
 * CountryDrillDown — Modal overlay showing detailed attack intelligence for a country.
 * 
 * Triggered by tapping a country in Top Sources or Top Targets.
 * Shows: attack count, top IPs, attack type breakdown, MITRE tactics, timeline.
 * Auto-dismisses after 20 seconds. Touch-friendly close at bottom.
 */
import { useMemo, useEffect, useState, useCallback } from 'react';
import { useThreatData } from '@/contexts/ThreatContext';
import type { ThreatEvent } from '@/lib/threatEngine';

interface CountryDrillDownProps {
  countryCode: string;
  countryName: string;
  mode: 'source' | 'target';
  onClose: () => void;
}

// Target name → country mapping (same as TopCountries)
const TARGET_COUNTRY_MAP: Record<string, string> = {
  'US-EAST HQ': 'US',
  'US-WEST DC': 'US',
  'EU-CENTRAL DC': 'DE',
  'UK OFFICE': 'GB',
  'APAC DC': 'SG',
  'INDIA OFFICE': 'IN',
};

export default function CountryDrillDown({ countryCode, countryName, mode, onClose }: CountryDrillDownProps) {
  const { threats } = useThreatData();
  const [countdown, setCountdown] = useState(20);

  // Auto-dismiss after 20s
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          onClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [onClose]);

  // Filter threats for this country
  const countryThreats = useMemo(() => {
    if (mode === 'source') {
      return threats.filter(t => t.sourceCountry === countryCode);
    } else {
      return threats.filter(t => {
        const targetCountry = TARGET_COUNTRY_MAP[t.targetName];
        return targetCountry === countryCode;
      });
    }
  }, [threats, countryCode, mode]);

  // Top IPs
  const topIPs = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of countryThreats) {
      counts[t.sourceIp] = (counts[t.sourceIp] || 0) + 1;
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([ip, count]) => ({ ip, count }));
  }, [countryThreats]);

  // Attack type breakdown
  const attackTypes = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of countryThreats) {
      counts[t.attackType] = (counts[t.attackType] || 0) + 1;
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([type, count]) => ({ type, count }));
  }, [countryThreats]);

  // MITRE tactics
  const mitreTactics = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of countryThreats) {
      if (t.mitreTactic) {
        counts[t.mitreTactic] = (counts[t.mitreTactic] || 0) + 1;
      }
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([tactic, count]) => ({ tactic, count }));
  }, [countryThreats]);

  // Severity breakdown
  const severityCounts = useMemo(() => {
    const counts = { critical: 0, high: 0, medium: 0, low: 0 };
    for (const t of countryThreats) {
      const s = t.severity as keyof typeof counts;
      if (s in counts) counts[s]++;
    }
    return counts;
  }, [countryThreats]);

  // Target breakdown (for source mode)
  const targetBreakdown = useMemo(() => {
    if (mode !== 'source') return [];
    const counts: Record<string, number> = {};
    for (const t of countryThreats) {
      counts[t.targetName] = (counts[t.targetName] || 0) + 1;
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([target, count]) => ({ target, count }));
  }, [countryThreats, mode]);

  const totalAttacks = countryThreats.length;
  const maxAttackType = attackTypes.length > 0 ? attackTypes[0].count : 1;
  const maxTactic = mitreTactics.length > 0 ? mitreTactics[0].count : 1;

  const handleBackdropClick = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (e.target === e.currentTarget) onClose();
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={handleBackdropClick}
      onTouchEnd={(e) => { if (e.target === e.currentTarget) { e.preventDefault(); onClose(); }}}
    >
      <div className="bg-[#0a1628]/95 border border-[var(--color-cp-border)] rounded-2xl shadow-2xl w-[clamp(400px,50vw,900px)] max-h-[80vh] overflow-y-auto p-[clamp(20px,2vw,40px)]">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className={`w-3 h-3 rounded-full ${mode === 'source' ? 'bg-[var(--color-cp-critical)]' : 'bg-cyan-400'} animate-pulse`} />
            <div>
              <h2 className="font-display text-[clamp(18px,1.5vw,32px)] text-white font-bold tracking-wide">
                {countryName}
              </h2>
              <span className="font-data text-[clamp(10px,0.7vw,16px)] text-[var(--color-cp-text-tertiary)] uppercase tracking-wider">
                {mode === 'source' ? 'Attack Source Intelligence' : 'Target Intelligence'} · {countryCode}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-data text-[clamp(10px,0.6vw,14px)] text-gray-500">
              Auto-close: {countdown}s
            </span>
          </div>
        </div>

        {/* Summary Stats Row */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          <StatCard label="Total Attacks" value={totalAttacks.toString()} color="text-white" />
          <StatCard label="Critical" value={severityCounts.critical.toString()} color="text-[var(--color-cp-critical)]" />
          <StatCard label="High" value={severityCounts.high.toString()} color="text-[var(--color-cp-high)]" />
          <StatCard label="Medium/Low" value={(severityCounts.medium + severityCounts.low).toString()} color="text-[var(--color-cp-medium)]" />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          {/* Left: Attack Types */}
          <div className="bg-[#0c1e38] rounded-lg p-4 border border-[#1a3a5c]">
            <h3 className="font-display text-[clamp(10px,0.7vw,14px)] text-[var(--color-cp-accent)] uppercase tracking-wider mb-3">
              Attack Types
            </h3>
            <div className="flex flex-col gap-2">
              {attackTypes.length === 0 ? (
                <span className="text-gray-500 text-sm">No data</span>
              ) : (
                attackTypes.map(({ type, count }) => (
                  <div key={type} className="flex items-center gap-2">
                    <span className="font-data text-[clamp(9px,0.6vw,13px)] text-[var(--color-cp-text-secondary)] w-[120px] shrink-0">
                      {type}
                    </span>
                    <div className="flex-1 h-[6px] bg-white/[0.05] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[var(--color-cp-critical)] rounded-full transition-all duration-500"
                        style={{ width: `${(count / maxAttackType) * 100}%` }}
                      />
                    </div>
                    <span className="font-data text-[clamp(9px,0.6vw,13px)] text-[var(--color-cp-text-tertiary)] tabular-nums w-8 text-right">
                      {count}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right: MITRE Tactics */}
          <div className="bg-[#0c1e38] rounded-lg p-4 border border-[#1a3a5c]">
            <h3 className="font-display text-[clamp(10px,0.7vw,14px)] text-[var(--color-cp-accent)] uppercase tracking-wider mb-3">
              MITRE ATT&CK Tactics
            </h3>
            <div className="flex flex-col gap-2">
              {mitreTactics.length === 0 ? (
                <span className="text-gray-500 text-sm">No data</span>
              ) : (
                mitreTactics.map(({ tactic, count }) => (
                  <div key={tactic} className="flex items-center gap-2">
                    <span className="font-data text-[clamp(9px,0.6vw,13px)] text-[var(--color-cp-text-secondary)] w-[120px] shrink-0">
                      {tactic}
                    </span>
                    <div className="flex-1 h-[6px] bg-white/[0.05] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-500 rounded-full transition-all duration-500"
                        style={{ width: `${(count / maxTactic) * 100}%` }}
                      />
                    </div>
                    <span className="font-data text-[clamp(9px,0.6vw,13px)] text-[var(--color-cp-text-tertiary)] tabular-nums w-8 text-right">
                      {count}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          {/* Top IPs */}
          <div className="bg-[#0c1e38] rounded-lg p-4 border border-[#1a3a5c]">
            <h3 className="font-display text-[clamp(10px,0.7vw,14px)] text-[var(--color-cp-accent)] uppercase tracking-wider mb-3">
              Top Source IPs
            </h3>
            <div className="flex flex-col gap-2">
              {topIPs.length === 0 ? (
                <span className="text-gray-500 text-sm">No data</span>
              ) : (
                topIPs.map(({ ip, count }, i) => (
                  <div key={ip} className="flex items-center justify-between">
                    <span className={`font-mono text-[clamp(9px,0.6vw,13px)] ${i === 0 ? 'text-[var(--color-cp-critical)]' : 'text-[var(--color-cp-text-secondary)]'}`}>
                      {ip}
                    </span>
                    <span className="font-data text-[clamp(9px,0.6vw,13px)] text-[var(--color-cp-text-tertiary)] tabular-nums">
                      {count} events
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Targets hit (source mode) or Sources attacking (target mode) */}
          <div className="bg-[#0c1e38] rounded-lg p-4 border border-[#1a3a5c]">
            <h3 className="font-display text-[clamp(10px,0.7vw,14px)] text-[var(--color-cp-accent)] uppercase tracking-wider mb-3">
              {mode === 'source' ? 'Targets Hit' : 'Attack Sources'}
            </h3>
            <div className="flex flex-col gap-2">
              {mode === 'source' ? (
                targetBreakdown.length === 0 ? (
                  <span className="text-gray-500 text-sm">No data</span>
                ) : (
                  targetBreakdown.map(({ target, count }) => (
                    <div key={target} className="flex items-center justify-between">
                      <span className="font-data text-[clamp(9px,0.6vw,13px)] text-[var(--color-cp-text-secondary)]">
                        {target}
                      </span>
                      <span className="font-data text-[clamp(9px,0.6vw,13px)] text-[var(--color-cp-text-tertiary)] tabular-nums">
                        {count} events
                      </span>
                    </div>
                  ))
                )
              ) : (
                topIPs.length === 0 ? (
                  <span className="text-gray-500 text-sm">No data</span>
                ) : (
                  <span className="font-data text-[clamp(9px,0.6vw,13px)] text-[var(--color-cp-text-secondary)]">
                    {topIPs.length} unique source IPs detected
                  </span>
                )
              )}
            </div>
          </div>
        </div>

        {/* Touch-friendly close button at bottom */}
        <div className="flex justify-center pt-4 border-t border-white/[0.06]">
          <button
            onClick={onClose}
            onTouchEnd={(e) => { e.preventDefault(); onClose(); }}
            className="px-8 py-4 min-h-[52px] bg-[#1a3a5c] hover:bg-[#2a4a6c] active:bg-[#3a5a7c] text-white font-display text-[clamp(12px,0.8vw,18px)] uppercase tracking-wider rounded-xl transition-colors cursor-pointer touch-manipulation"
          >
            Close Intelligence Report
          </button>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-[#0c1e38] rounded-lg p-3 border border-[#1a3a5c] text-center">
      <div className="font-data text-[clamp(8px,0.5vw,12px)] text-[var(--color-cp-text-tertiary)] uppercase tracking-wider mb-1">
        {label}
      </div>
      <div className={`font-data text-[clamp(16px,1.2vw,28px)] font-bold tabular-nums ${color}`}>
        {value}
      </div>
    </div>
  );
}
