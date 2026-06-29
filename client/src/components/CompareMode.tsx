/**
 * CompareMode — Drag-to-Compare Correlation Analysis
 * 
 * A split-view overlay that allows comparing two attack type filters
 * or two time windows side by side. Users drag a central divider to
 * resize the comparison panels.
 * 
 * Designed for touch-screen kiosk interaction.
 */
import { useState, useRef, useCallback, useMemo } from 'react';
import { useThreatData, type ArcData } from '@/contexts/ThreatContext';

interface CompareModeProps {
  isVisible: boolean;
  onClose: () => void;
}

type CompareFilter = {
  label: string;
  type: 'attackType' | 'severity' | 'country';
  value: string;
};

const FILTER_OPTIONS: CompareFilter[] = [
  { label: 'SSH Brute Force', type: 'attackType', value: 'SSH Brute Force' },
  { label: 'DDoS', type: 'attackType', value: 'DDoS' },
  { label: 'SQL Injection', type: 'attackType', value: 'SQL Injection' },
  { label: 'Ransomware', type: 'attackType', value: 'Ransomware' },
  { label: 'Port Scan', type: 'attackType', value: 'Port Scan' },
  { label: 'Critical Severity', type: 'severity', value: 'critical' },
  { label: 'High Severity', type: 'severity', value: 'high' },
  { label: 'Medium Severity', type: 'severity', value: 'medium' },
];

function filterArcs(arcs: ArcData[], filter: CompareFilter): ArcData[] {
  switch (filter.type) {
    case 'attackType':
      return arcs.filter(a => a.attackType === filter.value);
    case 'severity':
      return arcs.filter(a => a.severity === filter.value);
    case 'country':
      return arcs.filter(a => a.sourceCountry === filter.value);
    default:
      return arcs;
  }
}

