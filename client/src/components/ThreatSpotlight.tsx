/**
 * ThreatSpotlight — "Threat of the Day" panel
 * 
 * Redesign: Clean card layout, no animated borders, no pulsing gauges.
 * Typography-driven hierarchy. Severity communicated through a single
 * colored dot and score, not through glowing effects.
 */
import { trpc } from '@/lib/trpc';
import { useState, useEffect } from 'react';

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

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const allCVEs: SpotlightCVE[] = data?.recentCVEs || [];
  const currentCVE = allCVEs[currentIndex] || data?.spotlight;

  // Auto-rotate
  useEffect(() => {
    if (allCVEs.length <= 1) return;
    const interval = setInterval(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentIndex(prev => (prev + 1) % allCVEs.length);
        setIsTransitioning(false);
      }, 300);
    }, ROTATION_INTERVAL);
    return () => clearInterval(interval);
  }, [allCVEs.length]);

  if (isLoading || !currentCVE) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-2">
        <div className="w-4 h-4 border border-[var(--color-cp-border)] border-t-[var(--color-cp-accent)] rounded-full animate-spin" />
        <span className="text-caption text-[var(--color-cp-text-tertiary)]">Loading threat intelligence...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="cp-panel-header">
        <span className="text-label text-[var(--color-cp-text-tertiary)]">
          {currentIndex === 0 ? 'Threat of the Day' : 'Threat Spotlight'}
        </span>
        <span className="text-caption text-[var(--color-cp-text-tertiary)]">
          {currentIndex + 1}/{allCVEs.length}
        </span>
      </div>

      {/* Content */}
      <div className={`cp-panel-body flex-1 flex flex-col overflow-hidden transition-opacity duration-300 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
        {/* CVE ID + Score row */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${getSeverityDotClass(currentCVE.severity)}`} />
            <span className="font-data text-body text-[var(--color-cp-text-primary)] font-medium">
              {currentCVE.cveId}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`font-data text-[13px] font-light ${getSeverityClass(currentCVE.severity)}`}>
              {currentCVE.cvssScore ? currentCVE.cvssScore.toFixed(1) : 'N/A'}
            </span>
            <span className="text-caption text-[var(--color-cp-text-tertiary)]">CVSS</span>
          </div>
        </div>

        {/* Vendor / Product */}
        <div className="text-caption text-[var(--color-cp-text-secondary)] mb-1.5">
          {currentCVE.vendor} — {currentCVE.product}
        </div>

        {/* Tags */}
        <div className="flex gap-1.5 mb-2 flex-wrap">
          {currentCVE.isActivelyExploited && (
            <span className="text-caption px-1.5 py-0.5 rounded bg-[var(--color-cp-critical)]/10 severity-critical">
              Actively Exploited
            </span>
          )}
          {currentCVE.isRansomwareRelated && (
            <span className="text-caption px-1.5 py-0.5 rounded bg-[var(--color-cp-high)]/10 severity-high">
              Ransomware
            </span>
          )}
          {currentCVE.cwes.slice(0, 2).map((cwe, i) => (
            <span key={`${cwe}-${i}`} className="text-caption px-1.5 py-0.5 rounded bg-[var(--color-cp-elevated)] text-[var(--color-cp-text-tertiary)]">
              {cwe}
            </span>
          ))}
        </div>

        {/* Description */}
        <p className="text-caption text-[var(--color-cp-text-secondary)] leading-relaxed line-clamp-3 mb-2">
          {currentCVE.description}
        </p>

        {/* Analyst Note */}
        <div className="mt-auto pt-2 border-t border-[var(--color-cp-border)]">
          <span className="text-caption text-[var(--color-cp-text-tertiary)] block mb-0.5">Analyst Note</span>
          <p className="text-caption text-[var(--color-cp-text-secondary)] leading-relaxed line-clamp-2">
            {currentCVE.educationalNote}
          </p>
        </div>
      </div>

      {/* Rotation dots */}
      <div className="flex justify-center gap-1 py-2 border-t border-[var(--color-cp-border)]">
        {allCVEs.slice(0, 10).map((cve, i) => (
          <div
            key={`dot-${cve.cveId || i}`}
            className={`w-1 h-1 rounded-full transition-all duration-300 ${
              i === currentIndex 
                ? 'bg-[var(--color-cp-accent)]' 
                : 'bg-[var(--color-cp-border)]'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
