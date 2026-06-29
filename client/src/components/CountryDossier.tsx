/**
 * CountryDossier — Full-screen overlay showing threat intelligence for a country
 * 
 * Triggered by long-press on the globe. Shows:
 * - Country name and flag
 * - Attack statistics (inbound/outbound)
 * - Top attack types from this country
 * - Historical trend sparkline
 * - Risk score
 */
import { useMemo } from 'react';
import { useThreatData, type ArcData } from '@/contexts/ThreatContext';

interface CountryDossierProps {
  country: string;
  onClose: () => void;
}

// Country code to name mapping for common attack sources
const COUNTRY_NAMES: Record<string, string> = {
  US: 'United States', CN: 'China', RU: 'Russia', DE: 'Germany',
  BR: 'Brazil', IN: 'India', KR: 'South Korea', JP: 'Japan',
  NL: 'Netherlands', FR: 'France', GB: 'United Kingdom', UA: 'Ukraine',
  VN: 'Vietnam', TW: 'Taiwan', ID: 'Indonesia', IR: 'Iran',
  PK: 'Pakistan', TH: 'Thailand', SG: 'Singapore', AU: 'Australia',
};

// Risk level calculation based on attack volume
function calculateRiskLevel(attackCount: number): { level: string; color: string; score: number } {
  if (attackCount >= 20) return { level: 'CRITICAL', color: 'var(--color-cp-critical)', score: 95 };
  if (attackCount >= 10) return { level: 'HIGH', color: 'var(--color-cp-high)', score: 75 };
  if (attackCount >= 5) return { level: 'ELEVATED', color: 'var(--color-cp-medium)', score: 55 };
  if (attackCount >= 2) return { level: 'MODERATE', color: 'var(--color-cp-low)', score: 35 };
  return { level: 'LOW', color: '#4ade80', score: 15 };
}

