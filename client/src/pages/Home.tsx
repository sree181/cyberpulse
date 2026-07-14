/**
 * CyberPulse — Hollywood-Grade Threat Intelligence Command Center
 * 
 * Optimized for Planar DirectLight Pro video walls:
 *   - Left wall:  8192 × 2160 (~3.8:1)
 *   - Right wall: 3840 × 2160 (16:9)
 * 
 * Layout strategy for ultra-wide walls:
 *   The globe is HEIGHT-constrained (stays circular) and centered.
 *   Side panels fill the remaining horizontal space proportionally.
 *   Bottom strip uses the full width for time series + secondary panels.
 *
 * Effects layered (back to front):
 *   z[1]  — Particle network (ambient background)
 *   z[10] — Dashboard panels (content)
 *   z[97] — Film grain (texture)
 *   z[98] — Scanlines (retro-futurism)
 *   z[99] — Vignette (focus)
 */
import { useState } from 'react';
import { ThreatProvider } from '@/contexts/ThreatContext';
import HeaderBar from '@/components/HeaderBar';
import ThreatGlobe from '@/components/ThreatGlobe';
import ThreatFlatMap from '@/components/ThreatFlatMap';
import ThreatFeed from '@/components/ThreatFeed';
import StatsPanel from '@/components/StatsPanel';
import MitreHeatmap from '@/components/MitreHeatmap';
import TimeSeriesChart from '@/components/TimeSeriesChart';
import PortHeatmap from '@/components/PortHeatmap';
import ThreatSpotlight from '@/components/ThreatSpotlight';
import WeeklyBriefing from '@/components/WeeklyBriefing';
import DisplayShell from '@/components/DisplayShell';
import { CinematicOverlay, HudRings } from '@/components/CinematicOverlay';
import ParticleNetwork from '@/components/ParticleNetwork';
import { SoundEngineProvider } from '@/components/SoundEngine';
import FuiPanel from '@/components/FuiPanel';
import CollapsiblePanel from '@/components/CollapsiblePanel';
import { TopSourceCountries, TopTargetCountries } from '@/components/TopCountries';
import AttackLocationMap from '@/components/AttackLocationMap';

type ViewMode = 'globe' | 'map';

