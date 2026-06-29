/**
 * ThreatSpotlight — Enhanced with AI Vulnerability Priority Scoring
 * 
 * Two modes:
 *   1. "CVE Spotlight" — rotating CISA KEV entries (existing)
 *   2. "AI Priority" — LLM-ranked patch priority list (new)
 * 
 * Auto-toggles between modes, with a subtle tab indicator.
 * Click/touch any card to open SpotlightDeepDive modal.
 */
import { trpc } from '@/lib/trpc';
import { useState, useEffect, useMemo } from 'react';
import { Link } from 'wouter';
import SpotlightDeepDive from '@/components/SpotlightDeepDive';

interface SpotlightCVE {
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

const ROTATION_INTERVAL = 15000;

function getSeverityClass(severity: string): string {
  switch (severity?.toLowerCase()) {
    case 'critical': return 'severity-critical';
    case 'high': return 'severity-high';
    case 'medium': return 'severity-medium';
    default: return 'severity-low';
  }
}

function getSeverityDotClass(severity: string): string {
  switch (severity?.toLowerCase()) {
    case 'critical': return 'severity-dot-critical';
    case 'high': return 'severity-dot-high';
    case 'medium': return 'severity-dot-medium';
    default: return 'severity-dot-low';
  }
}

export default function ThreatSpotlight() {
  const { data, isLoading } = trpc.threats.threatOfTheDay.useQuery(undefined, {
    refetchInterval: 10 * 60 * 1000,
    retry: 2,
  });

  const { data: aiPriority, isLoading: aiLoading } = trpc.ai.vulnPriority.useQuery(undefined, {
    refetchInterval: 30 * 60 * 1000,
    retry: 1,
  });

  const [mode, setMode] = useState<'cve' | 'ai'>('cve');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  // Deep-dive modal state
  const [deepDiveOpen, setDeepDiveOpen] = useState(false);
  const [deepDiveMode, setDeepDiveMode] = useState<'cve' | 'ai'>('cve');
  const [deepDiveCVE, setDeepDiveCVE] = useState<SpotlightCVE | null>(null);
  const [deepDiveAI, setDeepDiveAI] = useState<any>(null);

  const allCVEs: SpotlightCVE[] = data?.recentCVEs || [];
  const currentCVE = allCVEs[currentIndex] || data?.spotlight;
  const aiItems = aiPriority?.prioritizedList || [];

  // Auto-rotate CVEs and toggle modes
  useEffect(() => {
    if (deepDiveOpen) return; // Pause rotation when modal is open
    const interval = setInterval(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        if (mode === 'cve') {
          const nextIdx = (currentIndex + 1) % Math.max(allCVEs.length, 1);
          if (nextIdx === 0 && aiItems.length > 0) {
            // After full CVE rotation, show AI priority
            setMode('ai');
          } else {
            setCurrentIndex(nextIdx);
          }
        } else {
          // After AI view, go back to CVE
          setMode('cve');
          setCurrentIndex(0);
        }
        setIsTransitioning(false);
      }, 300);
    }, ROTATION_INTERVAL);
    return () => clearInterval(interval);
  }, [mode, currentIndex, allCVEs.length, aiItems.length, deepDiveOpen]);

  // Handle CVE card click → open deep-dive
  const handleCVEClick = () => {
    if (currentCVE) {
      setDeepDiveMode('cve');
      setDeepDiveCVE(currentCVE);
      setDeepDiveOpen(true);
    }
  };

  // Handle AI card click → open deep-dive
  const handleAIClick = (item: any) => {
    setDeepDiveMode('ai');
    setDeepDiveAI(item);
    setDeepDiveOpen(true);
  };

  if (isLoading || (!currentCVE && mode === 'cve')) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-2">
        <div className="w-4 h-4 border border-[var(--color-cp-border)] border-t-[var(--color-cp-accent)] rounded-full animate-spin" />
        <span className="text-caption text-[var(--color-cp-text-tertiary)]">Loading threat intelligence...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header with mode tabs */}
      <div className="cp-panel-header">
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setMode('cve'); setIsTransitioning(false); }}
            className={`text-label transition-colors cursor-pointer ${
              mode === 'cve' ? 'text-[var(--color-cp-accent)]' : 'text-[var(--color-cp-text-tertiary)] hover:text-[var(--color-cp-text-secondary)]'
            }`}
          >
            CVE Spotlight
          </button>
          <div className="w-px h-3 bg-[var(--color-cp-border)]" />
          <button
            onClick={() => { setMode('ai'); setIsTransitioning(false); }}
            className={`text-label flex items-center gap-1 transition-colors cursor-pointer ${
              mode === 'ai' ? 'text-violet-400' : 'text-[var(--color-cp-text-tertiary)] hover:text-[var(--color-cp-text-secondary)]'
            }`}
          >
            <div className="w-1 h-1 rounded-full bg-violet-500" />
            AI Priority
          </button>
        </div>
        <span className="text-caption text-[var(--color-cp-text-tertiary)]">
          {mode === 'cve' ? `${currentIndex + 1}/${allCVEs.length}` : `${aiItems.length} ranked`}
        </span>
      </div>

      {/* Content */}
      <div className={`cp-panel-body flex-1 flex flex-col overflow-hidden transition-opacity duration-300 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
        {mode === 'cve' && currentCVE && <CVEView cve={currentCVE} onClick={handleCVEClick} />}
        {mode === 'ai' && <AIPriorityView items={aiItems} isLoading={aiLoading} confidence={aiPriority?.modelConfidence} onItemClick={handleAIClick} />}
      </div>

      {/* Footer */}
      <div className="flex justify-center gap-1 py-2 border-t border-[var(--color-cp-border)]">
        {mode === 'cve' ? (
          allCVEs.slice(0, 10).map((cve, i) => (
            <div
              key={`dot-${cve.cveId || i}`}
              className={`w-1 h-1 rounded-full transition-all duration-300 ${
                i === currentIndex ? 'bg-[var(--color-cp-accent)]' : 'bg-[var(--color-cp-border)]'
              }`}
            />
          ))
        ) : (
          <Link href="/ai" className="text-[8px] text-violet-400 hover:text-violet-300 transition-colors">
            View full AI analysis →
          </Link>
        )}
      </div>

      {/* Deep-Dive Modal */}
      <SpotlightDeepDive
        isOpen={deepDiveOpen}
        onClose={() => setDeepDiveOpen(false)}
        mode={deepDiveMode}
        cveData={deepDiveCVE}
        aiData={deepDiveAI}
      />
    </div>
  );
}

// ─── CVE View (existing) ────────────────────────────────────────────────────

function CVEView({ cve, onClick }: { cve: SpotlightCVE; onClick: () => void }) {
  return (
    <div onClick={onClick} className="cursor-pointer hover:bg-[var(--color-cp-elevated)]/50 rounded-md transition-colors -mx-1 px-1 py-0.5">
      {/* CVE ID + Score row */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${getSeverityDotClass(cve.severity)}`} />
          <span className="font-data text-body text-[var(--color-cp-text-primary)] font-medium">
            {cve.cveId}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`font-data text-[13px] font-light ${getSeverityClass(cve.severity)}`}>
            {cve.cvssScore ? cve.cvssScore.toFixed(1) : 'N/A'}
          </span>
          <span className="text-caption text-[var(--color-cp-text-tertiary)]">CVSS</span>
        </div>
      </div>

      {/* Vendor / Product */}
      <div className="text-caption text-[var(--color-cp-text-secondary)] mb-1.5">
        {cve.vendor} — {cve.product}
      </div>

      {/* Tags */}
      <div className="flex gap-1.5 mb-2 flex-wrap">
        {cve.isActivelyExploited && (
          <span className="text-caption px-1.5 py-0.5 rounded bg-[var(--color-cp-critical)]/10 severity-critical">
            Actively Exploited
          </span>
        )}
        {cve.isRansomwareRelated && (
          <span className="text-caption px-1.5 py-0.5 rounded bg-[var(--color-cp-high)]/10 severity-high">
            Ransomware
          </span>
        )}
        {cve.cwes.slice(0, 2).map((cwe, i) => (
          <span key={`${cwe}-${i}`} className="text-caption px-1.5 py-0.5 rounded bg-[var(--color-cp-elevated)] text-[var(--color-cp-text-tertiary)]">
            {cwe}
          </span>
        ))}
      </div>

      {/* Description */}
      <p className="text-caption text-[var(--color-cp-text-secondary)] leading-relaxed line-clamp-3 mb-2">
        {cve.description}
      </p>

      {/* Analyst Note */}
      <div className="mt-auto pt-2 border-t border-[var(--color-cp-border)]">
        <span className="text-caption text-[var(--color-cp-text-tertiary)] block mb-0.5">Analyst Note</span>
        <p className="text-caption text-[var(--color-cp-text-secondary)] leading-relaxed line-clamp-2">
          {cve.educationalNote}
        </p>
      </div>

      {/* Touch hint */}
      <div className="mt-1.5 text-center">
        <span className="text-[8px] text-[var(--color-cp-text-tertiary)] opacity-50">
          Tap for deep-dive analysis
        </span>
      </div>
    </div>
  );
}

