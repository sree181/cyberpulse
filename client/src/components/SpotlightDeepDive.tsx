/**
 * SpotlightDeepDive — Full-screen modal for CVE/AI Priority deep-dive
 * 
 * Triggered by touch/click on a CVE card in ThreatSpotlight.
 * Shows expanded details: MITRE ATT&CK mapping, affected systems,
 * remediation steps, risk factor breakdown, and exploit timeline.
 */
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface CVEData {
  cveId: string;
  title: string;
  description: string;
  vendor: string;
  product: string;
  cvssScore: number | null;
  severity: string;
  severityColor: string;
  dateAdded: string;
  mitreTactic: string;
  cwes: string[];
  isRansomwareRelated: boolean;
  isActivelyExploited: boolean;
  nvdUrl: string;
  educationalNote: string;
}

interface AIPriorityData {
  cveId: string;
  title: string;
  vendor: string;
  product: string;
  riskScore: number;
  urgency: string;
  reasoning: string;
  recommendedAction: string;
  estimatedExploitWindow: string;
  factors: {
    cvssWeight: number;
    exploitationWeight: number;
    ransomwareWeight: number;
    cweWeight: number;
    recencyWeight: number;
  };
}

interface SpotlightDeepDiveProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'cve' | 'ai';
  cveData?: CVEData | null;
  aiData?: AIPriorityData | null;
}

function getSeverityColor(severity: string): string {
  switch (severity?.toLowerCase()) {
    case 'critical': return 'var(--color-cp-critical)';
    case 'high': return 'var(--color-cp-high)';
    case 'medium': return 'var(--color-cp-medium)';
    default: return 'var(--color-cp-low)';
  }
}

// MITRE ATT&CK tactic descriptions
const MITRE_DESCRIPTIONS: Record<string, string> = {
  'Initial Access': 'Techniques that use various entry vectors to gain their initial foothold within a network.',
  'Execution': 'Techniques that result in adversary-controlled code running on a local or remote system.',
  'Persistence': 'Techniques that adversaries use to keep access to systems across restarts and credential changes.',
  'Privilege Escalation': 'Techniques that adversaries use to gain higher-level permissions on a system or network.',
  'Defense Evasion': 'Techniques that adversaries use to avoid detection throughout their compromise.',
  'Credential Access': 'Techniques for stealing credentials like account names and passwords.',
  'Discovery': 'Techniques an adversary may use to gain knowledge about the system and internal network.',
  'Lateral Movement': 'Techniques that adversaries use to enter and control remote systems on a network.',
  'Collection': 'Techniques adversaries may use to gather information relevant to their objectives.',
  'Exfiltration': 'Techniques that adversaries may use to steal data from your network.',
  'Impact': 'Techniques that adversaries use to disrupt availability or compromise integrity.',
};

export default function SpotlightDeepDive({ isOpen, onClose, mode, cveData, aiData }: SpotlightDeepDiveProps) {
  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-[600px] max-h-[85vh] overflow-y-auto bg-[var(--color-cp-surface)] border-[var(--color-cp-border)]">
        <DialogHeader>
          <DialogTitle className="text-[var(--color-cp-text-primary)]">
            {mode === 'cve' ? 'Vulnerability Deep-Dive' : 'AI Risk Analysis'}
          </DialogTitle>
        </DialogHeader>

        {mode === 'cve' && cveData && <CVEDeepDiveContent data={cveData} />}
        {mode === 'ai' && aiData && <AIDeepDiveContent data={aiData} />}
      </DialogContent>
    </Dialog>
  );
}

// ─── CVE Deep-Dive Content ─────────────────────────────────────────────────────

