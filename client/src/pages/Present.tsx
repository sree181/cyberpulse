/**
 * Present — Full-Screen Presentation Mode (/present)
 * 
 * Designed for TV/projector setups in hallways, lobbies, and conference rooms.
 * Launches directly into passive kiosk mode with:
 *   - Globe fills entire viewport (no header, no sidebars)
 *   - Minimal branding overlay (institution name + CYBERPULSE)
 *   - Auto-rotating globe with live attack arcs
 *   - Subtle ambient data: threat count, attack rate, top source
 *   - Touch/click to temporarily show full dashboard (returns to passive after 30s)
 *   - No navigation chrome — designed for unattended display
 * 
 * URL: /present
 * Query params:
 *   ?sound=off — disable audio cues (default: on)
 *   ?brand=minimal — show only logo, no text
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { ThreatProvider, useThreatData } from '@/contexts/ThreatContext';
import { KioskProvider } from '@/contexts/KioskContext';
import ThreatGlobe from '@/components/ThreatGlobe';
import { useSoundFeedback } from '@/hooks/useSoundFeedback';
import { useTimelinePersistence } from '@/hooks/useTimelinePersistence';
import { soundEngine } from '@/lib/soundEngine';
import { BRANDING } from '@/lib/branding';

export default function Present() {
  // Parse URL params
  const params = new URLSearchParams(window.location.search);
  const soundOff = params.get('sound') === 'off';
  const brandMinimal = params.get('brand') === 'minimal';

  // Disable sound if param says so
  useEffect(() => {
    if (soundOff) {
      soundEngine.setEnabled(false);
    }
  }, [soundOff]);

  return (
    <ThreatProvider>
      <KioskProvider>
        <PresentContent brandMinimal={brandMinimal} />
      </KioskProvider>
    </ThreatProvider>
  );
}

function PresentContent({ brandMinimal }: { brandMinimal: boolean }) {
  const { stats, isLive } = useThreatData();
  const [showOverlay, setShowOverlay] = useState(false);
  const overlayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [cursorVisible, setCursorVisible] = useState(false);
  const cursorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sound and persistence hooks
  useSoundFeedback();
  useTimelinePersistence();

  // Hide cursor after 3s of inactivity
  const handleMouseMove = useCallback(() => {
    setCursorVisible(true);
    if (cursorTimerRef.current) clearTimeout(cursorTimerRef.current);
    cursorTimerRef.current = setTimeout(() => setCursorVisible(false), 3000);
  }, []);

  // Show overlay on click, auto-hide after 30s
  const handleInteraction = useCallback(() => {
    setShowOverlay(true);
    if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current);
    overlayTimerRef.current = setTimeout(() => setShowOverlay(false), 30000);
  }, []);

  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current);
      if (cursorTimerRef.current) clearTimeout(cursorTimerRef.current);
    };
  }, [handleMouseMove]);

  // Enter fullscreen on mount (if supported)
  useEffect(() => {
    const enterFullscreen = async () => {
      try {
        if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
          await document.documentElement.requestFullscreen();
        }
      } catch {
        // Fullscreen not available or denied — continue normally
      }
    };
    // Delay slightly to allow user gesture
    const timer = setTimeout(enterFullscreen, 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div 
      className={`h-screen w-screen overflow-hidden bg-[var(--color-cp-base)] relative ${cursorVisible ? '' : 'cursor-none'}`}
      onClick={handleInteraction}
      onTouchStart={handleInteraction}
      onMouseMove={handleMouseMove}
    >
      {/* Globe fills entire viewport */}
      <div className="absolute inset-0" style={{ background: 'oklch(0.12 0.04 255)' }}>
        <ThreatGlobe />
      </div>

      {/* Branding overlay — top left */}
      <div className="absolute top-6 left-6 z-20 pointer-events-none">
        <div className="flex items-center gap-4">
          {/* Logo */}
          <div className="bg-white/90 rounded-lg p-2 shadow-lg">
            <img 
              src={BRANDING.logoUrl} 
              alt={BRANDING.logoAlt} 
              className="h-12 w-auto object-contain"
            />
          </div>
          {/* Text branding (unless minimal mode) */}
          {!brandMinimal && (
            <div className="flex flex-col">
              <h1 className="text-[18px] font-bold text-white tracking-[0.15em] leading-tight drop-shadow-lg">
                {BRANDING.institutionName}
              </h1>
              <span className="text-[12px] font-semibold tracking-[0.2em] text-[var(--color-cp-accent)] leading-tight mt-0.5 drop-shadow-md">
                {BRANDING.subtitle}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Ambient stats — bottom left */}
      <div className={`absolute bottom-6 left-6 z-20 pointer-events-none transition-opacity duration-500 ${showOverlay ? 'opacity-0' : 'opacity-100'}`}>
        <div className="bg-[var(--color-cp-surface)]/80 backdrop-blur-md border border-[var(--color-cp-border)] rounded-lg px-5 py-3">
          <div className="flex items-center gap-6">
            <div className="flex flex-col items-center">
              <span className="font-data text-[20px] font-light text-[var(--color-cp-text-primary)] tabular-nums">
                {stats.total}
              </span>
              <span className="text-[9px] text-[var(--color-cp-text-tertiary)] tracking-wider">THREATS</span>
            </div>
            <div className="w-px h-8 bg-[var(--color-cp-border)]" />
            <div className="flex flex-col items-center">
              <span className="font-data text-[20px] font-light text-[var(--color-cp-accent)] tabular-nums">
                {stats.critical}
              </span>
              <span className="text-[9px] text-[var(--color-cp-text-tertiary)] tracking-wider">CRITICAL</span>
            </div>
            <div className="w-px h-8 bg-[var(--color-cp-border)]" />
            <div className="flex flex-col items-center">
              <span className="font-data text-[20px] font-light text-[var(--color-cp-text-primary)] tabular-nums">
                {stats.attacksPerMinute}
              </span>
              <span className="text-[9px] text-[var(--color-cp-text-tertiary)] tracking-wider">ATK/MIN</span>
            </div>
          </div>
        </div>
      </div>

      {/* Live indicator — top right */}
      <div className="absolute top-6 right-6 z-20 pointer-events-none">
        <div className="flex items-center gap-2 bg-[var(--color-cp-surface)]/60 backdrop-blur-sm border border-[var(--color-cp-border)] rounded-full px-3 py-1.5">
          <div className={`w-2 h-2 rounded-full ${isLive ? 'bg-green-500 animate-live-pulse' : 'bg-amber-400'}`} />
          <span className="text-[10px] font-data text-[var(--color-cp-text-secondary)] tracking-wider">
            {isLive ? 'LIVE' : 'CACHED'}
          </span>
        </div>
      </div>

      {/* Time — bottom right */}
      <div className="absolute bottom-6 right-6 z-20 pointer-events-none">
        <PresentClock />
      </div>

      {/* Interaction hint — center bottom (fades after first interaction) */}
      {!showOverlay && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20 pointer-events-none animate-pulse">
          <span className="text-[10px] font-data text-[var(--color-cp-text-tertiary)] opacity-40 tracking-wider">
            TOUCH TO INTERACT
          </span>
        </div>
      )}

      {/* Full overlay info panel — shown on interaction, auto-hides */}
      {showOverlay && (
        <div className="absolute inset-x-0 bottom-0 z-30 animate-in slide-in-from-bottom duration-500">
          <div className="bg-gradient-to-t from-[var(--color-cp-base)] via-[var(--color-cp-base)]/90 to-transparent pt-16 pb-6 px-8">
            <div className="max-w-4xl mx-auto">
              <div className="grid grid-cols-4 gap-4">
                <StatCard label="Total Threats" value={stats.total} />
                <StatCard label="Critical" value={stats.critical} accent />
                <StatCard label="Top Source" value={stats.topCountry} />
                <StatCard label="Top Vector" value={stats.topAttackType} />
              </div>
              <div className="mt-3 text-center">
                <span className="text-[9px] font-data text-[var(--color-cp-text-tertiary)] opacity-50">
                  Auto-hiding in 30s • Touch anywhere to dismiss
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PresentClock() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-[var(--color-cp-surface)]/60 backdrop-blur-sm border border-[var(--color-cp-border)] rounded-lg px-4 py-2">
      <time className="font-data text-[16px] text-[var(--color-cp-text-secondary)] tabular-nums">
        {time.toLocaleTimeString('en-US', { hour12: false, timeZone: 'UTC' })}
        <span className="text-[var(--color-cp-text-tertiary)] ml-1 text-[10px]">UTC</span>
      </time>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div className="bg-[var(--color-cp-surface)]/80 backdrop-blur-sm border border-[var(--color-cp-border)] rounded-lg px-4 py-3 text-center">
      <div className={`font-data text-[18px] font-light tabular-nums ${accent ? 'text-[var(--color-cp-accent)]' : 'text-[var(--color-cp-text-primary)]'}`}>
        {value}
      </div>
      <div className="text-[8px] text-[var(--color-cp-text-tertiary)] tracking-wider mt-0.5">
        {label.toUpperCase()}
      </div>
    </div>
  );
}
