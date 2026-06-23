/**
 * AI Insights — Dedicated page showcasing all three AI models
 * 
 * Layout: Full-screen dark command center aesthetic matching the main dashboard.
 * Three professional panels:
 *   1. Vulnerability Priority Scoring (left, tall)
 *   2. LLM Threat Narrative (right top)
 *   3. Attack-to-CVE Linkage (right bottom)
 */
import { trpc } from '@/lib/trpc';
import { Link } from 'wouter';

export default function AIInsights() {
  const { data: vulnData, isLoading: vulnLoading } = trpc.ai.vulnPriority.useQuery(undefined, {
    refetchInterval: 30 * 60 * 1000,
    retry: 2,
  });

  const { data: narrativeData, isLoading: narrativeLoading } = trpc.ai.narrative.useQuery(undefined, {
    refetchInterval: 15 * 60 * 1000,
    retry: 2,
  });

  const { data: linkageData, isLoading: linkageLoading } = trpc.ai.attackLinkage.useQuery(undefined, {
    refetchInterval: 15 * 60 * 1000,
    retry: 2,
  });

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-[var(--color-cp-base)]">
      {/* Header */}
      <div className="h-12 shrink-0 border-b border-[var(--color-cp-border)] flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-caption text-[var(--color-cp-text-tertiary)] hover:text-[var(--color-cp-accent)] transition-colors">
            ← Back to Command Center
          </Link>
          <div className="w-px h-4 bg-[var(--color-cp-border)]" />
          <h1 className="text-title text-[var(--color-cp-text-primary)]">AI Intelligence Models</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-live-pulse" />
          <span className="text-caption text-[var(--color-cp-text-tertiary)] font-data">3 MODELS ACTIVE</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex gap-3 p-3 overflow-hidden">
        {/* Left Column — Vulnerability Priority Scoring */}
        <div className="w-[380px] shrink-0 cp-panel flex flex-col overflow-hidden">
          <VulnPriorityPanel data={vulnData} isLoading={vulnLoading} />
        </div>

        {/* Right Column — Narrative + Linkage */}
        <div className="flex-1 flex flex-col gap-3 overflow-hidden">
          {/* Threat Narrative */}
          <div className="flex-[3] cp-panel overflow-hidden">
            <NarrativePanel data={narrativeData} isLoading={narrativeLoading} />
          </div>
          {/* Attack-CVE Linkage */}
          <div className="flex-[4] cp-panel overflow-hidden">
            <LinkagePanel data={linkageData} isLoading={linkageLoading} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PANEL 1: VULNERABILITY PRIORITY SCORING
// ═══════════════════════════════════════════════════════════════════════════════

function VulnPriorityPanel({ data, isLoading }: { data: any; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <div className="cp-panel-header">
          <span className="text-label text-[var(--color-cp-text-tertiary)]">Vulnerability Priority Scoring</span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <LoadingSpinner label="Running LLM risk analysis..." />
        </div>
      </div>
    );
  }

  const items = data?.prioritizedList || [];
  const confidence = data?.modelConfidence || 0;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="cp-panel-header">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-sm bg-[var(--color-cp-accent)]" />
          <span className="text-label text-[var(--color-cp-text-tertiary)]">Priority Scoring</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-caption text-[var(--color-cp-text-tertiary)]">Confidence</span>
          <span className="font-data text-caption text-[var(--color-cp-accent)]">{confidence}%</span>
        </div>
      </div>

      {/* Summary */}
      {data?.summary && (
        <div className="px-3 py-2 border-b border-[var(--color-cp-border)]">
          <p className="text-caption text-[var(--color-cp-text-secondary)] leading-relaxed">{data.summary}</p>
        </div>
      )}

      {/* Priority List */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
        {items.map((item: any, index: number) => (
          <VulnPriorityCard key={item.cveId} item={item} rank={index + 1} />
        ))}
      </div>

      {/* Footer metadata */}
      <div className="px-3 py-2 border-t border-[var(--color-cp-border)] flex items-center justify-between">
        <span className="text-caption text-[var(--color-cp-text-tertiary)]">
          {data?.totalCVEsAnalyzed || 0} CVEs analyzed
        </span>
        <span className="text-caption text-[var(--color-cp-text-tertiary)] font-data">
          {data?.dataSource || 'N/A'}
        </span>
      </div>
    </div>
  );
}