function CVEDeepDiveContent({ data }: { data: CVEData }) {
  const severityColor = getSeverityColor(data.severity);

  return (
    <div className="space-y-4 mt-2">
      {/* CVE Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-data text-lg font-bold text-[var(--color-cp-text-primary)]">
              {data.cveId}
            </span>
            <span 
              className="text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase"
              style={{ 
                backgroundColor: `color-mix(in oklch, ${severityColor} 15%, transparent)`, 
                color: severityColor 
              }}
            >
              {data.severity}
            </span>
          </div>
          <div className="text-caption text-[var(--color-cp-text-secondary)]">
            {data.vendor} — {data.product}
          </div>
        </div>
        {/* CVSS Score Gauge */}
        <div className="flex flex-col items-center">
          <div className="relative w-14 h-14">
            <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
              <circle cx="28" cy="28" r="22" fill="none" stroke="var(--color-cp-border)" strokeWidth="4" />
              <circle
                cx="28" cy="28" r="22" fill="none"
                stroke={severityColor}
                strokeWidth="4"
                strokeDasharray={`${((data.cvssScore || 0) / 10) * 138} 138`}
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center font-data text-sm font-bold" style={{ color: severityColor }}>
              {data.cvssScore ? data.cvssScore.toFixed(1) : 'N/A'}
            </span>
          </div>
          <span className="text-[8px] text-[var(--color-cp-text-tertiary)] mt-0.5">CVSS v3.1</span>
        </div>
      </div>

      {/* Status Badges */}
      <div className="flex flex-wrap gap-2">
        {data.isActivelyExploited && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[var(--color-cp-critical)]/10 border border-[var(--color-cp-critical)]/20">
            <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-cp-critical)] animate-pulse" />
            <span className="text-[10px] font-medium severity-critical">Actively Exploited</span>
          </div>
        )}
        {data.isRansomwareRelated && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[var(--color-cp-high)]/10 border border-[var(--color-cp-high)]/20">
            <span className="text-[10px] font-medium severity-high">Ransomware Campaign</span>
          </div>
        )}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[var(--color-cp-elevated)] border border-[var(--color-cp-border)]">
          <span className="text-[10px] text-[var(--color-cp-text-secondary)]">Added: {data.dateAdded}</span>
        </div>
      </div>

      {/* Description */}
      <div>
        <h4 className="text-[10px] text-[var(--color-cp-text-tertiary)] uppercase tracking-wider mb-1.5">Description</h4>
        <p className="text-caption text-[var(--color-cp-text-secondary)] leading-relaxed">
          {data.description}
        </p>
      </div>

      {/* MITRE ATT&CK Mapping */}
      {data.mitreTactic && (
        <div className="p-3 rounded-lg bg-[var(--color-cp-elevated)] border border-[var(--color-cp-border)]">
          <h4 className="text-[10px] text-[var(--color-cp-text-tertiary)] uppercase tracking-wider mb-1.5">
            MITRE ATT&CK Mapping
          </h4>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-sm bg-[var(--color-cp-accent)]" />
            <span className="text-caption font-medium text-[var(--color-cp-text-primary)]">
              {data.mitreTactic}
            </span>
          </div>
          <p className="text-[10px] text-[var(--color-cp-text-tertiary)] leading-relaxed">
            {MITRE_DESCRIPTIONS[data.mitreTactic] || 'Adversary technique mapped to the MITRE ATT&CK framework.'}
          </p>
        </div>
      )}

      {/* CWE Tags */}
      {data.cwes.length > 0 && (
        <div>
          <h4 className="text-[10px] text-[var(--color-cp-text-tertiary)] uppercase tracking-wider mb-1.5">
            Weakness Classification (CWE)
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {data.cwes.map((cwe, i) => (
              <span key={`${cwe}-${i}`} className="px-2 py-0.5 rounded-md bg-[var(--color-cp-base)] border border-[var(--color-cp-border)] text-[10px] text-[var(--color-cp-text-secondary)] font-data">
                {cwe}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Analyst Note */}
      <div className="p-3 rounded-lg bg-[var(--color-cp-base)] border border-[var(--color-cp-border)]">
        <h4 className="text-[10px] text-[var(--color-cp-text-tertiary)] uppercase tracking-wider mb-1.5">
          Analyst Assessment
        </h4>
        <p className="text-caption text-[var(--color-cp-text-secondary)] leading-relaxed">
          {data.educationalNote}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-2 border-t border-[var(--color-cp-border)]">
        <span className="text-[8px] text-[var(--color-cp-text-tertiary)] font-data">
          Source: CISA KEV + NVD
        </span>
        <a 
          href={data.nvdUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-[10px] text-[var(--color-cp-accent)] hover:underline font-data"
        >
          View on NVD →
        </a>
      </div>
    </div>
  );
}

// ─── AI Priority Deep-Dive Content ─────────────────────────────────────────────

function AIDeepDiveContent({ data }: { data: AIPriorityData }) {
  const urgencyColors: Record<string, string> = {
    immediate: 'var(--color-cp-critical)',
    high: 'var(--color-cp-high)',
    moderate: 'var(--color-cp-medium)',
    routine: 'var(--color-cp-low)',
  };
  const urgencyColor = urgencyColors[data.urgency] || 'var(--color-cp-text-tertiary)';

  const factors = [
    { label: 'CVSS Base', weight: data.factors.cvssWeight, max: 30 },
    { label: 'Active Exploitation', weight: data.factors.exploitationWeight, max: 30 },
    { label: 'Ransomware Link', weight: data.factors.ransomwareWeight, max: 20 },
    { label: 'CWE Severity', weight: data.factors.cweWeight, max: 10 },
    { label: 'Recency', weight: data.factors.recencyWeight, max: 10 },
  ];

  return (
    <div className="space-y-4 mt-2">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-data text-lg font-bold text-[var(--color-cp-text-primary)]">
              {data.cveId}
            </span>
            <span 
              className="text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase"
              style={{ 
                backgroundColor: `color-mix(in oklch, ${urgencyColor} 15%, transparent)`, 
                color: urgencyColor 
              }}
            >
              {data.urgency}
            </span>
          </div>
          <div className="text-caption text-[var(--color-cp-text-secondary)]">
            {data.vendor} — {data.product}
          </div>
        </div>
        {/* Risk Score */}
        <div className="flex flex-col items-center">
          <div className="relative w-14 h-14">
            <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
              <circle cx="28" cy="28" r="22" fill="none" stroke="var(--color-cp-border)" strokeWidth="4" />
              <circle
                cx="28" cy="28" r="22" fill="none"
                stroke={urgencyColor}
                strokeWidth="4"
                strokeDasharray={`${(data.riskScore / 100) * 138} 138`}
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center font-data text-sm font-bold" style={{ color: urgencyColor }}>
              {data.riskScore}
            </span>
          </div>
          <span className="text-[8px] text-[var(--color-cp-text-tertiary)] mt-0.5">AI Risk Score</span>
        </div>
      </div>

      {/* Exploit Window */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--color-cp-critical)]/5 border border-[var(--color-cp-critical)]/15">
        <div className="w-2 h-2 rounded-full bg-[var(--color-cp-critical)] animate-pulse" />
        <span className="text-[10px] text-[var(--color-cp-text-secondary)]">
          Estimated Exploit Window: <span className="font-medium severity-critical">{data.estimatedExploitWindow}</span>
        </span>
      </div>

      {/* AI Reasoning */}
      <div>
        <h4 className="text-[10px] text-[var(--color-cp-text-tertiary)] uppercase tracking-wider mb-1.5">
          AI Reasoning
        </h4>
        <p className="text-caption text-[var(--color-cp-text-secondary)] leading-relaxed">
          {data.reasoning}
        </p>
      </div>

      {/* Risk Factor Breakdown */}
      <div className="p-3 rounded-lg bg-[var(--color-cp-elevated)] border border-[var(--color-cp-border)]">
        <h4 className="text-[10px] text-[var(--color-cp-text-tertiary)] uppercase tracking-wider mb-2.5">
          Risk Factor Breakdown
        </h4>
        <div className="space-y-2">
          {factors.map(factor => (
            <div key={factor.label}>
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[10px] text-[var(--color-cp-text-secondary)]">{factor.label}</span>
                <span className="font-data text-[9px] tabular-nums text-[var(--color-cp-text-tertiary)]">
                  {factor.weight}/{factor.max}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-[var(--color-cp-base)] overflow-hidden">
                <div 
                  className="h-full rounded-full transition-all duration-500"
                  style={{ 
                    width: `${(factor.weight / factor.max) * 100}%`,
                    backgroundColor: (factor.weight / factor.max) >= 0.7 ? 'var(--color-cp-critical)' : 
                                     (factor.weight / factor.max) >= 0.4 ? 'var(--color-cp-medium)' : 'var(--color-cp-low)'
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recommended Action */}
      <div className="p-3 rounded-lg bg-[var(--color-cp-base)] border border-[var(--color-cp-border)]">
        <h4 className="text-[10px] text-[var(--color-cp-text-tertiary)] uppercase tracking-wider mb-1.5">
          Recommended Action
        </h4>
        <p className="text-caption text-[var(--color-cp-text-primary)] leading-relaxed font-medium">
          {data.recommendedAction}
        </p>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-[var(--color-cp-border)]">
        <span className="text-[8px] text-[var(--color-cp-text-tertiary)] font-data">
          Model: LLM Multi-Factor Scoring
        </span>
        <div className="flex items-center gap-1">
          <div className="w-1 h-1 rounded-full bg-violet-500" />
          <span className="text-[8px] text-violet-400 font-data">AI-Generated Analysis</span>
        </div>
      </div>
    </div>
  );
}
