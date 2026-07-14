/**
 * ThreatFeed — Live scrolling threat log with Hollywood text effects
 * 
 * Redesign: Clean, readable entries with GSAP text scramble on new arrivals.
 * IP addresses decode from hex characters, attack types scramble in.
 * Typography-driven hierarchy: time → type → source → target.
 */
import { useRef, useEffect, useState } from 'react';
import { useThreatData } from '@/contexts/ThreatContext';
import { type ThreatEvent } from '@/lib/threatEngine';
import { TextScramble } from '@/components/TextScramble';

function formatTime(date: Date): string {
  return date.toISOString().slice(11, 19);
}

function getSeverityClass(severity: string): string {
  switch (severity) {
    case 'critical': return 'severity-dot-critical';
    case 'high': return 'severity-dot-high';
    case 'medium': return 'severity-dot-medium';
    default: return 'severity-dot-low';
  }
}

function ThreatEntry({ threat, isNew }: { threat: ThreatEvent; isNew: boolean }) {
  return (
    <div className="animate-fade-in px-3 py-2 border-b border-[var(--color-cp-border)]/50 last:border-b-0 hover:bg-[var(--color-cp-elevated)]/50 transition-colors">
      <div className="flex items-center gap-2">
        {/* Severity dot */}
        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${getSeverityClass(threat.severity)}`} />
        {/* Attack type — scrambles in for new entries */}
        <span className="text-body text-[var(--color-cp-text-primary)] font-medium whitespace-nowrap">
          {isNew ? (
            <TextScramble 
              text={threat.attackType} 
              mode="cyber" 
              duration={0.6} 
              trigger={threat.id}
            />
          ) : (
            threat.attackType
          )}
        </span>
        {/* Time */}
        <span className="font-data text-caption text-[var(--color-cp-text-tertiary)] ml-auto tabular-nums shrink-0">
          {formatTime(threat.timestamp)}
        </span>
      </div>
      <div className="mt-1 ml-3.5 flex items-center gap-1.5 text-caption text-[var(--color-cp-text-secondary)] flex-wrap">
        {/* IP address — always readable, no scramble */}
        <span className="font-data tabular-nums shrink-0">
          {threat.sourceIp}
        </span>
        <span className="text-[var(--color-cp-text-tertiary)] shrink-0">&rarr;</span>
        <span className="break-all">{threat.targetName}</span>
        <span className="text-[var(--color-cp-text-tertiary)] shrink-0">:{threat.port}</span>
      </div>
    </div>
  );
}

export default function ThreatFeed() {
  const { recentThreats, isLive, realDataStatus } = useThreatData();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const prevIdsRef = useRef<Set<string>>(new Set());

  // Track which entries are "new" (just appeared)
  useEffect(() => {
    const currentIds = new Set(recentThreats.map(t => t.id));
    const freshIds = new Set<string>();
    
    currentIds.forEach(id => {
      if (!prevIdsRef.current.has(id)) {
        freshIds.add(id);
      }
    });

    if (freshIds.size > 0) {
      setNewIds(freshIds);
      // Clear "new" status after animation completes
      setTimeout(() => {
        setNewIds(new Set());
      }, 1500);
    }

    prevIdsRef.current = currentIds;
  }, [recentThreats]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [recentThreats]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="cp-panel-header">
        <span className="text-label text-[var(--color-cp-text-tertiary)]">Threat Feed</span>
        <div className="flex items-center gap-1.5">
          <div className={`w-1.5 h-1.5 rounded-full ${
            isLive ? 'bg-green-500 animate-live-pulse' 
            : realDataStatus.includes('Cached') || realDataStatus.includes('Fallback') ? 'bg-amber-400'
            : realDataStatus === '' ? 'bg-[var(--color-cp-accent)]'
            : 'bg-neutral-500'
          }`} />
          <span className="text-caption text-[var(--color-cp-text-tertiary)]">
            {isLive ? 'LIVE' 
              : realDataStatus.includes('Cached') || realDataStatus.includes('Fallback') ? 'CACHED'
              : realDataStatus === '' ? 'CONNECTING'
              : 'OFFLINE'}
          </span>
        </div>
      </div>

      {/* Feed entries */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto"
      >
        {recentThreats.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2">
            <div className="w-4 h-4 border border-[var(--color-cp-border)] border-t-[var(--color-cp-accent)] rounded-full animate-spin" />
            <span className="text-caption text-[var(--color-cp-text-tertiary)]">Initializing feed...</span>
          </div>
        ) : (
          recentThreats.map((threat) => (
            <ThreatEntry 
              key={threat.id} 
              threat={threat} 
              isNew={newIds.has(threat.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}
