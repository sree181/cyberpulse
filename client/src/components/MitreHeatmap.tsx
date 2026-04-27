/**
 * MitreHeatmap — Dynamic MITRE ATT&CK framework heatmap
 * Compact vertical layout showing tactic activity levels.
 * Cells glow brighter as more attacks map to that tactic.
 */
import { useThreatData } from '@/contexts/ThreatContext';
import { MITRE_TACTICS } from '@/lib/threatEngine';

function getHeatColor(count: number, maxCount: number): string {
  if (count === 0) return 'rgba(0, 240, 255, 0.04)';
  const intensity = Math.min(count / Math.max(maxCount, 1), 1);
  if (intensity < 0.25) return 'rgba(0, 240, 255, 0.12)';
  if (intensity < 0.5) return 'rgba(0, 240, 255, 0.3)';
  if (intensity < 0.75) return 'rgba(255, 165, 0, 0.45)';
  return 'rgba(255, 0, 64, 0.6)';
}

function getBorderColor(count: number, maxCount: number): string {
  if (count === 0) return 'rgba(0, 240, 255, 0.06)';
  const intensity = Math.min(count / Math.max(maxCount, 1), 1);
  if (intensity < 0.25) return 'rgba(0, 240, 255, 0.2)';
  if (intensity < 0.5) return 'rgba(0, 240, 255, 0.4)';
  if (intensity < 0.75) return 'rgba(255, 165, 0, 0.6)';
  return 'rgba(255, 0, 64, 0.8)';
}

function getTextColor(count: number, maxCount: number): string {
  if (count === 0) return 'rgba(0, 240, 255, 0.2)';
  const intensity = Math.min(count / Math.max(maxCount, 1), 1);
  if (intensity < 0.5) return 'rgba(0, 240, 255, 0.8)';
  if (intensity < 0.75) return 'rgba(255, 165, 0, 0.9)';
  return 'rgba(255, 0, 64, 1)';
}

export default function MitreHeatmap() {
  const { tacticCounts } = useThreatData();
  const maxCount = Math.max(...Object.values(tacticCounts), 1);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#00F0FF]/10 shrink-0">
        <div className="font-data text-[10px] tracking-[0.2em] uppercase text-[#00F0FF]/60">
          MITRE ATT&CK
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0.5">
            <div className="w-2 h-1.5" style={{ backgroundColor: 'rgba(0, 240, 255, 0.12)' }} />
            <div className="w-2 h-1.5" style={{ backgroundColor: 'rgba(0, 240, 255, 0.3)' }} />
            <div className="w-2 h-1.5" style={{ backgroundColor: 'rgba(255, 165, 0, 0.45)' }} />
            <div className="w-2 h-1.5" style={{ backgroundColor: 'rgba(255, 0, 64, 0.6)' }} />
          </div>
        </div>
      </div>

      {/* Compact tactic rows */}
      <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
        {MITRE_TACTICS.map(tactic => {
          const count = tacticCounts[tactic] || 0;
          const bgColor = getHeatColor(count, maxCount);
          const borderColor = getBorderColor(count, maxCount);
          const textColor = getTextColor(count, maxCount);
          
          return (
            <div 
              key={tactic}
              className="flex items-center gap-2 px-2 py-1.5 transition-all duration-500"
              style={{ 
                backgroundColor: bgColor,
                borderLeft: `2px solid ${borderColor}`,
              }}
            >
              <div className="flex-1 font-data text-[8px] tracking-wider uppercase text-[#8899aa]/70 truncate">
                {tactic}
              </div>
              <div 
                className="font-data text-[11px] font-bold tabular-nums w-6 text-right"
                style={{ color: textColor }}
              >
                {count}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