export default function Home() {
  const [viewMode, setViewMode] = useState<ViewMode>('globe');

  return (
    <ThreatProvider>
      <SoundEngineProvider>
        <DisplayShell kioskEnabled={true}>
          <div className="h-screen w-screen flex flex-col overflow-hidden bg-[var(--color-cp-base)] relative">
            
            {/* ═══ HOLLYWOOD LAYER: Particle Network Background ═══ */}
            <ParticleNetwork />

            {/* ═══ HOLLYWOOD LAYER: Cinematic Post-Processing ═══ */}
            <CinematicOverlay />

            {/* HEADER — Minimal, elegant */}
            <div className="relative z-10 shrink-0">
              <HeaderBar />
            </div>

            {/* MAIN CONTENT — Full-width, height-driven layout for video walls */}
            <div className="flex-1 flex flex-col gap-[0.4vw] p-[0.5vw] pt-0 overflow-hidden relative z-10 w-full">
              
              {/* PRIMARY ROW: Left panels + Globe (height-constrained) + Right panels */}
              <div className="flex-[7] flex gap-[0.4vw] overflow-hidden min-h-0">
                
                {/* LEFT COLUMN — Analytics + MITRE */}
                <div className="w-[20%] min-w-[220px] max-w-[640px] shrink-0 flex flex-col gap-[0.4vw] overflow-visible">
                  <FuiPanel className="flex-[3] overflow-hidden" delay={0.2} cornerSize={8}>
                    <CollapsiblePanel title="Analytics">
                      <div className="cp-panel h-full">
                        <StatsPanel />
                      </div>
                    </CollapsiblePanel>
                  </FuiPanel>
                  <FuiPanel className="flex-[5] overflow-hidden" delay={0.5} cornerSize={8}>
                    <CollapsiblePanel title="MITRE ATT&CK">
                      <div className="cp-panel h-full">
                        <MitreHeatmap />
                      </div>
                    </CollapsiblePanel>
                  </FuiPanel>
                </div>

                {/* CENTER — Globe/Map (hero) — Three.js sphere always renders circular
                    regardless of container aspect ratio. On ultra-wide walls (32:9),
                    the globe fills the height and the extra width shows starfield. */}
                <div className="flex-1 relative overflow-hidden min-h-0">
                  <FuiPanel className="h-full" delay={0} cornerSize={14} glowColor="var(--color-cp-accent)">
                    <div className="cp-panel relative h-full w-full" style={{ background: 'oklch(0.12 0.04 255)' }}>
                      {viewMode === 'globe' && <HudRings />}
                      {/* Render active view */}
                      {viewMode === 'globe' ? <ThreatGlobe /> : <ThreatFlatMap />}
                    </div>
                  </FuiPanel>

                  {/* Top Sources — floating overlay on left side of globe */}
                  <div className="absolute top-4 left-4 z-20 w-[clamp(180px,12vw,320px)] bg-[var(--color-cp-base)]/85 backdrop-blur-sm border border-[var(--color-cp-border)] rounded-lg pointer-events-none">
                    <TopSourceCountries />
                  </div>

                  {/* Top Targets — floating overlay on right side of globe */}
                  <div className="absolute top-4 right-4 z-20 w-[clamp(180px,12vw,320px)] bg-[var(--color-cp-base)]/85 backdrop-blur-sm border border-[var(--color-cp-border)] rounded-lg pointer-events-none">
                    <TopTargetCountries />
                  </div>

                  {/* View Toggle — BOTTOM CENTER, touch-friendly, OUTSIDE globe to avoid Three.js event capture */}
                  <ViewToggle viewMode={viewMode} onChange={setViewMode} />
                </div>

                {/* RIGHT COLUMN — Port Activity + Threat Feed */}
                <div className="w-[20%] min-w-[220px] max-w-[640px] shrink-0 flex flex-col gap-[0.4vw] overflow-visible">
                  <FuiPanel className="flex-[3] overflow-hidden" delay={0.3} cornerSize={8}>
                    <CollapsiblePanel title="Port Activity">
                      <div className="cp-panel h-full">
                        <PortHeatmap />
                      </div>
                    </CollapsiblePanel>
                  </FuiPanel>
                  <FuiPanel className="flex-[5] overflow-hidden" delay={0.6} cornerSize={8}>
                    <CollapsiblePanel title="Threat Feed">
                      <div className="cp-panel h-full">
                        <ThreatFeed />
                      </div>
                    </CollapsiblePanel>
                  </FuiPanel>
                </div>
              </div>

              {/* SECONDARY ROW: Time Series + Attack Location Map + CVE Spotlight + Weekly Briefing */}
              <div className="flex-[2] flex gap-[0.4vw] overflow-hidden min-h-[80px]">
                {/* Time Series — spans a portion of the width */}
                <div className="flex-[2] cp-panel overflow-hidden">
                  <TimeSeriesChart />
                </div>
                {/* Attack Location Map — auto-cycling Google Map */}
                <FuiPanel className="flex-[2] overflow-hidden" delay={0.7} cornerSize={8}>
                  <div className="cp-panel h-full">
                    <AttackLocationMap />
                  </div>
                </FuiPanel>
                {/* CVE Spotlight */}
                <FuiPanel className="flex-[3] overflow-hidden" delay={0.8} cornerSize={8}>
                  <CollapsiblePanel title="CVE Spotlight">
                    <div className="cp-panel h-full">
                      <ThreatSpotlight />
                    </div>
                  </CollapsiblePanel>
                </FuiPanel>
                {/* Weekly Briefing */}
                <FuiPanel className="flex-[3] overflow-hidden" delay={1.0} cornerSize={8}>
                  <CollapsiblePanel title="Weekly Briefing">
                    <div className="cp-panel h-full">
                      <WeeklyBriefing />
                    </div>
                  </CollapsiblePanel>
                </FuiPanel>
              </div>

            </div>
          </div>
        </DisplayShell>
      </SoundEngineProvider>
    </ThreatProvider>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// VIEW TOGGLE — Switch between Globe (3D) and Map (2D)
// ═══════════════════════════════════════════════════════════════════════════════

function ViewToggle({ viewMode, onChange }: { viewMode: ViewMode; onChange: (mode: ViewMode) => void }) {
  const handleClick = (mode: ViewMode, e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onChange(mode);
  };

  return (
    <div 
      className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[50] flex items-center gap-2 bg-[var(--color-cp-surface)]/85 backdrop-blur-md rounded-lg p-1 border border-white/[0.08] shadow-lg"
      onPointerDown={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
    >
      <button
        onClick={(e) => handleClick('globe', e)}
        onTouchEnd={(e) => handleClick('globe', e)}
        onPointerDown={(e) => e.stopPropagation()}
        className={`flex items-center gap-2 px-5 py-3 rounded-md text-sm font-data font-medium transition-all duration-200 cursor-pointer touch-manipulation min-h-[48px] ${
          viewMode === 'globe'
            ? 'bg-[var(--color-cp-accent)]/20 text-[var(--color-cp-accent)] shadow-md'
            : 'text-[var(--color-cp-text-tertiary)] hover:text-[var(--color-cp-text-secondary)] active:bg-white/[0.05]'
        }`}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
          <path d="M2 12h20" />
        </svg>
        Globe
      </button>
      <button
        onClick={(e) => handleClick('map', e)}
        onTouchEnd={(e) => handleClick('map', e)}
        onPointerDown={(e) => e.stopPropagation()}
        className={`flex items-center gap-2 px-5 py-3 rounded-md text-sm font-data font-medium transition-all duration-200 cursor-pointer touch-manipulation min-h-[48px] ${
          viewMode === 'map'
            ? 'bg-[var(--color-cp-accent)]/20 text-[var(--color-cp-accent)] shadow-md'
            : 'text-[var(--color-cp-text-tertiary)] hover:text-[var(--color-cp-text-secondary)] active:bg-white/[0.05]'
        }`}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
          <line x1="8" y1="2" x2="8" y2="18" />
          <line x1="16" y1="6" x2="16" y2="22" />
        </svg>
        Map
      </button>
    </div>
  );
}