// ─── AI Priority View (new) ─────────────────────────────────────────────────

function AIPriorityView({ items, isLoading, confidence, onItemClick }: { items: any[]; isLoading: boolean; confidence?: number; onItemClick: (item: any) => void }) {
  if (isLoading || items.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="w-4 h-4 border border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
          <span className="text-caption text-[var(--color-cp-text-tertiary)]">Running LLM risk analysis...</span>
        </div>
      </div>
    );
  }

  // Show top 3 in the compact panel
  const topItems = items.slice(0, 3);
  const urgencyColors: Record<string, string> = {
    immediate: 'var(--color-cp-critical)',
    high: 'var(--color-cp-high)',
    moderate: 'var(--color-cp-medium)',
    routine: 'var(--color-cp-low)',
  };

  return (
    <>
      {/* Confidence header */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-caption text-[var(--color-cp-text-tertiary)]">Patch Priority (AI-Ranked)</span>
        <span className="font-data text-[9px] text-violet-400">{confidence || 0}% confidence</span>
      </div>

      {/* Top 3 priority items */}
      <div className="flex-1 flex flex-col gap-1.5 overflow-hidden">
        {topItems.map((item, index) => {
          const urgencyColor = urgencyColors[item.urgency] || 'var(--color-cp-text-tertiary)';
          return (
            <div 
              key={item.cveId} 
              className="p-2 rounded bg-[var(--color-cp-elevated)] border border-[var(--color-cp-border)] cursor-pointer hover:border-violet-500/30 transition-colors"
              onClick={() => onItemClick(item)}
            >
              <div className="flex items-center justify-between mb-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="font-data text-[9px] text-[var(--color-cp-text-tertiary)]">#{index + 1}</span>
                  <span className="font-data text-[10px] text-[var(--color-cp-text-primary)] font-medium">{item.cveId}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span
                    className="text-[8px] px-1 py-0.5 rounded font-medium uppercase"
                    style={{ backgroundColor: `color-mix(in oklch, ${urgencyColor} 15%, transparent)`, color: urgencyColor }}
                  >
                    {item.urgency}
                  </span>
                  {/* Mini risk gauge */}
                  <div className="relative w-5 h-5">
                    <svg className="w-5 h-5 -rotate-90" viewBox="0 0 20 20">
                      <circle cx="10" cy="10" r="7" fill="none" stroke="var(--color-cp-border)" strokeWidth="2" />
                      <circle
                        cx="10" cy="10" r="7" fill="none"
                        stroke={urgencyColor}
                        strokeWidth="2"
                        strokeDasharray={`${(item.riskScore / 100) * 44} 44`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center font-data text-[6px]" style={{ color: urgencyColor }}>
                      {item.riskScore}
                    </span>
                  </div>
                </div>
              </div>
              <p className="text-[8px] text-[var(--color-cp-text-secondary)] leading-relaxed line-clamp-1">
                {item.recommendedAction}
              </p>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="mt-auto pt-2 border-t border-[var(--color-cp-border)]">
        <p className="text-[8px] text-[var(--color-cp-text-tertiary)] leading-relaxed">
          <span className="text-violet-400 font-medium">Model: </span>
          LLM multi-factor scoring (CVSS + Exploitation + Ransomware + CWE + Recency)
        </p>
      </div>
    </>
  );
}