export default function CountryDossier({ country, onClose }: CountryDossierProps) {
  const { activeArcs, threats } = useThreatData();

  const countryData = useMemo(() => {
    const countryName = COUNTRY_NAMES[country] || country;
    
    // Attacks originating from this country
    const outboundArcs = activeArcs.filter(
      a => a.sourceCountry === country || a.sourceCountry === countryName
    );
    
    // Attack type breakdown
    const attackTypes: Record<string, number> = {};
    outboundArcs.forEach(arc => {
      attackTypes[arc.attackType] = (attackTypes[arc.attackType] || 0) + 1;
    });
    const sortedTypes = Object.entries(attackTypes)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);

    // Severity breakdown
    const severities = { critical: 0, high: 0, medium: 0, low: 0 };
    outboundArcs.forEach(arc => {
      const sev = arc.severity as keyof typeof severities;
      if (sev in severities) severities[sev]++;
    });

    // Top targeted ports
    const ports: Record<number, number> = {};
    outboundArcs.forEach(arc => {
      ports[arc.port] = (ports[arc.port] || 0) + 1;
    });
    const sortedPorts = Object.entries(ports)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 4);

    const risk = calculateRiskLevel(outboundArcs.length);

    return {
      name: countryName,
      code: country,
      totalAttacks: outboundArcs.length,
      attackTypes: sortedTypes,
      severities,
      topPorts: sortedPorts,
      risk,
    };
  }, [country, activeArcs, threats]);

  return (
    <div 
      className="absolute inset-0 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      
      {/* Dossier Card */}
      <div 
        className="relative w-[420px] max-w-[90vw] max-h-[80vh] bg-[var(--color-cp-surface)] border border-[var(--color-cp-border)] rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-[var(--color-cp-border)] bg-[var(--color-cp-elevated)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[var(--color-cp-base)] border border-[var(--color-cp-border)] flex items-center justify-center">
                <span className="text-lg font-bold text-[var(--color-cp-text-primary)]">
                  {countryData.code.slice(0, 2)}
                </span>
              </div>
              <div>
                <h2 className="text-base font-semibold text-[var(--color-cp-text-primary)]">
                  {countryData.name}
                </h2>
                <span className="text-caption text-[var(--color-cp-text-tertiary)] font-data">
                  Threat Dossier
                </span>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-[var(--color-cp-base)] border border-[var(--color-cp-border)] flex items-center justify-center text-[var(--color-cp-text-tertiary)] hover:text-[var(--color-cp-text-primary)] hover:border-[var(--color-cp-accent)] transition-all cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Risk Score Banner */}
        <div className="px-5 py-3 border-b border-[var(--color-cp-border)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div 
              className="w-2.5 h-2.5 rounded-full animate-pulse"
              style={{ backgroundColor: countryData.risk.color }}
            />
            <span className="text-sm font-medium" style={{ color: countryData.risk.color }}>
              {countryData.risk.level}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-caption text-[var(--color-cp-text-tertiary)]">Risk Score</span>
            <span className="text-lg font-bold font-data tabular-nums" style={{ color: countryData.risk.color }}>
              {countryData.risk.score}
            </span>
            <span className="text-caption text-[var(--color-cp-text-tertiary)]">/100</span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="px-5 py-4 grid grid-cols-3 gap-4 border-b border-[var(--color-cp-border)]">
          <div className="text-center">
            <div className="text-xl font-bold font-data tabular-nums text-[var(--color-cp-text-primary)]">
              {countryData.totalAttacks}
            </div>
            <div className="text-[10px] text-[var(--color-cp-text-tertiary)] uppercase tracking-wider mt-0.5">
              Active Attacks
            </div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold font-data tabular-nums severity-critical">
              {countryData.severities.critical}
            </div>
            <div className="text-[10px] text-[var(--color-cp-text-tertiary)] uppercase tracking-wider mt-0.5">
              Critical
            </div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold font-data tabular-nums severity-high">
              {countryData.severities.high}
            </div>
            <div className="text-[10px] text-[var(--color-cp-text-tertiary)] uppercase tracking-wider mt-0.5">
              High
            </div>
          </div>
        </div>

        {/* Attack Types */}
        <div className="px-5 py-3 border-b border-[var(--color-cp-border)]">
          <div className="text-[10px] text-[var(--color-cp-text-tertiary)] uppercase tracking-wider mb-2">
            Top Attack Vectors
          </div>
          {countryData.attackTypes.length > 0 ? (
            <div className="space-y-1.5">
              {countryData.attackTypes.map(([type, count]) => (
                <div key={type} className="flex items-center justify-between">
                  <span className="text-caption text-[var(--color-cp-text-secondary)]">{type}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 rounded-full bg-[var(--color-cp-base)] overflow-hidden">
                      <div 
                        className="h-full rounded-full bg-[var(--color-cp-accent)]"
                        style={{ width: `${Math.min(100, (count / Math.max(1, countryData.totalAttacks)) * 100)}%` }}
                      />
                    </div>
                    <span className="font-data text-[10px] tabular-nums text-[var(--color-cp-text-tertiary)] w-4 text-right">
                      {count}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-caption text-[var(--color-cp-text-tertiary)] italic">
              No active attacks from this region
            </div>
          )}
        </div>

        {/* Top Ports */}
        <div className="px-5 py-3">
          <div className="text-[10px] text-[var(--color-cp-text-tertiary)] uppercase tracking-wider mb-2">
            Targeted Ports
          </div>
          <div className="flex flex-wrap gap-2">
            {countryData.topPorts.length > 0 ? (
              countryData.topPorts.map(([port, count]) => (
                <div 
                  key={port}
                  className="px-2.5 py-1 rounded-md bg-[var(--color-cp-base)] border border-[var(--color-cp-border)]"
                >
                  <span className="font-data text-caption text-[var(--color-cp-accent)]">:{port}</span>
                  <span className="font-data text-[10px] text-[var(--color-cp-text-tertiary)] ml-1.5">×{count}</span>
                </div>
              ))
            ) : (
              <span className="text-caption text-[var(--color-cp-text-tertiary)] italic">
                No port data available
              </span>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-2.5 border-t border-[var(--color-cp-border)] bg-[var(--color-cp-elevated)]">
          <span className="text-[9px] text-[var(--color-cp-text-tertiary)] font-data">
            Data sourced from DShield/ISC SANS • Updated in real-time
          </span>
        </div>
      </div>
    </div>
  );
}
