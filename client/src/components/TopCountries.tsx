/**
 * TopCountries — Shows top attack source and target countries
 * 
 * Inspired by Kaspersky CyberMap's country ranking panel.
 * Derives data from the threat context (all threats seen so far).
 * Displays two ranked lists: Sources (where attacks come from) and Targets (where they land).
 */
import { useMemo, useState } from 'react';
import { useThreatData } from '@/contexts/ThreatContext';

// Country code → full name mapping for display
const COUNTRY_NAMES: Record<string, string> = {
  CN: 'China',
  RU: 'Russia',
  BR: 'Brazil',
  IN: 'India',
  IR: 'Iran',
  KP: 'North Korea',
  NG: 'Nigeria',
  US: 'United States',
  DE: 'Germany',
  GB: 'United Kingdom',
  FR: 'France',
  NL: 'Netherlands',
  VN: 'Vietnam',
  PK: 'Pakistan',
  ID: 'Indonesia',
  UA: 'Ukraine',
  RO: 'Romania',
  KZ: 'Kazakhstan',
  TR: 'Turkey',
  TH: 'Thailand',
  PH: 'Philippines',
  CO: 'Colombia',
  AR: 'Argentina',
  MX: 'Mexico',
  EG: 'Egypt',
  KR: 'South Korea',
  JP: 'Japan',
  SG: 'Singapore',
  BY: 'Belarus',
  LK: 'Sri Lanka',
};

// Target name → country mapping
const TARGET_COUNTRIES: Record<string, { code: string; name: string }> = {
  'US-EAST HQ': { code: 'US', name: 'United States' },
  'US-WEST DC': { code: 'US', name: 'United States' },
  'EU-CENTRAL DC': { code: 'DE', name: 'Germany' },
  'UK OFFICE': { code: 'GB', name: 'United Kingdom' },
  'APAC DC': { code: 'SG', name: 'Singapore' },
  'INDIA OFFICE': { code: 'IN', name: 'India' },
};

type Tab = 'sources' | 'targets';

export default function TopCountries() {
  const { threats } = useThreatData();
  const [activeTab, setActiveTab] = useState<Tab>('sources');

  // Compute top source countries from all threats
  const sourceCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of threats) {
      const country = t.sourceCountry;
      if (country) {
        counts[country] = (counts[country] || 0) + 1;
      }
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([code, count]) => ({
        code,
        name: COUNTRY_NAMES[code] || code,
        count,
      }));
  }, [threats]);

  // Compute top target countries from all threats
  const targetCounts = useMemo(() => {
    const counts: Record<string, { code: string; name: string; count: number }> = {};
    for (const t of threats) {
      const targetName = t.targetName;
      const target = TARGET_COUNTRIES[targetName];
      if (target) {
        if (!counts[target.code]) {
          counts[target.code] = { code: target.code, name: target.name, count: 0 };
        }
        counts[target.code].count++;
      }
    }
    return Object.values(counts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [threats]);

  const activeData = activeTab === 'sources' ? sourceCounts : targetCounts;
  const maxCount = activeData.length > 0 ? activeData[0].count : 1;

  return (
    <div className="h-full flex flex-col p-2.5 gap-2">
      {/* Header with tabs */}
      <div className="flex items-center justify-between shrink-0">
        <h3 className="font-display text-[10px] uppercase tracking-wider text-[var(--color-cp-accent)] font-semibold">
          Top Countries
        </h3>
        <div className="flex items-center gap-0.5 bg-[var(--color-cp-surface)]/60 rounded p-0.5">
          <button
            onClick={() => setActiveTab('sources')}
            className={`px-2 py-0.5 rounded text-[8px] font-data font-medium transition-all cursor-pointer ${
              activeTab === 'sources'
                ? 'bg-[var(--color-cp-accent)]/15 text-[var(--color-cp-accent)]'
                : 'text-[var(--color-cp-text-tertiary)] hover:text-[var(--color-cp-text-secondary)]'
            }`}
          >
            Sources
          </button>
          <button
            onClick={() => setActiveTab('targets')}
            className={`px-2 py-0.5 rounded text-[8px] font-data font-medium transition-all cursor-pointer ${
              activeTab === 'targets'
                ? 'bg-[var(--color-cp-accent)]/15 text-[var(--color-cp-accent)]'
                : 'text-[var(--color-cp-text-tertiary)] hover:text-[var(--color-cp-text-secondary)]'
            }`}
          >
            Targets
          </button>
        </div>
      </div>

      {/* Ranked list */}
      <div className="flex-1 flex flex-col gap-1 overflow-y-auto min-h-0">
        {activeData.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <span className="text-[9px] font-data text-[var(--color-cp-text-tertiary)] opacity-50">
              Collecting data...
            </span>
          </div>
        ) : (
          activeData.map((item, index) => (
            <div key={item.code} className="flex items-center gap-2 group">
              {/* Rank number */}
              <span className={`font-data text-[9px] w-3 text-right shrink-0 ${
                index === 0 ? 'text-[var(--color-cp-critical)] font-bold' :
                index === 1 ? 'text-[var(--color-cp-high)] font-semibold' :
                index === 2 ? 'text-[var(--color-cp-medium)]' :
                'text-[var(--color-cp-text-tertiary)] opacity-60'
              }`}>
                {index + 1}
              </span>

              {/* Country code badge */}
              <span className={`font-data text-[8px] font-bold w-5 shrink-0 ${
                index === 0 ? 'text-[var(--color-cp-critical)]' :
                index === 1 ? 'text-[var(--color-cp-high)]' :
                'text-[var(--color-cp-text-secondary)]'
              }`}>
                {item.code}
              </span>

              {/* Bar + name */}
              <div className="flex-1 flex flex-col gap-0.5 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-data text-[8px] text-[var(--color-cp-text-secondary)] whitespace-nowrap">
                    {item.name}
                  </span>
                  <span className="font-data text-[8px] text-[var(--color-cp-text-tertiary)] tabular-nums shrink-0 ml-1">
                    {item.count}
                  </span>
                </div>
                {/* Progress bar */}
                <div className="h-[3px] w-full bg-white/[0.04] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      index === 0 ? 'bg-[var(--color-cp-critical)]' :
                      index === 1 ? 'bg-[var(--color-cp-high)]' :
                      index === 2 ? 'bg-[var(--color-cp-medium)]' :
                      'bg-[var(--color-cp-accent)]/50'
                    }`}
                    style={{ width: `${(item.count / maxCount) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="shrink-0 pt-1 border-t border-white/[0.04]">
        <span className="font-data text-[8px] text-[var(--color-cp-text-tertiary)] opacity-50">
          {activeTab === 'sources' ? 'Attack origins' : 'Attack destinations'} · {threats.length} total events
        </span>
      </div>
    </div>
  );
}
