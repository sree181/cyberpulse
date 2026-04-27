/**
 * GeoSourceChart — Top attack source countries/regions
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
      <div className="px-3 py-1.5 border-b border-[#00F0FF]/10 shrink-0">
        <div className="font-data text-[10px] tracking-[0.2em] uppercase text-[#00F0FF]/60">
          Top Sources
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {countryCounts.map(([code, count], i) => {
          const pct = (count / maxCount) * 100;
          const color = i < 2 ? '#FF0040' : i < 4 ? '#FFA500' : '#00F0FF';
          
          return (
            <div key={code}>
              <div className="flex items-center justify-between mb-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="font-data text-[9px] font-bold" style={{ color }}>
                    {code}
                  </span>
                  <span className="font-data text-[7px] text-[#8899aa]/35 truncate">
                    {COUNTRY_NAMES[code] || code}
                  </span>
                </div>
                <span className="font-data text-[8px] tabular-nums font-bold" style={{ color }}>
                  {count}
                </span>
              </div>
              <div className="h-[3px] bg-[#0a0a1a] overflow-hidden">
                <div 
                  className="h-full transition-all duration-700 ease-out"
                  style={{ 
                    width: `${pct}%`, 
                    backgroundColor: color,
                    boxShadow: `0 0 4px ${color}33`,
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
