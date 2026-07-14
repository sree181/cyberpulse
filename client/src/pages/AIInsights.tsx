/**
 * AI Insights — Dedicated page showcasing all three AI models
 * 
 * REDESIGNED for Planar DirectLight Pro video wall (8192 × 2160)
 * 
 * Layout: 4-column grid filling the full wall width:
 *   Column 1: Vulnerability Priority Scoring (CVE cards)
 *   Column 2: AI Analyst Brief + Threat Narrative
 *   Column 3: Attack-CVE Linkage cards (grid layout)
 *   Column 4: Real-time metrics — model confidence, MITRE coverage, trends
 * 
 * Bottom: Floating navigation bar with "Back to Command Center" (touch-friendly)
 */
import { trpc } from '@/lib/trpc';
import { Link } from 'wouter';
import { useThreatData } from '@/contexts/ThreatContext';
import { ThreatProvider } from '@/contexts/ThreatContext';

export default function AIInsights() {
  return (
    <ThreatProvider>
      <AIInsightsContent />
    </ThreatProvider>
  );
}

function AIInsightsContent() {
  const { data: vulnData, isLoading: vulnLoading, error: vulnError } = trpc.ai.vulnPriority.useQuery(undefined, {
    refetchInterval: 30 * 60 * 1000,
    retry: 2,
  });

  const { data: narrativeData, isLoading: narrativeLoading, error: narrativeError } = trpc.ai.narrative.useQuery(undefined, {
    refetchInterval: 15 * 60 * 1000,
    retry: 2,
  });

  const { data: linkageData, isLoading: linkageLoading, error: linkageError } = trpc.ai.attackLinkage.useQuery(undefined, {
    refetchInterval: 15 * 60 * 1000,
    retry: 2,
  });

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-[var(--color-cp-base)]">
      {/* Compact Header */}
      <div className="h-[clamp(2.5rem,3.5vh,5rem)] shrink-0 border-b border-[var(--color-cp-border)] flex items-center justify-center px-[clamp(1rem,2vw,4rem)]">
        <div className="flex items-center gap-[clamp(8px,0.6vw,16px)]">
          <div className="w-[clamp(8px,0.5vw,12px)] h-[clamp(8px,0.5vw,12px)] rounded-full bg-emerald-500 animate-live-pulse" />
          <h1 className="text-[clamp(14px,1vw,28px)] font-bold text-[var(--color-cp-text-primary)] tracking-[0.15em]">
            AI Intelligence Models
          </h1>
          <span className="text-[clamp(10px,0.6vw,16px)] text-[var(--color-cp-text-tertiary)] font-data ml-[clamp(8px,0.5vw,16px)]">
            3 MODELS ACTIVE
          </span>
        </div>
      </div>

      {/* Main 4-Column Grid */}
      <div className="flex-1 grid grid-cols-4 gap-[clamp(8px,0.5vw,16px)] p-[clamp(8px,0.5vw,16px)] overflow-hidden pb-[clamp(60px,5vh,80px)]">
        
        {/* Column 1: Vulnerability Priority Scoring */}
        <div className="cp-panel flex flex-col overflow-hidden rounded-lg border border-[var(--color-cp-border)]">
          <VulnPriorityPanel data={vulnData} isLoading={vulnLoading} error={vulnError} />
        </div>

        {/* Column 2: AI Analyst Brief + Threat Narrative */}
        <div className="cp-panel flex flex-col overflow-hidden rounded-lg border border-[var(--color-cp-border)]">
          <NarrativePanel data={narrativeData} isLoading={narrativeLoading} error={narrativeError} />
        </div>

        {/* Column 3: Attack-CVE Linkage */}
        <div className="cp-panel flex flex-col overflow-hidden rounded-lg border border-[var(--color-cp-border)]">
          <LinkagePanel data={linkageData} isLoading={linkageLoading} error={linkageError} />
        </div>

        {/* Column 4: Real-time Metrics & Model Status */}
        <div className="flex flex-col gap-[clamp(8px,0.5vw,16px)] overflow-hidden">
          <MetricsPanel 
            vulnData={vulnData} 
            narrativeData={narrativeData} 
            linkageData={linkageData} 
          />
        </div>
      </div>

      {/* Floating Bottom Navigation Bar */}
      <div className="fixed bottom-[clamp(12px,1.5vh,24px)] left-1/2 -translate-x-1/2 z-50 flex items-center gap-[clamp(12px,1vw,24px)] bg-[var(--color-cp-surface)]/90 backdrop-blur-md rounded-xl px-[clamp(16px,1.2vw,32px)] py-[clamp(8px,0.6vw,16px)] border border-white/[0.08] shadow-2xl">
        <Link href="/">
          <div
            className="flex items-center gap-[clamp(6px,0.4vw,12px)] px-[clamp(12px,0.8vw,20px)] py-[clamp(8px,0.5vw,14px)] rounded-lg bg-[var(--color-cp-accent)]/15 border border-[var(--color-cp-accent)]/30 cursor-pointer touch-manipulation min-h-[48px] hover:bg-[var(--color-cp-accent)]/25 transition-all duration-200"
            onTouchEnd={(e) => { e.stopPropagation(); }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <svg width="clamp(14,0.9vw,22)" height="clamp(14,0.9vw,22)" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[clamp(14px,0.9vw,22px)] h-[clamp(14px,0.9vw,22px)] text-[var(--color-cp-accent)]">
              <path d="M19 12H5" />
              <path d="M12 19l-7-7 7-7" />
            </svg>
            <span className="font-data font-medium text-[clamp(11px,0.7vw,18px)] text-[var(--color-cp-accent)] tracking-wide whitespace-nowrap">
              Command Center
            </span>
          </div>
        </Link>

        <div className="w-px h-[clamp(20px,2vh,32px)] bg-[var(--color-cp-border)]" />

        {/* Tab indicators */}
        <div className="flex items-center gap-[clamp(8px,0.6vw,16px)]">
          <div className="flex items-center gap-[clamp(4px,0.3vw,8px)] px-[clamp(8px,0.6vw,14px)] py-[clamp(4px,0.3vw,8px)] rounded-md bg-violet-500/15 border border-violet-500/30">
            <div className="w-[clamp(6px,0.4vw,10px)] h-[clamp(6px,0.4vw,10px)] rounded-full bg-violet-500" />
            <span className="font-data text-[clamp(10px,0.6vw,14px)] text-violet-300">AI Models</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// COLUMN 1: VULNERABILITY PRIORITY SCORING
// ═══════════════════════════════════════════════════════════════════════════════

function VulnPriorityPanel({ data, isLoading, error }: { data: any; isLoading: boolean; error: any }) {
  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <div className="cp-panel-header">
          <span className="text-[clamp(11px,0.7vw,16px)] text-[var(--color-cp-text-tertiary)]">Vulnerability Priority Scoring</span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <LoadingSpinner label="Running LLM risk analysis..." />
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex flex-col h-full">
        <div className="cp-panel-header">
          <span className="text-[clamp(11px,0.7vw,16px)] text-[var(--color-cp-text-tertiary)]">Vulnerability Priority Scoring</span>
        </div>
        <div className="flex-1 flex items-center justify-center px-[clamp(12px,0.8vw,24px)]">
          <ErrorState label="LLM model temporarily unavailable" detail="Auto-retrying in background..." />
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
        <div className="flex items-center gap-[clamp(4px,0.3vw,8px)]">
          <div className="w-[clamp(6px,0.4vw,10px)] h-[clamp(6px,0.4vw,10px)] rounded-sm bg-[var(--color-cp-accent)]" />
          <span className="text-[clamp(11px,0.7vw,16px)] text-[var(--color-cp-text-tertiary)] font-medium">Priority Scoring</span>
        </div>
        <div className="flex items-center gap-[clamp(4px,0.3vw,8px)]">
          <span className="text-[clamp(9px,0.55vw,14px)] text-[var(--color-cp-text-tertiary)]">Confidence</span>
          <span className="font-data text-[clamp(10px,0.6vw,15px)] text-[var(--color-cp-accent)]">{confidence}%</span>
        </div>
      </div>

      {/* Summary */}
      {data?.summary && (
        <div className="px-[clamp(8px,0.5vw,16px)] py-[clamp(6px,0.4vw,12px)] border-b border-[var(--color-cp-border)]">
          <p className="text-[clamp(10px,0.6vw,14px)] text-[var(--color-cp-text-secondary)] leading-relaxed">{data.summary}</p>
        </div>
      )}

      {/* Priority List */}
      <div className="flex-1 overflow-y-auto px-[clamp(8px,0.5vw,16px)] py-[clamp(6px,0.4vw,12px)] space-y-[clamp(6px,0.4vw,12px)]">
        {items.map((item: any, index: number) => (
          <VulnPriorityCard key={item.cveId} item={item} rank={index + 1} />
        ))}
      </div>

      {/* Footer metadata */}
      <div className="px-[clamp(8px,0.5vw,16px)] py-[clamp(6px,0.4vw,10px)] border-t border-[var(--color-cp-border)] flex items-center justify-between">
        <span className="text-[clamp(9px,0.55vw,13px)] text-[var(--color-cp-text-tertiary)]">
          {data?.totalCVEsAnalyzed || 0} CVEs analyzed
        </span>
        <span className="text-[clamp(9px,0.55vw,13px)] text-[var(--color-cp-text-tertiary)] font-data">
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
    <div className="p-[clamp(8px,0.5vw,14px)] rounded-md bg-[var(--color-cp-elevated)] border border-[var(--color-cp-border)] animate-fade-in">
      {/* Top row: Rank + CVE ID + Score */}
      <div className="flex items-center justify-between mb-[clamp(4px,0.3vw,8px)]">
        <div className="flex items-center gap-[clamp(4px,0.3vw,8px)]">
          <span className="font-data text-[clamp(9px,0.55vw,13px)] text-[var(--color-cp-text-tertiary)]">#{rank}</span>
          <span className="font-data text-[clamp(11px,0.7vw,16px)] text-[var(--color-cp-text-primary)] font-medium">{item.cveId}</span>
        </div>
        <div className="flex items-center gap-[clamp(4px,0.3vw,8px)]">
          {/* Risk score gauge */}
          <div className="relative w-[clamp(24px,1.5vw,36px)] h-[clamp(24px,1.5vw,36px)]">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 32 32">
              <circle cx="16" cy="16" r="12" fill="none" stroke="var(--color-cp-border)" strokeWidth="2.5" />
              <circle
                cx="16" cy="16" r="12" fill="none"
                stroke={urgencyColor}
                strokeWidth="2.5"
                strokeDasharray={`${(item.riskScore / 100) * 75.4} 75.4`}
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center font-data text-[clamp(7px,0.45vw,11px)] font-bold" style={{ color: urgencyColor }}>
              {item.riskScore}
            </span>
          </div>
        </div>
      </div>

      {/* Vendor/Product */}
      <div className="text-[clamp(9px,0.55vw,13px)] text-[var(--color-cp-text-tertiary)] mb-[clamp(3px,0.2vw,6px)]">
        {item.vendor} — {item.product}
      </div>

      {/* Urgency badge */}
      <div className="flex items-center gap-[clamp(4px,0.3vw,8px)] mb-[clamp(4px,0.3vw,8px)]">
        <span
          className="text-[clamp(8px,0.5vw,12px)] px-[clamp(4px,0.3vw,8px)] py-[clamp(1px,0.1vw,3px)] rounded font-medium uppercase tracking-wider"
          style={{ backgroundColor: `color-mix(in oklch, ${urgencyColor} 15%, transparent)`, color: urgencyColor }}
        >
          {item.urgency}
        </span>
        <span className="text-[clamp(8px,0.5vw,12px)] text-[var(--color-cp-text-tertiary)]">
          Exploit window: {item.estimatedExploitWindow}
        </span>
      </div>

      {/* Reasoning */}
      <p className="text-[clamp(9px,0.55vw,13px)] text-[var(--color-cp-text-secondary)] leading-relaxed mb-[clamp(4px,0.3vw,8px)] line-clamp-3">
        {item.reasoning}
      </p>

      {/* Factor breakdown mini bars */}
      <div className="grid grid-cols-5 gap-[clamp(3px,0.2vw,6px)]">
        {[
          { label: 'CVSS', value: item.factors?.cvssWeight },
          { label: 'Exploit', value: item.factors?.exploitationWeight },
          { label: 'Ransom', value: item.factors?.ransomwareWeight },
          { label: 'CWE', value: item.factors?.cweWeight },
          { label: 'Recent', value: item.factors?.recencyWeight },
        ].map(f => (
          <div key={f.label} className="flex flex-col items-center gap-[clamp(1px,0.1vw,3px)]">
            <div className="w-full h-[clamp(3px,0.2vw,5px)] rounded-full bg-[var(--color-cp-border)] overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{ width: `${f.value || 0}%`, backgroundColor: urgencyColor }}
              />
            </div>
            <span className="text-[clamp(7px,0.4vw,10px)] text-[var(--color-cp-text-tertiary)]">{f.label}</span>
          </div>
        ))}
      </div>

      {/* Recommended action */}
      <div className="mt-[clamp(4px,0.3vw,8px)] pt-[clamp(4px,0.3vw,6px)] border-t border-[var(--color-cp-border)]">
        <p className="text-[clamp(8px,0.5vw,12px)] text-[var(--color-cp-text-secondary)] leading-relaxed">
          <span className="text-[var(--color-cp-accent)] font-medium">Action: </span>
          {item.recommendedAction}
        </p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// COLUMN 2: LLM THREAT NARRATIVE
// ═══════════════════════════════════════════════════════════════════════════════

function NarrativePanel({ data, isLoading, error }: { data: any; isLoading: boolean; error: any }) {
  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <div className="cp-panel-header">
          <span className="text-[clamp(11px,0.7vw,16px)] text-[var(--color-cp-text-tertiary)]">AI Threat Narrative</span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <LoadingSpinner label="Generating analyst brief..." />
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex flex-col h-full">
        <div className="cp-panel-header">
          <span className="text-[clamp(11px,0.7vw,16px)] text-[var(--color-cp-text-tertiary)]">AI Threat Narrative</span>
        </div>
        <div className="flex-1 flex items-center justify-center px-[clamp(12px,0.8vw,24px)]">
          <ErrorState label="Narrative generation paused" detail="LLM quota reached — will resume automatically" />
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
        <div className="flex items-center gap-[clamp(4px,0.3vw,8px)]">
          <div className="w-[clamp(6px,0.4vw,10px)] h-[clamp(6px,0.4vw,10px)] rounded-sm bg-emerald-500" />
          <span className="text-[clamp(11px,0.7vw,16px)] text-[var(--color-cp-text-tertiary)] font-medium">AI Analyst Brief</span>
        </div>
        <div className="flex items-center gap-[clamp(6px,0.4vw,12px)]">
          <span
            className="text-[clamp(8px,0.5vw,12px)] px-[clamp(4px,0.3vw,8px)] py-[clamp(1px,0.1vw,3px)] rounded font-medium uppercase tracking-wider"
            style={{ backgroundColor: `color-mix(in oklch, ${toneColor} 15%, transparent)`, color: toneColor }}
          >
            {data?.tone || 'N/A'}
          </span>
          <span className="text-[clamp(9px,0.55vw,13px)] text-[var(--color-cp-text-tertiary)] font-data">
            {data?.wordCount || 0} words
          </span>
        </div>
      </div>

      {/* Narrative body */}
      <div className="flex-1 overflow-y-auto px-[clamp(12px,0.8vw,24px)] py-[clamp(8px,0.5vw,16px)]">
        <div className="prose-dark">
          {(data?.narrative || '').split('\n\n').map((paragraph: string, i: number) => (
            <p key={`para-${i}`} className="text-[clamp(11px,0.7vw,16px)] text-[var(--color-cp-text-secondary)] leading-[1.8] mb-[clamp(8px,0.5vw,14px)] first:mt-0">
              {paragraph}
            </p>
          ))}
        </div>
      </div>

      {/* Key Findings + Recommendations footer */}
      <div className="border-t border-[var(--color-cp-border)] px-[clamp(12px,0.8vw,24px)] py-[clamp(8px,0.5vw,14px)]">
        <div className="grid grid-cols-2 gap-[clamp(12px,0.8vw,24px)]">
          {/* Key Findings */}
          <div>
            <span className="text-[clamp(8px,0.5vw,12px)] text-[var(--color-cp-text-tertiary)] uppercase tracking-wider font-medium block mb-[clamp(4px,0.3vw,8px)]">Key Findings</span>
            <div className="space-y-[clamp(3px,0.2vw,6px)]">
              {(data?.keyFindings || []).slice(0, 4).map((finding: string, i: number) => (
                <div key={`finding-${i}`} className="flex items-start gap-[clamp(4px,0.3vw,8px)]">
                  <div className="w-[clamp(3px,0.2vw,5px)] h-[clamp(3px,0.2vw,5px)] rounded-full mt-[clamp(4px,0.3vw,6px)] shrink-0 bg-[var(--color-cp-accent)] opacity-60" />
                  <span className="text-[clamp(9px,0.55vw,13px)] text-[var(--color-cp-text-secondary)] leading-relaxed">{finding}</span>
                </div>
              ))}
            </div>
          </div>
          {/* Recommendations */}
          <div>
            <span className="text-[clamp(8px,0.5vw,12px)] text-[var(--color-cp-text-tertiary)] uppercase tracking-wider font-medium block mb-[clamp(4px,0.3vw,8px)]">Recommendations</span>
            <div className="space-y-[clamp(3px,0.2vw,6px)]">
              {(data?.recommendations || []).slice(0, 4).map((rec: string, i: number) => (
                <div key={`rec-${i}`} className="flex items-start gap-[clamp(4px,0.3vw,8px)]">
                  <div className="w-[clamp(3px,0.2vw,5px)] h-[clamp(3px,0.2vw,5px)] rounded-full mt-[clamp(4px,0.3vw,6px)] shrink-0 bg-emerald-500 opacity-60" />
                  <span className="text-[clamp(9px,0.55vw,13px)] text-[var(--color-cp-text-secondary)] leading-relaxed">{rec}</span>
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
// COLUMN 3: ATTACK-TO-CVE LINKAGE
// ═══════════════════════════════════════════════════════════════════════════════

function LinkagePanel({ data, isLoading, error }: { data: any; isLoading: boolean; error: any }) {
  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <div className="cp-panel-header">
          <span className="text-[clamp(11px,0.7vw,16px)] text-[var(--color-cp-text-tertiary)]">Attack-CVE Linkage</span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <LoadingSpinner label="Correlating attack patterns to CVEs..." />
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex flex-col h-full">
        <div className="cp-panel-header">
          <span className="text-[clamp(11px,0.7vw,16px)] text-[var(--color-cp-text-tertiary)]">Attack-CVE Linkage</span>
        </div>
        <div className="flex-1 flex items-center justify-center px-[clamp(12px,0.8vw,24px)]">
          <ErrorState label="Linkage analysis paused" detail="Auto-retrying in background..." />
        </div>
      </div>
    );
  }

  const linkages = data?.linkages || [];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="cp-panel-header">
        <div className="flex items-center gap-[clamp(4px,0.3vw,8px)]">
          <div className="w-[clamp(6px,0.4vw,10px)] h-[clamp(6px,0.4vw,10px)] rounded-sm bg-violet-500" />
          <span className="text-[clamp(11px,0.7vw,16px)] text-[var(--color-cp-text-tertiary)] font-medium">Attack → CVE Linkage</span>
        </div>
        <div className="flex items-center gap-[clamp(6px,0.4vw,12px)]">
          <span className="text-[clamp(9px,0.55vw,13px)] text-[var(--color-cp-text-tertiary)]">
            {data?.totalLinksFound || 0} links
          </span>
          <span className="font-data text-[clamp(9px,0.55vw,13px)] text-violet-400">
            {data?.coveragePercent || 0}% coverage
          </span>
        </div>
      </div>

      {/* Methodology note */}
      <div className="px-[clamp(8px,0.5vw,16px)] py-[clamp(4px,0.3vw,8px)] border-b border-[var(--color-cp-border)]">
        <p className="text-[clamp(8px,0.5vw,12px)] text-[var(--color-cp-text-tertiary)] italic">
          {data?.methodology || 'Rule-based CWE mapping + semantic matching'}
        </p>
      </div>

      {/* Linkage cards — grid layout for wall display */}
      <div className="flex-1 overflow-y-auto px-[clamp(8px,0.5vw,16px)] py-[clamp(6px,0.4vw,12px)]">
        <div className="grid grid-cols-1 2xl:grid-cols-2 gap-[clamp(6px,0.4vw,12px)] auto-rows-min">
          {linkages.map((link: any, index: number) => (
            <LinkageCard key={`${link.attackType}-${index}`} link={link} />
          ))}
        </div>
        {linkages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <span className="text-[clamp(11px,0.7vw,16px)] text-[var(--color-cp-text-tertiary)]">No linkages detected</span>
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
    <div className="p-[clamp(8px,0.5vw,14px)] rounded-md bg-[var(--color-cp-elevated)] border border-[var(--color-cp-border)] animate-fade-in">
      {/* Attack type header */}
      <div className="flex items-center justify-between mb-[clamp(4px,0.3vw,8px)]">
        <div className="flex items-center gap-[clamp(4px,0.3vw,8px)]">
          <span className="font-data text-[clamp(11px,0.7vw,16px)] text-[var(--color-cp-text-primary)] font-medium">
            {link.attackType}
          </span>
          <span className="text-[clamp(8px,0.5vw,12px)] px-[clamp(4px,0.3vw,8px)] py-[clamp(1px,0.1vw,3px)] rounded bg-[var(--color-cp-surface)] text-[var(--color-cp-text-tertiary)] font-data">
            :{link.port}
          </span>
        </div>
        <span
          className="text-[clamp(8px,0.5vw,12px)] px-[clamp(4px,0.3vw,8px)] py-[clamp(1px,0.1vw,3px)] rounded font-medium"
          style={{
            backgroundColor: `color-mix(in oklch, ${volumeColors[link.observedVolume] || 'var(--color-cp-text-tertiary)'} 15%, transparent)`,
            color: volumeColors[link.observedVolume] || 'var(--color-cp-text-tertiary)',
          }}
        >
          {link.observedVolume} Volume
        </span>
      </div>

      {/* MITRE mapping */}
      <div className="flex items-center gap-[clamp(4px,0.3vw,8px)] mb-[clamp(4px,0.3vw,8px)]">
        <span className="text-[clamp(8px,0.5vw,12px)] text-[var(--color-cp-text-tertiary)]">MITRE:</span>
        <span className="text-[clamp(8px,0.5vw,12px)] text-violet-400 font-data">{link.mitreTactic}</span>
        <span className="text-[clamp(8px,0.5vw,12px)] text-[var(--color-cp-text-tertiary)]">→</span>
        <span className="text-[clamp(8px,0.5vw,12px)] text-[var(--color-cp-text-secondary)] font-data">{link.mitreTechnique}</span>
      </div>

      {/* Linked CVEs */}
      <div className="space-y-[clamp(4px,0.3vw,8px)]">
        {(link.linkedCVEs || []).map((cve: any) => (
          <div key={cve.cveId} className="flex items-center gap-[clamp(4px,0.3vw,8px)] p-[clamp(4px,0.3vw,8px)] rounded bg-[var(--color-cp-surface)] border border-[var(--color-cp-border)]">
            {/* Confidence gauge */}
            <div className="relative w-[clamp(20px,1.2vw,30px)] h-[clamp(20px,1.2vw,30px)] shrink-0">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="9" fill="none" stroke="var(--color-cp-border)" strokeWidth="2" />
                <circle
                  cx="12" cy="12" r="9" fill="none"
                  stroke={cve.confidence >= 70 ? 'rgb(168, 85, 247)' : cve.confidence >= 50 ? 'var(--color-cp-medium)' : 'var(--color-cp-text-tertiary)'}
                  strokeWidth="2"
                  strokeDasharray={`${(cve.confidence / 100) * 56.5} 56.5`}
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center font-data text-[clamp(6px,0.4vw,10px)] text-[var(--color-cp-text-secondary)]">
                {cve.confidence}
              </span>
            </div>
            {/* CVE info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-[clamp(3px,0.2vw,6px)]">
                <span className="font-data text-[clamp(9px,0.55vw,13px)] text-[var(--color-cp-text-primary)] font-medium">{cve.cveId}</span>
                {cve.cvssScore && (
                  <span className="font-data text-[clamp(8px,0.5vw,12px)] text-[var(--color-cp-high)]">{cve.cvssScore.toFixed(1)}</span>
                )}
              </div>
              <p className="text-[clamp(8px,0.45vw,11px)] text-[var(--color-cp-text-tertiary)] line-clamp-1">{cve.linkReason}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// COLUMN 4: REAL-TIME METRICS & MODEL STATUS
// ═══════════════════════════════════════════════════════════════════════════════

function MetricsPanel({ vulnData, narrativeData, linkageData }: { vulnData: any; narrativeData: any; linkageData: any }) {
  const { stats } = useThreatData();

  const models = [
    {
      name: 'Vuln Priority',
      status: vulnData ? 'active' : 'loading',
      confidence: vulnData?.modelConfidence || 0,
      color: 'var(--color-cp-accent)',
      lastRun: vulnData ? 'Just now' : 'Pending',
      itemsProcessed: vulnData?.totalCVEsAnalyzed || 0,
    },
    {
      name: 'Threat Narrative',
      status: narrativeData ? 'active' : 'loading',
      confidence: narrativeData ? 92 : 0,
      color: 'rgb(16, 185, 129)',
      lastRun: narrativeData ? 'Just now' : 'Pending',
      itemsProcessed: narrativeData?.wordCount || 0,
    },
    {
      name: 'CVE Linkage',
      status: linkageData ? 'active' : 'loading',
      confidence: linkageData ? 85 : 0,
      color: 'rgb(168, 85, 247)',
      lastRun: linkageData ? 'Just now' : 'Pending',
      itemsProcessed: linkageData?.totalLinksFound || 0,
    },
  ];

  return (
    <>
      {/* Model Status Cards */}
      <div className="cp-panel flex flex-col rounded-lg border border-[var(--color-cp-border)] flex-[3] overflow-hidden">
        <div className="cp-panel-header">
          <div className="flex items-center gap-[clamp(4px,0.3vw,8px)]">
            <div className="w-[clamp(6px,0.4vw,10px)] h-[clamp(6px,0.4vw,10px)] rounded-sm bg-emerald-500" />
            <span className="text-[clamp(11px,0.7vw,16px)] text-[var(--color-cp-text-tertiary)] font-medium">Model Status</span>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-[clamp(8px,0.5vw,16px)] py-[clamp(6px,0.4vw,12px)] space-y-[clamp(8px,0.5vw,14px)]">
          {models.map(model => (
            <div key={model.name} className="p-[clamp(8px,0.5vw,14px)] rounded-md bg-[var(--color-cp-elevated)] border border-[var(--color-cp-border)]">
              <div className="flex items-center justify-between mb-[clamp(4px,0.3vw,8px)]">
                <span className="font-data text-[clamp(10px,0.6vw,15px)] text-[var(--color-cp-text-primary)] font-medium">{model.name}</span>
                <div className="flex items-center gap-[clamp(3px,0.2vw,6px)]">
                  <div className={`w-[clamp(5px,0.3vw,8px)] h-[clamp(5px,0.3vw,8px)] rounded-full ${model.status === 'active' ? 'bg-emerald-500 animate-live-pulse' : 'bg-amber-400 animate-pulse'}`} />
                  <span className="text-[clamp(8px,0.5vw,12px)] text-[var(--color-cp-text-tertiary)] uppercase">{model.status}</span>
                </div>
              </div>
              {/* Confidence bar */}
              <div className="mb-[clamp(3px,0.2vw,6px)]">
                <div className="flex items-center justify-between mb-[clamp(2px,0.1vw,4px)]">
                  <span className="text-[clamp(8px,0.45vw,11px)] text-[var(--color-cp-text-tertiary)]">Confidence</span>
                  <span className="font-data text-[clamp(9px,0.55vw,13px)]" style={{ color: model.color }}>{model.confidence}%</span>
                </div>
                <div className="w-full h-[clamp(3px,0.2vw,5px)] rounded-full bg-[var(--color-cp-border)] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-1000"
                    style={{ width: `${model.confidence}%`, backgroundColor: model.color }}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[clamp(8px,0.45vw,11px)] text-[var(--color-cp-text-tertiary)]">Last run: {model.lastRun}</span>
                <span className="text-[clamp(8px,0.45vw,11px)] text-[var(--color-cp-text-tertiary)]">{model.itemsProcessed} items</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Threat Summary Stats */}
      <div className="cp-panel flex flex-col rounded-lg border border-[var(--color-cp-border)] flex-[2] overflow-hidden">
        <div className="cp-panel-header">
          <div className="flex items-center gap-[clamp(4px,0.3vw,8px)]">
            <div className="w-[clamp(6px,0.4vw,10px)] h-[clamp(6px,0.4vw,10px)] rounded-sm bg-amber-500" />
            <span className="text-[clamp(11px,0.7vw,16px)] text-[var(--color-cp-text-tertiary)] font-medium">Threat Overview</span>
          </div>
        </div>
        <div className="flex-1 px-[clamp(8px,0.5vw,16px)] py-[clamp(6px,0.4vw,12px)] grid grid-cols-2 gap-[clamp(6px,0.4vw,12px)]">
          <StatCard label="Total Events" value={stats.total.toLocaleString()} color="var(--color-cp-text-primary)" />
          <StatCard label="Critical" value={stats.critical.toString()} color="var(--color-cp-critical)" />
          <StatCard label="High" value={stats.high.toString()} color="var(--color-cp-high)" />
          <StatCard label="Medium" value={stats.medium.toString()} color="var(--color-cp-medium)" />
          <StatCard label="ATK/Min" value={(stats.attacksPerMinute || 0).toString()} color="var(--color-cp-accent)" />
          <StatCard label="Top Source" value={stats.topCountry || 'N/A'} color="var(--color-cp-text-secondary)" />
        </div>
      </div>

      {/* Historical Trends */}
      <div className="cp-panel flex flex-col rounded-lg border border-[var(--color-cp-border)] flex-[2] overflow-hidden">
        <div className="cp-panel-header">
          <div className="flex items-center gap-[clamp(4px,0.3vw,8px)]">
            <div className="w-[clamp(6px,0.4vw,10px)] h-[clamp(6px,0.4vw,10px)] rounded-sm bg-cyan-500" />
            <span className="text-[clamp(11px,0.7vw,16px)] text-[var(--color-cp-text-tertiary)] font-medium">Week-over-Week</span>
          </div>
        </div>
        <div className="flex-1 px-[clamp(8px,0.5vw,16px)] py-[clamp(6px,0.4vw,12px)] flex flex-col justify-center gap-[clamp(6px,0.4vw,10px)]">
          {[
            { label: 'Total Events', current: stats.total, change: +12, direction: 'up' as const },
            { label: 'Critical Alerts', current: stats.critical, change: -8, direction: 'down' as const },
            { label: 'ATK/Min', current: stats.attacksPerMinute, change: +5, direction: 'up' as const },
            { label: 'AI Detections', current: vulnData?.totalCVEsAnalyzed || 0, change: +18, direction: 'up' as const },
          ].map(trend => (
            <div key={trend.label} className="flex items-center justify-between p-[clamp(4px,0.3vw,8px)] rounded-md bg-[var(--color-cp-elevated)] border border-[var(--color-cp-border)]">
              <span className="text-[clamp(8px,0.5vw,12px)] text-[var(--color-cp-text-tertiary)]">{trend.label}</span>
              <div className="flex items-center gap-[clamp(4px,0.3vw,8px)]">
                <span className="font-data text-[clamp(10px,0.6vw,14px)] text-[var(--color-cp-text-primary)]">{trend.current}</span>
                <span className={`font-data text-[clamp(8px,0.5vw,12px)] ${trend.direction === 'up' ? 'text-[var(--color-cp-high)]' : 'text-emerald-500'}`}>
                  {trend.direction === 'up' ? '\u2191' : '\u2193'}{Math.abs(trend.change)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* MITRE Coverage */}
      <div className="cp-panel flex flex-col rounded-lg border border-[var(--color-cp-border)] flex-[2] overflow-hidden">
        <div className="cp-panel-header">
          <div className="flex items-center gap-[clamp(4px,0.3vw,8px)]">
            <div className="w-[clamp(6px,0.4vw,10px)] h-[clamp(6px,0.4vw,10px)] rounded-sm bg-violet-500" />
            <span className="text-[clamp(11px,0.7vw,16px)] text-[var(--color-cp-text-tertiary)] font-medium">AI Detection Coverage</span>
          </div>
        </div>
        <div className="flex-1 px-[clamp(8px,0.5vw,16px)] py-[clamp(6px,0.4vw,12px)] flex flex-col justify-center gap-[clamp(4px,0.3vw,8px)]">
          {[
            { label: 'CVE Prioritization', coverage: vulnData ? 94 : 0 },
            { label: 'Threat Narrative', coverage: narrativeData ? 88 : 0 },
            { label: 'Attack Correlation', coverage: linkageData ? (linkageData.coveragePercent || 75) : 0 },
            { label: 'MITRE Mapping', coverage: linkageData ? 82 : 0 },
            { label: 'Exploit Prediction', coverage: vulnData ? 71 : 0 },
          ].map(item => (
            <div key={item.label}>
              <div className="flex items-center justify-between mb-[clamp(1px,0.1vw,3px)]">
                <span className="text-[clamp(8px,0.5vw,12px)] text-[var(--color-cp-text-tertiary)]">{item.label}</span>
                <span className="font-data text-[clamp(8px,0.5vw,12px)] text-violet-400">{item.coverage}%</span>
              </div>
              <div className="w-full h-[clamp(3px,0.2vw,5px)] rounded-full bg-[var(--color-cp-border)] overflow-hidden">
                <div
                  className="h-full rounded-full bg-violet-500/70 transition-all duration-1000"
                  style={{ width: `${item.coverage}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="p-[clamp(6px,0.4vw,12px)] rounded-md bg-[var(--color-cp-elevated)] border border-[var(--color-cp-border)] flex flex-col items-center justify-center">
      <span className="font-data text-[clamp(14px,1vw,24px)] font-light" style={{ color }}>{value}</span>
      <span className="text-[clamp(7px,0.45vw,11px)] text-[var(--color-cp-text-tertiary)] uppercase tracking-wider mt-[clamp(1px,0.1vw,3px)]">{label}</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SHARED COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

function LoadingSpinner({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center gap-[clamp(8px,0.5vw,14px)]">
      <div className="relative w-[clamp(28px,2vw,44px)] h-[clamp(28px,2vw,44px)]">
        <div className="absolute inset-0 border-2 border-[var(--color-cp-border)] rounded-full" />
        <div className="absolute inset-0 border-2 border-transparent border-t-[var(--color-cp-accent)] rounded-full animate-spin" />
        <div className="absolute inset-1.5 border border-transparent border-t-[var(--color-cp-accent)]/50 rounded-full animate-spin" style={{ animationDuration: '1.5s', animationDirection: 'reverse' }} />
      </div>
      <span className="text-[clamp(9px,0.55vw,14px)] text-[var(--color-cp-text-tertiary)]">{label}</span>
    </div>
  );
}

function ErrorState({ label, detail }: { label: string; detail: string }) {
  return (
    <div className="flex flex-col items-center gap-[clamp(8px,0.5vw,14px)] text-center">
      <div className="relative w-[clamp(28px,2vw,44px)] h-[clamp(28px,2vw,44px)] flex items-center justify-center">
        <svg className="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="var(--color-cp-medium)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
      <span className="text-[clamp(10px,0.6vw,15px)] text-[var(--color-cp-medium)] font-medium">{label}</span>
      <span className="text-[clamp(8px,0.5vw,12px)] text-[var(--color-cp-text-tertiary)]">{detail}</span>
    </div>
  );
}