function VulnPriorityCard({ item, rank }: { item: any; rank: number }) {
  const urgencyColors: Record<string, string> = {
    immediate: 'var(--color-cp-critical)',
    high: 'var(--color-cp-high)',
    moderate: 'var(--color-cp-medium)',
    routine: 'var(--color-cp-low)',
  };

  const urgencyColor = urgencyColors[item.urgency] || 'var(--color-cp-text-tertiary)';

  return (
    <div className="p-2.5 rounded-md bg-[var(--color-cp-elevated)] border border-[var(--color-cp-border)] animate-fade-in">
      {/* Top row: Rank + CVE ID + Score */}
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span className="font-data text-[10px] text-[var(--color-cp-text-tertiary)] w-4">#{rank}</span>
          <span className="font-data text-body text-[var(--color-cp-text-primary)] font-medium">{item.cveId}</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Risk score gauge */}
          <div className="relative w-8 h-8">
            <svg className="w-8 h-8 -rotate-90" viewBox="0 0 32 32">
              <circle cx="16" cy="16" r="12" fill="none" stroke="var(--color-cp-border)" strokeWidth="2.5" />
              <circle
                cx="16" cy="16" r="12" fill="none"
                stroke={urgencyColor}
                strokeWidth="2.5"
                strokeDasharray={`${(item.riskScore / 100) * 75.4} 75.4`}
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center font-data text-[8px] font-bold" style={{ color: urgencyColor }}>
              {item.riskScore}
            </span>
          </div>
        </div>
      </div>

      {/* Vendor/Product */}
      <div className="text-caption text-[var(--color-cp-text-tertiary)] mb-1">
        {item.vendor} — {item.product}
      </div>

      {/* Urgency badge */}
      <div className="flex items-center gap-2 mb-1.5">
        <span
          className="text-[9px] px-1.5 py-0.5 rounded font-medium uppercase tracking-wider"
          style={{ backgroundColor: `color-mix(in oklch, ${urgencyColor} 15%, transparent)`, color: urgencyColor }}
        >
          {item.urgency}
        </span>
        <span className="text-caption text-[var(--color-cp-text-tertiary)]">
          Exploit window: {item.estimatedExploitWindow}
        </span>
      </div>

      {/* Reasoning */}
      <p className="text-caption text-[var(--color-cp-text-secondary)] leading-relaxed mb-1.5 line-clamp-2">
        {item.reasoning}
      </p>

      {/* Factor breakdown mini bars */}
      <div className="grid grid-cols-5 gap-1">
        {[
          { label: 'CVSS', value: item.factors?.cvssWeight },
          { label: 'Exploit', value: item.factors?.exploitationWeight },
          { label: 'Ransom', value: item.factors?.ransomwareWeight },
          { label: 'CWE', value: item.factors?.cweWeight },
          { label: 'Recent', value: item.factors?.recencyWeight },
        ].map(f => (
          <div key={f.label} className="flex flex-col items-center gap-0.5">
            <div className="w-full h-1 rounded-full bg-[var(--color-cp-border)] overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{ width: `${f.value || 0}%`, backgroundColor: urgencyColor }}
              />
            </div>
            <span className="text-[7px] text-[var(--color-cp-text-tertiary)]">{f.label}</span>
          </div>
        ))}
      </div>

      {/* Recommended action */}
      <div className="mt-2 pt-1.5 border-t border-[var(--color-cp-border)]">
        <p className="text-[9px] text-[var(--color-cp-text-secondary)] leading-relaxed">
          <span className="text-[var(--color-cp-accent)] font-medium">Action: </span>
          {item.recommendedAction}
        </p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PANEL 2: LLM THREAT NARRATIVE
// ═══════════════════════════════════════════════════════════════════════════════

function NarrativePanel({ data, isLoading }: { data: any; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <div className="cp-panel-header">
          <span className="text-label text-[var(--color-cp-text-tertiary)]">AI Threat Narrative</span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <LoadingSpinner label="Generating analyst brief..." />
        </div>
      </div>
    );
  }

  const toneColors: Record<string, string> = {
    calm: 'var(--color-cp-low)',
    cautious: 'var(--color-cp-medium)',
    urgent: 'var(--color-cp-high)',
    critical: 'var(--color-cp-critical)',
  };

  const toneColor = toneColors[data?.tone] || 'var(--color-cp-text-tertiary)';

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="cp-panel-header">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-sm bg-emerald-500" />
          <span className="text-label text-[var(--color-cp-text-tertiary)]">AI Analyst Brief</span>
        </div>
        <div className="flex items-center gap-3">
          <span
            className="text-[9px] px-1.5 py-0.5 rounded font-medium uppercase tracking-wider"
            style={{ backgroundColor: `color-mix(in oklch, ${toneColor} 15%, transparent)`, color: toneColor }}
          >
            {data?.tone || 'N/A'}
          </span>
          <span className="text-caption text-[var(--color-cp-text-tertiary)] font-data">
            {data?.wordCount || 0} words
          </span>
        </div>
      </div>

      {/* Narrative body */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        <div className="prose-dark">
          {(data?.narrative || '').split('\n\n').map((paragraph: string, i: number) => (
            <p key={`para-${i}`} className="text-body text-[var(--color-cp-text-secondary)] leading-[1.7] mb-3 first:mt-0">
              {paragraph}
            </p>
          ))}
        </div>
      </div>

      {/* Key Findings + Recommendations footer */}
      <div className="border-t border-[var(--color-cp-border)] px-4 py-2.5">
        <div className="grid grid-cols-2 gap-4">
          {/* Key Findings */}
          <div>
            <span className="text-[9px] text-[var(--color-cp-text-tertiary)] uppercase tracking-wider font-medium block mb-1.5">Key Findings</span>
            <div className="space-y-1">
              {(data?.keyFindings || []).slice(0, 3).map((finding: string, i: number) => (
                <div key={`finding-${i}`} className="flex items-start gap-1.5">
                  <div className="w-1 h-1 rounded-full mt-1.5 shrink-0 bg-[var(--color-cp-accent)] opacity-60" />
                  <span className="text-caption text-[var(--color-cp-text-secondary)] leading-relaxed">{finding}</span>
                </div>
              ))}
            </div>
          </div>
          {/* Recommendations */}
          <div>
            <span className="text-[9px] text-[var(--color-cp-text-tertiary)] uppercase tracking-wider font-medium block mb-1.5">Recommendations</span>
            <div className="space-y-1">
              {(data?.recommendations || []).slice(0, 3).map((rec: string, i: number) => (
                <div key={`rec-${i}`} className="flex items-start gap-1.5">
                  <div className="w-1 h-1 rounded-full mt-1.5 shrink-0 bg-emerald-500 opacity-60" />
                  <span className="text-caption text-[var(--color-cp-text-secondary)] leading-relaxed">{rec}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PANEL 3: ATTACK-TO-CVE LINKAGE
// ═══════════════════════════════════════════════════════════════════════════════

function LinkagePanel({ data, isLoading }: { data: any; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <div className="cp-panel-header">
          <span className="text-label text-[var(--color-cp-text-tertiary)]">Attack-CVE Linkage</span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <LoadingSpinner label="Correlating attack patterns to CVEs..." />
        </div>
      </div>
    );
  }

  const linkages = data?.linkages || [];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="cp-panel-header">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-sm bg-violet-500" />
          <span className="text-label text-[var(--color-cp-text-tertiary)]">Attack → CVE Linkage</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-caption text-[var(--color-cp-text-tertiary)]">
            {data?.totalLinksFound || 0} links
          </span>
          <span className="font-data text-caption text-violet-400">
            {data?.coveragePercent || 0}% coverage
          </span>
        </div>
      </div>

      {/* Methodology note */}
      <div className="px-3 py-1.5 border-b border-[var(--color-cp-border)]">
        <p className="text-[9px] text-[var(--color-cp-text-tertiary)] italic">
          {data?.methodology || 'Rule-based CWE mapping + semantic matching'}
        </p>
      </div>

      {/* Linkage cards */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
        {linkages.map((link: any, index: number) => (
          <LinkageCard key={`${link.attackType}-${index}`} link={link} />
        ))}
        {linkages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <span className="text-body text-[var(--color-cp-text-tertiary)]">No linkages detected</span>
          </div>
        )}
      </div>
    </div>
  );
}

function LinkageCard({ link }: { link: any }) {
  const volumeColors: Record<string, string> = {
    High: 'var(--color-cp-critical)',
    Moderate: 'var(--color-cp-high)',
    Low: 'var(--color-cp-medium)',
  };

  return (
    <div className="p-2.5 rounded-md bg-[var(--color-cp-elevated)] border border-[var(--color-cp-border)] animate-fade-in">
      {/* Attack type header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="font-data text-body text-[var(--color-cp-text-primary)] font-medium">
            {link.attackType}
          </span>
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--color-cp-surface)] text-[var(--color-cp-text-tertiary)] font-data">
            :{link.port}
          </span>
        </div>
        <span
          className="text-[9px] px-1.5 py-0.5 rounded font-medium"
          style={{
            backgroundColor: `color-mix(in oklch, ${volumeColors[link.observedVolume] || 'var(--color-cp-text-tertiary)'} 15%, transparent)`,
            color: volumeColors[link.observedVolume] || 'var(--color-cp-text-tertiary)',
          }}
        >
          {link.observedVolume} Volume
        </span>
      </div>

      {/* MITRE mapping */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[9px] text-[var(--color-cp-text-tertiary)]">MITRE:</span>
        <span className="text-[9px] text-violet-400 font-data">{link.mitreTactic}</span>
        <span className="text-[9px] text-[var(--color-cp-text-tertiary)]">→</span>
        <span className="text-[9px] text-[var(--color-cp-text-secondary)] font-data">{link.mitreTechnique}</span>
      </div>

      {/* Linked CVEs */}
      <div className="space-y-1.5">
        {(link.linkedCVEs || []).map((cve: any) => (
          <div key={cve.cveId} className="flex items-center gap-2 p-1.5 rounded bg-[var(--color-cp-surface)] border border-[var(--color-cp-border)]">
            {/* Confidence gauge */}
            <div className="relative w-6 h-6 shrink-0">
              <svg className="w-6 h-6 -rotate-90" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="9" fill="none" stroke="var(--color-cp-border)" strokeWidth="2" />
                <circle
                  cx="12" cy="12" r="9" fill="none"
                  stroke={cve.confidence >= 70 ? 'rgb(168, 85, 247)' : cve.confidence >= 50 ? 'var(--color-cp-medium)' : 'var(--color-cp-text-tertiary)'}
                  strokeWidth="2"
                  strokeDasharray={`${(cve.confidence / 100) * 56.5} 56.5`}
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center font-data text-[7px] text-[var(--color-cp-text-secondary)]">
                {cve.confidence}
              </span>
            </div>
            {/* CVE info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-data text-[10px] text-[var(--color-cp-text-primary)] font-medium">{cve.cveId}</span>
                {cve.cvssScore && (
                  <span className="font-data text-[9px] text-[var(--color-cp-high)]">{cve.cvssScore.toFixed(1)}</span>
                )}
              </div>
              <p className="text-[8px] text-[var(--color-cp-text-tertiary)] truncate">{cve.linkReason}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SHARED COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

function LoadingSpinner({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative w-10 h-10">
        <div className="absolute inset-0 border-2 border-[var(--color-cp-border)] rounded-full" />
        <div className="absolute inset-0 border-2 border-transparent border-t-[var(--color-cp-accent)] rounded-full animate-spin" />
        <div className="absolute inset-1.5 border border-transparent border-t-[var(--color-cp-accent)]/50 rounded-full animate-spin" style={{ animationDuration: '1.5s', animationDirection: 'reverse' }} />
      </div>
      <span className="text-caption text-[var(--color-cp-text-tertiary)]">{label}</span>
    </div>
  );
}
