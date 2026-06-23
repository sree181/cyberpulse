/**
 * GeoSourceChart — Top attack source countries/regions
 * Auburn branded: severity colors for ranking
 */
import { useMemo } from 'react';
import { useThreatData } from '@/contexts/ThreatContext';

const COUNTRY_NAMES: Record<string, string> = {
  CN: 'China', RU: 'Russia', US: 'United States', BR: 'Brazil',
  IN: 'India', KR: 'South Korea', IR: 'Iran', NG: 'Nigeria',
  DE: 'Germany', NL: 'Netherlands', UA: 'Ukraine', RO: 'Romania',
  VN: 'Vietnam', ID: 'Indonesia', PK: 'Pakistan', TH: 'Thailand',
  MX: 'Mexico', AR: 'Argentina', ZA: 'South Africa', GB: 'United Kingdom',
  FR: 'France', JP: 'Japan', AU: 'Australia', KP: 'North Korea',
};

export default function GeoSourceChart() {
  const { threats } = useThreatData();

  const countryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    threats.forEach(t => {
      counts[t.sourceCountry] = (counts[t.sourceCountry] || 0) + 1;
    });
    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 6);
  }, [threats]);

  const maxCount = countryCounts[0]?.[1] || 1;

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-1.5 border-b border-[var(--color-cp-border)] shrink-0">
        <div className="font-data text-[10px] tracking-[0.2em] uppercase text-[var(--color-cp-text-tertiary)]">
          Top Sources
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {countryCounts.map(([code, count], i) => {
          const pct = (count / maxCount) * 100;
          // Auburn severity palette: critical red for top, orange for mid, muted for lower
          const color = i < 2 ? '#C81E1E' : i < 4 ? '#DD550C' : '#EE7624';
          
          return (
            <div key={code}>
              <div className="flex items-center justify-between mb-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="font-data text-[9px] font-bold" style={{ color }}>
                    {code}
                  </span>
                  <span className="font-data text-[7px] text-[var(--color-cp-text-tertiary)] truncate">
                    {COUNTRY_NAMES[code] || code}
                  </span>
                </div>
                <span className="font-data text-[8px] tabular-nums font-bold" style={{ color }}>
                  {count}
                </span>
              </div>
              <div className="h-[3px] bg-[var(--color-cp-base)] overflow-hidden rounded-full">
                <div 
                  className="h-full transition-all duration-700 ease-out rounded-full"
                  style={{ 
                    width: `${pct}%`, 
                    backgroundColor: color,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