function ComparePanel({ 
  side, 
  filter, 
  arcs, 
  onFilterChange 
}: { 
  side: 'left' | 'right';
  filter: CompareFilter;
  arcs: ArcData[];
  onFilterChange: (f: CompareFilter) => void;
}) {
  const [showPicker, setShowPicker] = useState(false);

  // Statistics for this filter
  const stats = useMemo(() => {
    const countries: Record<string, number> = {};
    const ports: Record<number, number> = {};
    let criticalCount = 0;
    let highCount = 0;

    arcs.forEach(arc => {
      countries[arc.sourceCountry] = (countries[arc.sourceCountry] || 0) + 1;
      ports[arc.port] = (ports[arc.port] || 0) + 1;
      if (arc.severity === 'critical') criticalCount++;
      if (arc.severity === 'high') highCount++;
    });

    const topCountries = Object.entries(countries)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3);
    const topPorts = Object.entries(ports)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3);

    return { topCountries, topPorts, criticalCount, highCount, total: arcs.length };
  }, [arcs]);

  return (
    <div className="flex-1 flex flex-col min-w-0 p-3">
      {/* Filter selector */}
      <div className="relative mb-3">
        <button
          onClick={() => setShowPicker(!showPicker)}
          className="w-full px-3 py-2 rounded-lg bg-[var(--color-cp-elevated)] border border-[var(--color-cp-border)] text-left flex items-center justify-between hover:border-[var(--color-cp-accent)] transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${side === 'left' ? 'bg-blue-400' : 'bg-amber-400'}`} />
            <span className="text-caption font-medium text-[var(--color-cp-text-primary)]">
              {filter.label}
            </span>
          </div>
          <span className="text-[9px] text-[var(--color-cp-text-tertiary)]">▼</span>
        </button>

        {/* Dropdown picker */}
        {showPicker && (
          <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-[var(--color-cp-elevated)] border border-[var(--color-cp-border)] rounded-lg shadow-xl overflow-hidden">
            {FILTER_OPTIONS.map(opt => (
              <button
                key={`${opt.type}-${opt.value}`}
                onClick={() => { onFilterChange(opt); setShowPicker(false); }}
                className={`w-full px-3 py-1.5 text-left text-caption hover:bg-[var(--color-cp-base)] transition-colors cursor-pointer ${
                  opt.value === filter.value ? 'text-[var(--color-cp-accent)] bg-[var(--color-cp-base)]' : 'text-[var(--color-cp-text-secondary)]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="p-2 rounded-md bg-[var(--color-cp-base)] border border-[var(--color-cp-border)]">
          <div className="text-lg font-bold font-data tabular-nums text-[var(--color-cp-text-primary)]">
            {stats.total}
          </div>
          <div className="text-[9px] text-[var(--color-cp-text-tertiary)] uppercase tracking-wider">
            Active
          </div>
        </div>
        <div className="p-2 rounded-md bg-[var(--color-cp-base)] border border-[var(--color-cp-border)]">
          <div className="text-lg font-bold font-data tabular-nums severity-critical">
            {stats.criticalCount}
          </div>
          <div className="text-[9px] text-[var(--color-cp-text-tertiary)] uppercase tracking-wider">
            Critical
          </div>
        </div>
      </div>

      {/* Top sources */}
      <div className="mb-3">
        <div className="text-[9px] text-[var(--color-cp-text-tertiary)] uppercase tracking-wider mb-1.5">
          Top Sources
        </div>
        <div className="space-y-1">
          {stats.topCountries.length > 0 ? stats.topCountries.map(([country, count]) => (
            <div key={country} className="flex items-center justify-between">
              <span className="text-caption text-[var(--color-cp-text-secondary)]">{country}</span>
              <div className="flex items-center gap-2">
                <div className="w-12 h-1 rounded-full bg-[var(--color-cp-base)] overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${side === 'left' ? 'bg-blue-400' : 'bg-amber-400'}`}
                    style={{ width: `${Math.min(100, (count / Math.max(1, stats.total)) * 100)}%` }}
                  />
                </div>
                <span className="font-data text-[9px] tabular-nums text-[var(--color-cp-text-tertiary)] w-3 text-right">
                  {count}
                </span>
              </div>
            </div>
          )) : (
            <span className="text-caption text-[var(--color-cp-text-tertiary)] italic">No data</span>
          )}
        </div>
      </div>

      {/* Top ports */}
      <div>
        <div className="text-[9px] text-[var(--color-cp-text-tertiary)] uppercase tracking-wider mb-1.5">
          Targeted Ports
        </div>
        <div className="flex flex-wrap gap-1.5">
          {stats.topPorts.length > 0 ? stats.topPorts.map(([port, count]) => (
            <div 
              key={port}
              className="px-2 py-0.5 rounded bg-[var(--color-cp-base)] border border-[var(--color-cp-border)]"
            >
              <span className="font-data text-[9px] text-[var(--color-cp-accent)]">:{port}</span>
              <span className="font-data text-[8px] text-[var(--color-cp-text-tertiary)] ml-1">×{count}</span>
            </div>
          )) : (
            <span className="text-caption text-[var(--color-cp-text-tertiary)] italic">No port data</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CompareMode({ isVisible, onClose }: CompareModeProps) {
  const { activeArcs } = useThreatData();
  const [splitPosition, setSplitPosition] = useState(50); // percentage
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [leftFilter, setLeftFilter] = useState<CompareFilter>(FILTER_OPTIONS[0]);
  const [rightFilter, setRightFilter] = useState<CompareFilter>(FILTER_OPTIONS[1]);

  const leftArcs = useMemo(() => filterArcs(activeArcs, leftFilter), [activeArcs, leftFilter]);
  const rightArcs = useMemo(() => filterArcs(activeArcs, rightFilter), [activeArcs, rightFilter]);

  // Divider drag handling
  const handleDragStart = useCallback(() => {
    setIsDragging(true);
  }, []);

  const handleDragMove = useCallback((clientX: number) => {
    if (!isDragging || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(25, Math.min(75, ((clientX - rect.left) / rect.width) * 100));
    setSplitPosition(x);
  }, [isDragging]);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  if (!isVisible) return null;

  return (
    <div className="absolute inset-0 z-45 flex flex-col animate-in fade-in duration-300">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-[var(--color-cp-base)]/95 backdrop-blur-md" />
      
      {/* Content */}
      <div className="relative flex-1 flex flex-col">
        {/* Header */}
        <div className="px-4 py-3 border-b border-[var(--color-cp-border)] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-blue-400" />
              <span className="text-[10px] text-[var(--color-cp-text-tertiary)] uppercase tracking-wider">vs</span>
              <div className="w-2 h-2 rounded-full bg-amber-400" />
            </div>
            <h2 className="text-sm font-semibold text-[var(--color-cp-text-primary)]">
              Correlation Compare
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-[var(--color-cp-elevated)] border border-[var(--color-cp-border)] flex items-center justify-center text-[var(--color-cp-text-tertiary)] hover:text-[var(--color-cp-text-primary)] hover:border-[var(--color-cp-accent)] transition-all cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Split panels */}
        <div 
          ref={containerRef}
          className="flex-1 flex relative overflow-hidden"
          onMouseMove={(e) => handleDragMove(e.clientX)}
          onMouseUp={handleDragEnd}
          onMouseLeave={handleDragEnd}
          onTouchMove={(e) => e.touches.length === 1 && handleDragMove(e.touches[0].clientX)}
          onTouchEnd={handleDragEnd}
        >
          {/* Left panel */}
          <div style={{ width: `${splitPosition}%` }} className="overflow-hidden">
            <ComparePanel 
              side="left" 
              filter={leftFilter} 
              arcs={leftArcs}
              onFilterChange={setLeftFilter}
            />
          </div>

          {/* Draggable divider */}
          <div 
            className="w-1 bg-[var(--color-cp-border)] relative cursor-col-resize hover:bg-[var(--color-cp-accent)] transition-colors flex-shrink-0"
            onMouseDown={handleDragStart}
            onTouchStart={handleDragStart}
          >
            {/* Divider handle */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-10 rounded-full bg-[var(--color-cp-elevated)] border border-[var(--color-cp-border)] flex items-center justify-center shadow-lg">
              <div className="flex flex-col gap-0.5">
                <div className="w-0.5 h-0.5 rounded-full bg-[var(--color-cp-text-tertiary)]" />
                <div className="w-0.5 h-0.5 rounded-full bg-[var(--color-cp-text-tertiary)]" />
                <div className="w-0.5 h-0.5 rounded-full bg-[var(--color-cp-text-tertiary)]" />
              </div>
            </div>
          </div>

          {/* Right panel */}
          <div style={{ width: `${100 - splitPosition}%` }} className="overflow-hidden">
            <ComparePanel 
              side="right" 
              filter={rightFilter} 
              arcs={rightArcs}
              onFilterChange={setRightFilter}
            />
          </div>
        </div>

        {/* Correlation insight footer */}
        <div className="px-4 py-2.5 border-t border-[var(--color-cp-border)] bg-[var(--color-cp-elevated)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[9px] text-[var(--color-cp-text-tertiary)] uppercase tracking-wider">Correlation</span>
              <CorrelationBadge leftArcs={leftArcs} rightArcs={rightArcs} />
            </div>
            <span className="text-[8px] text-[var(--color-cp-text-tertiary)] font-data">
              Drag divider to resize • Select filters to compare
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Correlation badge — shows overlap between two filter sets
function CorrelationBadge({ leftArcs, rightArcs }: { leftArcs: ArcData[]; rightArcs: ArcData[] }) {
  const correlation = useMemo(() => {
    if (leftArcs.length === 0 || rightArcs.length === 0) return { score: 0, label: 'N/A' };
    
    // Check for shared source countries
    const leftCountries = new Set(leftArcs.map(a => a.sourceCountry));
    const rightCountries = new Set(rightArcs.map(a => a.sourceCountry));
    let shared = 0;
    leftCountries.forEach(c => { if (rightCountries.has(c)) shared++; });
    
    const totalUnique = new Set(Array.from(leftCountries).concat(Array.from(rightCountries))).size;
    const score = totalUnique > 0 ? Math.round((shared / totalUnique) * 100) : 0;
    
    let label = 'Low';
    if (score >= 70) label = 'High';
    else if (score >= 40) label = 'Moderate';
    
    return { score, label };
  }, [leftArcs, rightArcs]);

  const color = correlation.score >= 70 
    ? 'var(--color-cp-critical)' 
    : correlation.score >= 40 
      ? 'var(--color-cp-medium)' 
      : 'var(--color-cp-low)';

  return (
    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[var(--color-cp-base)] border border-[var(--color-cp-border)]">
      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
      <span className="font-data text-[9px] tabular-nums" style={{ color }}>
        {correlation.score}%
      </span>
      <span className="text-[8px] text-[var(--color-cp-text-tertiary)]">
        {correlation.label}
      </span>
    </div>
  );
}
