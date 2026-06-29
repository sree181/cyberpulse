/**
 * CyberPulse — Immersive Threat Intelligence Display
 * 
 * REDESIGN: Museum-quality data immersion
 * 
 * Layout hierarchy:
 *   PRIMARY: Globe (hero, ~55% of viewport) — the centerpiece
 *   SECONDARY: Metrics bar + Threat feed — glanceable context
 *   TERTIARY: Bottom panels (Spotlight + Briefing) — for those who stop
 * 
 * Design principles:
 *   - 60-30-10 color rule (base/surface/accent)
 *   - Whitespace as a design element
 *   - Restrained animations — purposeful, not decorative
 *   - 4-level typography scale only
 * 
 * Kiosk Mode:
 *   PASSIVE: Globe fills viewport, minimal UI chrome, auto-rotating
 *   INTERACTIVE: Full dashboard with all panels visible
 */
import { useState } from 'react';
import { ThreatProvider } from '@/contexts/ThreatContext';
import { KioskProvider, useKiosk } from '@/contexts/KioskContext';
import { useSoundFeedback } from '@/hooks/useSoundFeedback';
import { useTimelinePersistence } from '@/hooks/useTimelinePersistence';
import HeaderBar from '@/components/HeaderBar';
import ThreatGlobe from '@/components/ThreatGlobe';
import ThreatFeed from '@/components/ThreatFeed';
import StatsPanel from '@/components/StatsPanel';
import MitreHeatmap from '@/components/MitreHeatmap';
import TimeSeriesChart from '@/components/TimeSeriesChart';
import PortHeatmap from '@/components/PortHeatmap';
import ThreatSpotlight from '@/components/ThreatSpotlight';
import WeeklyBriefing from '@/components/WeeklyBriefing';
import CompareMode from '@/components/CompareMode';
import ParticleField from '@/components/ParticleField';
import ImpactRipples from '@/components/ImpactRipples';
import { useCinematicTransitions } from '@/hooks/useCinematicTransitions';
import { useDataSonification } from '@/hooks/useDataSonification';
import { soundEngine } from '@/lib/soundEngine';

export default function Home() {
  return (
    <ThreatProvider>
      <KioskProvider>
        <HomeContent />
      </KioskProvider>
    </ThreatProvider>
  );
}

function HomeContent() {
  const { mode, isTransitioning } = useKiosk();
  const [showCompare, setShowCompare] = useState(false);
  const isPassive = mode === 'passive';

  // Sound effects and haptic feedback
  useSoundFeedback();

  // Persist threat events for 24h timeline replay
  useTimelinePersistence();

  // Cinematic transitions (dolly zoom + spring physics)
  const { dollyActive, dollyScale } = useCinematicTransitions();

  // Data sonification layer (pitch-shifted pings per attack)
  useDataSonification(soundEngine.isEnabled());

  return (
    <div className={`h-screen w-screen flex flex-col overflow-hidden bg-[var(--color-cp-base)] transition-all duration-500 ${isTransitioning ? 'opacity-80' : 'opacity-100'}`}>
      
      {/* Particle Field Background — neural mesh behind all panels */}
      <ParticleField />

      {/* HEADER — Hidden in passive mode */}
      <div className={`transition-all duration-500 ${isPassive ? 'h-0 opacity-0 overflow-hidden' : 'h-16 opacity-100'}`}>
        <HeaderBar />
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex gap-3 p-3 pt-0 overflow-hidden">
        
        {/* LEFT SIDEBAR — Hidden in passive mode */}
        <div className={`shrink-0 flex flex-col gap-3 transition-all duration-500 ${
          isPassive ? 'w-0 opacity-0 overflow-hidden' : 'w-[220px] opacity-100'
        }`}>
          <div className="cp-panel flex-[3] spring-lift">
            <StatsPanel />
          </div>
          <div className="cp-panel flex-[4] spring-lift">
            <MitreHeatmap />
          </div>
        </div>

        {/* CENTER — Globe (hero) + Time Series */}
        <div className="flex-1 flex flex-col gap-3 overflow-hidden">
          {/* Globe — dominant visual, dark bg for contrast */}
          <div className={`cp-panel relative overflow-hidden transition-all duration-500 ${
            isPassive ? 'flex-1' : 'flex-[5]'
          } ${dollyActive ? 'dolly-zoom-active' : ''}`} style={{ 
            background: 'oklch(0.12 0.04 255)',
            transform: dollyActive ? `scale(${dollyScale})` : 'scale(1)',
          }}>
            <ThreatGlobe />
            {/* Impact ripples — sonar pings at attack target locations */}
            <ImpactRipples />
            {/* Compare Mode overlay — rendered inside globe panel for full coverage */}
            <CompareMode isVisible={showCompare} onClose={() => setShowCompare(false)} />
            
            {/* Passive mode branding overlay */}
            {isPassive && (
              <div className="absolute top-4 left-4 z-10 animate-in fade-in duration-500">
                <div className="text-[11px] font-bold text-[var(--color-cp-text-primary)] tracking-[0.15em] opacity-60">
                  CYBERPULSE
                </div>
                <div className="text-[8px] text-[var(--color-cp-accent)] tracking-[0.2em] opacity-40 mt-0.5">
                  REAL-TIME THREAT INTELLIGENCE
                </div>
              </div>
            )}
          </div>
          
          {/* Time Series — hidden in passive mode */}
          <div className={`cp-panel shrink-0 overflow-hidden transition-all duration-500 ${
            isPassive ? 'h-0 opacity-0' : 'h-[90px] opacity-100'
          }`}>
            <TimeSeriesChart />
          </div>
          
          {/* Bottom row: Spotlight + Briefing — hidden in passive mode */}
          <div className={`flex gap-3 overflow-hidden transition-all duration-500 ${
            isPassive ? 'flex-[0] h-0 opacity-0' : 'flex-[2] opacity-100'
          }`}>
            <div className="flex-1 cp-panel overflow-hidden spring-lift">
              <ThreatSpotlight />
            </div>
            <div className="flex-1 cp-panel overflow-hidden spring-lift">
              <WeeklyBriefing />
            </div>
          </div>
        </div>

        {/* RIGHT SIDEBAR — Hidden in passive mode */}
        <div className={`shrink-0 flex flex-col gap-3 transition-all duration-500 ${
          isPassive ? 'w-0 opacity-0 overflow-hidden' : 'w-[260px] opacity-100'
        }`}>
          <div className="cp-panel flex-[2] overflow-hidden spring-lift">
            <PortHeatmap />
          </div>
          <div className="cp-panel flex-[5] overflow-hidden spring-lift">
            <ThreatFeed />
          </div>
          {/* Compare Mode trigger button */}
          <button
            onClick={() => setShowCompare(true)}
            className="cp-panel px-3 py-2 flex items-center justify-center gap-2 hover:border-[var(--color-cp-accent)] transition-colors cursor-pointer shrink-0"
          >
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
              <span className="text-[9px] text-[var(--color-cp-text-tertiary)]">vs</span>
              <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            </div>
            <span className="text-caption font-data text-[var(--color-cp-text-secondary)]">
              Compare Mode
            </span>
          </button>
        </div>

      </div>
    </div>
  );
}
