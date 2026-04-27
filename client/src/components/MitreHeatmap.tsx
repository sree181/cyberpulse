/**
 * MitreHeatmap — Dynamic MITRE ATT&CK framework heatmap
 * ENHANCED: Glowing cells, animated bars, pulsing high-activity tactics
 */
import { useThreatData } from '@/contexts/ThreatContext';
import { MITRE_TACTICS } from '@/lib/threatEngine';

function getHeatColor(count: number, maxCount: number): string {
  if (count === 0) return 'rgba(0, 240, 255, 0.03)';
  const intensity = Math.min(count / Math.max(maxCount, 1), 1);
  if (intensity < 0.25) return 'rgba(0, 240, 255, 0.1)';
  if (intensity < 0.5) return 'rgba(0, 240, 255, 0.25)';
  if (intensity < 0.75) return 'rgba(255, 165, 0, 0.35)';
  return 'rgba(255, 0, 64, 0.5)';
}

function getBorderColor(count: number, maxCount: number): string {
  if (count === 0) return 'rgba(0, 240, 255, 0.06)';
  const intensity = Math.min(count / Math.max(maxCount, 1), 1);
  if (intensity < 0.25) return 'rgba(0, 240, 255, 0.2)';
  if (intensity < 0.5) return 'rgba(0, 240, 255, 0.5)';
  if (intensity < 0.75) return 'rgba(255, 165, 0, 0.7)';
  return 'rgba(255, 0, 64, 0.9)';
}

function getTextColor(count: number, maxCount: number): string {
  if (count === 0) return 'rgba(0, 240, 255, 0.2)';
  const intensity = Math.min(count / Math.max(maxCount, 1), 1);
  if (intensity < 0.5) return 'rgba(0, 240, 255, 0.8)';
  if (intensity < 0.75) return 'rgba(255, 165, 0, 0.95)';
  return 'rgba(255, 0, 64, 1)';
}

function getBarWidth(count: number, maxCount: number): number {
  if (count === 0) return 0;
  return Math.min((count / Math.max(maxCount, 1)) * 100, 100);
}

export default function MitreHeatmap() {
  const { tacticCounts } = useThreatData();
  const maxCount = Math.max(...Object.values(tacticCounts), 1);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#00F0FF]/10 shrink-0 relative">
        <div className="font-data text-[10px] tracking-[0.2em] uppercase text-[#00F0FF]/60">
          MITRE ATT&CK
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0.5">
            <div className="w-2 h-1.5 rounded-[1px]" style={{ backgroundColor: 'rgba(0, 240, 255, 0.12)' }} />
            <div className="w-2 h-1.5 rounded-[1px]" style={{ backgroundColor: 'rgba(0, 240, 255, 0.3)' }} />
            <div className="w-2 h-1.5 rounded-[1px]" style={{ backgroundColor: 'rgba(255, 165, 0, 0.45)' }} />
            <div className="w-2 h-1.5 rounded-[1px]" style={{ backgroundColor: 'rgba(255, 0, 64, 0.6)' }} />
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-[#00F0FF]/20 via-[#00F0FF]/5 to-transparent" />
      </div>

      {/* Compact tactic rows */}
      <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
        {MITRE_TACTICS.map(tactic => {
          const count = tacticCounts[tactic] || 0;
          const bgColor = getHeatColor(count, maxCount);
          const borderColor = getBorderColor(count, maxCount);
          const textColor = getTextColor(count, maxCount);
          const barWidth = getBarWidth(count, maxCount);
          const isHot = count > maxCount * 0.7;
          
          return (
            <div 
              key={tactic}
              className={`flex items-center gap-2 px-2 py-1.5 transition-all duration-700 relative overflow-hidden ${isHot ? 'animate-critical-flash' : ''}`}
              style={{ 
                backgroundColor: bgColor,
                borderLeft: `2px solid ${borderColor}`,
              }}
            >
              {/* Background bar indicator */}
              <div 
                className="absolute inset-y-0 left-0 transition-all duration-1000 ease-out"
                style={{
                  width: `${barWidth}%`,
                  background: `linear-gradient(90deg, ${borderColor}, transparent)`,
                  opacity: 0.15,
                }}
              />
              <div className="flex-1 font-data text-[8px] tracking-wider uppercase text-[#8899aa]/70 truncate relative">
                {tactic}
              </div>
              <div 
                className="font-data text-[11px] font-bold tabular-nums w-6 text-right relative"
                style={{ 
                  color: textColor,
                  textShadow: isHot ? `0 0 6px ${textColor}` : 'none',
                }}
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
