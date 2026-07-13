/**
 * HeaderBar — Auburn University branded header with Hollywood effects
 * 
 * Design: Clean horizontal bar with 3 zones:
 *   Left: Auburn logo + BASY branding (prominent)
 *   Center: Key metrics with NumberMorph animation
 *   Right: Data source status + timestamp + sound toggle
 */
import { useThreatData } from '@/contexts/ThreatContext';
import { useEffect, useState } from 'react';
import { BRANDING } from '@/lib/branding';
import { Link } from 'wouter';
import { NumberMorph } from '@/components/TextScramble';
import { useSoundEngine } from '@/components/SoundEngine';

export default function HeaderBar() {
  const { stats, isLive, realDataStatus } = useThreatData();
  const [time, setTime] = useState(new Date());
  const { enabled: soundEnabled, setEnabled: setSoundEnabled } = useSoundEngine();

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
    <header className="h-[clamp(3.5rem,4vh,6rem)] shrink-0 flex items-center justify-between px-[clamp(1rem,1.5vw,3rem)] bg-[var(--color-cp-elevated)] border-b border-[var(--color-cp-border)] shadow-sm relative z-20">
      
      {/* Left: Auburn Logo + BASY Branding — PROMINENT */}
      <div className="flex items-center gap-5">
        {/* Institution Logo — larger and more visible */}
        <div className="flex items-center gap-3 px-2 py-1.5 bg-white/95 rounded-md">
          <img 
            src={BRANDING.logoUrl} 
            alt={BRANDING.logoAlt} 
            className="h-[clamp(2.5rem,3vh,5rem)] w-auto object-contain"
          />
        </div>
        <div className="w-px h-9 bg-[var(--color-cp-border)]" />
        <div className="flex flex-col">
          <h1 className="text-[clamp(15px,1vw,30px)] font-bold text-[var(--color-cp-text-primary)] tracking-[0.15em] leading-tight">
            {BRANDING.institutionName}
          </h1>
          <span className="text-[clamp(11px,0.7vw,22px)] font-semibold tracking-[0.2em] text-[var(--color-cp-accent)] leading-tight mt-0.5">
            {BRANDING.subtitle}
          </span>
        </div>
      </div>

      {/* Center: Key metrics with NumberMorph — 3 max */}
      <div className="flex items-center gap-8">
        <div className="flex flex-col items-center">
          <span className="font-data text-[clamp(14px,0.9vw,28px)] font-light text-[var(--color-cp-text-primary)]">
            <NumberMorph value={stats.total} duration={1.5} />
          </span>
          <span className="text-label text-[var(--color-cp-text-tertiary)]" style={{ fontSize: 'clamp(8px, 0.5vw, 16px)' }}>THREATS</span>
        </div>
        <div className="w-px h-5 bg-[var(--color-cp-border)]" />
        <div className="flex flex-col items-center">
          <span className="font-data text-[clamp(14px,0.9vw,28px)] font-light text-[var(--color-cp-accent)]">
            <NumberMorph value={stats.critical} duration={1.0} />
          </span>
          <span className="text-label text-[var(--color-cp-text-tertiary)]" style={{ fontSize: 'clamp(8px, 0.5vw, 16px)' }}>CRITICAL</span>
        </div>
        <div className="w-px h-5 bg-[var(--color-cp-border)]" />
        <div className="flex flex-col items-center">
          <span className="font-data text-[clamp(14px,0.9vw,28px)] font-light text-[var(--color-cp-text-primary)]">
            <NumberMorph value={stats.attacksPerMinute || 0} duration={1.2} />
          </span>
          <span className="text-label text-[var(--color-cp-text-tertiary)]" style={{ fontSize: 'clamp(8px, 0.5vw, 16px)' }}>ATK/MIN</span>
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

      {/* Right: Status + Time + Sound Toggle */}
      <div className="flex items-center gap-4">
        {/* Sound toggle */}
        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          className={`flex items-center gap-1 px-2 py-1 rounded text-caption transition-all cursor-pointer ${
            soundEnabled 
              ? 'bg-[var(--color-cp-accent)]/10 text-[var(--color-cp-accent)] border border-[var(--color-cp-accent)]/30' 
              : 'text-[var(--color-cp-text-tertiary)] border border-[var(--color-cp-border)] hover:border-[var(--color-cp-accent)]/30'
          }`}
          title={soundEnabled ? 'Mute audio' : 'Enable audio'}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {soundEnabled ? (
              <>
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              </>
            ) : (
              <>
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <line x1="23" y1="9" x2="17" y2="15" />
                <line x1="17" y1="9" x2="23" y2="15" />
              </>
            )}
          </svg>
          <span className="hidden sm:inline">{soundEnabled ? 'ON' : 'OFF'}</span>
        </button>

        <div className="w-px h-5 bg-[var(--color-cp-border)]" />
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
