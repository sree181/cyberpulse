/**
 * HeaderBar — Auburn University branded header
 * 
 * Design: Clean horizontal bar with 3 zones:
 *   Left: Auburn logo + BASY branding (prominent)
 *   Center: Key metrics (3 max)
 *   Right: Data source status + timestamp
 */
import { useThreatData } from '@/contexts/ThreatContext';
import { useEffect, useState } from 'react';
import { BRANDING } from '@/lib/branding';
import { Link } from 'wouter';

export default function HeaderBar() {
  const { stats, isLive, realDataStatus } = useThreatData();
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Status logic
  const statusLabel = isLive 
    ? 'LIVE' 
    : realDataStatus.includes('Cached') || realDataStatus.includes('Fallback') 
      ? 'CACHED' 
      : realDataStatus === '' 
        ? 'CONNECTING' 
        : 'OFFLINE';
  const statusColor = isLive 
    ? 'bg-green-500' 
    : realDataStatus.includes('Cached') || realDataStatus.includes('Fallback')
      ? 'bg-amber-400' 
      : realDataStatus === ''
        ? 'bg-[var(--color-cp-accent)]'
        : 'bg-neutral-500';

  return (
    <header className="h-16 shrink-0 flex items-center justify-between px-6 bg-white border-b border-[var(--color-cp-border)] shadow-sm">
      
      {/* Left: Auburn Logo + BASY Branding — PROMINENT */}
      <div className="flex items-center gap-5">
        {/* Institution Logo — larger and more visible */}
        <div className="flex items-center gap-3 px-2 py-1">
          <img 
            src={BRANDING.logoUrl} 
            alt={BRANDING.logoAlt} 
            className="h-11 w-auto object-contain"
          />
        </div>
        <div className="w-px h-9 bg-[var(--color-cp-border)]" />
        <div className="flex flex-col">
          <h1 className="text-[15px] font-bold text-[var(--color-cp-text-primary)] tracking-[0.15em] leading-tight">
            {BRANDING.institutionName}
          </h1>
          <span className="text-[11px] font-semibold tracking-[0.2em] text-[var(--color-cp-accent)] leading-tight mt-0.5">
            {BRANDING.subtitle}
          </span>
        </div>
      </div>

      {/* Center: Key metrics — 3 max */}
      <div className="flex items-center gap-8">
        <div className="flex flex-col items-center">
          <span className="font-data text-[14px] font-light text-[var(--color-cp-text-primary)] tabular-nums">{stats.total}</span>
          <span className="text-label text-[var(--color-cp-text-tertiary)]" style={{ fontSize: '8px' }}>THREATS</span>
        </div>
        <div className="w-px h-5 bg-[var(--color-cp-border)]" />
        <div className="flex flex-col items-center">
          <span className="font-data text-[14px] font-light text-[var(--color-cp-accent)] tabular-nums">{stats.critical}</span>
          <span className="text-label text-[var(--color-cp-text-tertiary)]" style={{ fontSize: '8px' }}>CRITICAL</span>
        </div>
        <div className="w-px h-5 bg-[var(--color-cp-border)]" />
        <div className="flex flex-col items-center">
          <span className="font-data text-[14px] font-light text-[var(--color-cp-text-primary)] tabular-nums">{stats.attacksPerMinute}</span>
          <span className="text-label text-[var(--color-cp-text-tertiary)]" style={{ fontSize: '8px' }}>ATK/MIN</span>
        </div>
        <div className="w-px h-5 bg-[var(--color-cp-border)]" />
        {/* AI Insights link */}
        <Link href="/ai" className="flex items-center gap-1.5 group">
          <div className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-live-pulse" />
          <span className="text-label text-[var(--color-cp-text-tertiary)] group-hover:text-violet-400 transition-colors" style={{ fontSize: '8px' }}>
            AI MODELS
          </span>
        </Link>
      </div>

      {/* Right: Status + Time */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <div className={`w-1.5 h-1.5 rounded-full ${statusColor} ${isLive ? 'animate-live-pulse' : ''}`} />
          <span className="text-caption text-[var(--color-cp-text-tertiary)]">{statusLabel}</span>
        </div>
        <div className="w-px h-5 bg-[var(--color-cp-border)]" />
        <time className="font-data text-body text-[var(--color-cp-text-secondary)] tabular-nums">
          {time.toLocaleTimeString('en-US', { hour12: false, timeZone: 'UTC' })}
          <span className="text-[var(--color-cp-text-tertiary)] ml-1 text-caption">UTC</span>
        </time>
      </div>
    </header>
  );
}
