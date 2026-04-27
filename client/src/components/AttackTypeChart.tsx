/**
 * AttackTypeChart — Horizontal bar chart showing attack type distribution
 */
import { useMemo } from 'react';
import { useThreatData } from '@/contexts/ThreatContext';
import { ATTACK_COLORS, type AttackType } from '@/lib/threatEngine';

export default function AttackTypeChart() {
  const { threats } = useThreatData();

  const attackCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    threats.forEach(t => {
      counts[t.attackType] = (counts[t.attackType] || 0) + 1;
    });
    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 7);
  }, [threats]);

  const maxCount = attackCounts[0]?.[1] || 1;

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-1.5 border-b border-[#00F0FF]/10 shrink-0">
        <div className="font-data text-[10px] tracking-[0.2em] uppercase text-[#00F0FF]/60">
          Attack Vectors
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {attackCounts.map(([type, count]) => {
          const color = ATTACK_COLORS[type as AttackType] || '#00F0FF';
          const pct = (count / maxCount) * 100;
          return (
            <div key={type}>
              <div className="flex items-center justify-between mb-0.5">
                <span className="font-data text-[7px] tracking-wider uppercase truncate" style={{ color: `${color}aa` }}>
                  {type}
                </span>
                <span className="font-data text-[8px] tabular-nums font-bold ml-1" style={{ color }}>
                  {count}
                </span>
              </div>
              <div className="h-[3px] bg-[#0a0a1a] overflow-hidden">
                <div 
                  className="h-full transition-all duration-700 ease-out"
                  style={{ 
                    width: `${pct}%`, 
                    backgroundColor: color,
                    boxShadow: `0 0 4px ${color}44`,
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
