/**
 * MitreHeatmap — MITRE ATT&CK tactic activity
 * 
 * Redesign: Subtle horizontal bars, single accent color gradient.
 * No flashing, no multi-color heat. Just opacity-based intensity.
 * 
 * Text truncation fix: Use abbreviated tactic names that fit within
 * the panel width at all wall resolutions (8192x2160, 3840x2160).
 */
import { useThreatData } from '@/contexts/ThreatContext';
import { MITRE_TACTICS } from '@/lib/threatEngine';

/** Short labels that fit in narrow side panels without truncation */
const TACTIC_SHORT_LABELS: Record<string, string> = {
  'Reconnaissance': 'Recon',
  'Resource Development': 'Resource Dev',
  'Initial Access': 'Init Access',
  'Execution': 'Execution',
  'Persistence': 'Persistence',
  'Privilege Escalation': 'Priv Esc',
  'Defense Evasion': 'Def Evasion',
  'Credential Access': 'Cred Access',
  'Discovery': 'Discovery',
  'Lateral Movement': 'Lateral Mov',
  'Collection': 'Collection',
  'Command and Control': 'C2',
  'Exfiltration': 'Exfiltration',
  'Impact': 'Impact',
};

export default function MitreHeatmap() {
  const { tacticCounts } = useThreatData();
  const maxCount = Math.max(...Object.values(tacticCounts), 1);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="cp-panel-header">
        <span className="text-label text-[var(--color-cp-text-tertiary)]">MITRE ATT&CK</span>
      </div>

      {/* Tactic rows */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
        {MITRE_TACTICS.map(tactic => {
          const count = tacticCounts[tactic] || 0;
          const pct = Math.min((count / maxCount) * 100, 100);
          const opacity = count === 0 ? 0.05 : 0.15 + (pct / 100) * 0.6;
          const shortLabel = TACTIC_SHORT_LABELS[tactic] || tactic;
          
          return (
            <div key={tactic} className="flex items-center gap-2">
              <span className="text-caption text-[var(--color-cp-text-secondary)] w-[5.5rem] shrink-0 whitespace-nowrap overflow-visible">
                {shortLabel}
              </span>
              <div className="flex-1 h-[4px] bg-[var(--color-cp-base)] rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full transition-all duration-1000 ease-out"
                  style={{ 
                    width: `${Math.max(pct, count > 0 ? 4 : 0)}%`,
                    backgroundColor: `oklch(0.62 0.18 45 / ${opacity})`,
                  }}
                />
              </div>
              <span className="font-data text-caption text-[var(--color-cp-text-tertiary)] w-6 text-right tabular-nums shrink-0">
                {count || ''}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
