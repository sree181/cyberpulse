/**
 * PortHeatmap — Port & protocol activity
 * 
 * Redesign: Simple horizontal bars with consistent accent color.
 * Protocol shown as a subtle text label. No canvas animation — 
 * use clean React rendering for maintainability and consistency.
 *
 * Text truncation fix: Removed truncate class, widened label column
 * to fit service names (SSH, SMTP, IMAP, HTTPS, HTTP, FTP, SIP) fully.
 */
import { useThreatData } from '@/contexts/ThreatContext';

export default function PortHeatmap() {
  const { portActivity } = useThreatData();
  const maxRecords = Math.max(...portActivity.map(p => p.records), 1);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="cp-panel-header">
        <span className="text-label text-[var(--color-cp-text-tertiary)]">Port Activity</span>
        <span className="text-caption text-[var(--color-cp-text-tertiary)]">blocklist.de</span>
      </div>

      {/* Port rows */}
      <div className="cp-panel-body flex-1 overflow-y-auto space-y-1.5">
        {portActivity.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 gap-2">
            <div className="w-4 h-4 border border-[var(--color-cp-border)] border-t-[var(--color-cp-accent)] rounded-full animate-spin" />
            <span className="text-caption text-[var(--color-cp-text-tertiary)]">Connecting to threat feeds...</span>
          </div>
        ) : (
          portActivity.slice(0, 12).map((port, i) => {
            const pct = (port.records / maxRecords) * 100;
            const serviceName = port.service || `Port ${port.port}`;
            return (
              <div key={`${port.port}-${i}`} className="flex items-center gap-2">
                <span className="text-caption text-[var(--color-cp-text-secondary)] w-[4.5rem] shrink-0 whitespace-nowrap text-right font-data">
                  {serviceName}
                </span>
                <div className="flex-1 h-[5px] bg-[var(--color-cp-base)] rounded-full overflow-hidden relative">
                  <div 
                    className="h-full rounded-full transition-all duration-1000 ease-out"
                    style={{ 
                      width: `${Math.max(pct, 3)}%`,
                      backgroundColor: port.protocol === 'UDP' 
                        ? 'oklch(0.60 0.12 280)' 
                        : 'var(--color-cp-accent)',
                      opacity: 0.6 + (pct / 100) * 0.4,
                    }}
                  />
                </div>
                <span className="font-data text-caption text-[var(--color-cp-text-tertiary)] w-[2.5rem] shrink-0 text-right tabular-nums">
                  {port.records > 1000 ? `${(port.records / 1000).toFixed(0)}K` : port.records}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
