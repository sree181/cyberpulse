/**
 * CyberPulse — Hollywood-Grade Threat Intelligence Command Center
 * 
 * Layout hierarchy:
 *   PRIMARY: Globe/Map (hero, ~55% of viewport) — toggleable between 3D globe and 2D flat map
 *   SECONDARY: Metrics bar + Threat feed — glanceable context
 *   TERTIARY: Bottom panels (Spotlight + Briefing) — for those who stop
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
import TopCountries from '@/components/TopCountries';
import { useUltraWide } from '@/hooks/useUltraWide';

type ViewMode = 'globe' | 'map';

export default function Home() {
  const [viewMode, setViewMode] = useState<ViewMode>('globe');
  const isUltraWide = useUltraWide();

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
            <div className="relative z-10">
              <HeaderBar />
            </div>

            {/* MAIN CONTENT — Responsive layout with max-width to prevent ultra-wide stretching */}
            <div className="flex-1 flex flex-col gap-[0.75vw] p-[0.75vw] pt-0 overflow-hidden relative z-10 max-w-[3200px] mx-auto w-full">
              
              {/* TOP ROW: Left sidebar + Globe/Map area */}
              <div className="flex-1 flex flex-col xl:flex-row gap-[0.75vw] overflow-hidden">
                
                {/* LEFT SIDEBAR — Compact metrics + MITRE (fixed width, no stretching) */}
                <div className="w-full xl:w-[220px] 2xl:w-[260px] xl:shrink-0 h-[12vh] xl:h-auto flex xl:flex-col gap-[0.75vw]">
                  <FuiPanel className="flex-1 lg:flex-[3] overflow-hidden" delay={0.2} cornerSize={8}>
                    <CollapsiblePanel title="Analytics">
                      <div className="cp-panel h-full">
                        <StatsPanel />
                      </div>
                    </CollapsiblePanel>
                  </FuiPanel>
                  <FuiPanel className="flex-1 lg:flex-[4] overflow-hidden" delay={0.5} cornerSize={8}>
                    <CollapsiblePanel title="MITRE ATT&CK">
                      <div className="cp-panel h-full">
                        <MitreHeatmap />
                      </div>
                    </CollapsiblePanel>
                  </FuiPanel>
                  <FuiPanel className="flex-1 lg:flex-[3] overflow-hidden" delay={0.7} cornerSize={8}>
                    <CollapsiblePanel title="Top Countries">
                      <div className="cp-panel h-full">
                        <TopCountries />
                      </div>
                    </CollapsiblePanel>
                  </FuiPanel>
                </div>

                {/* CENTER — Globe/Map (hero) + Time Series + Bottom panels */}
                <div className="flex-1 flex flex-col gap-[0.75vw] overflow-hidden">
                  {/* Globe/Map — dominant visual with toggle */}
                  <div className="relative flex-[7] overflow-hidden min-h-[200px]">
                    <FuiPanel className="h-full" delay={0} cornerSize={14} glowColor="var(--color-cp-accent)">
                      <div className="cp-panel relative h-full" style={{ background: 'oklch(0.12 0.04 255)' }}>
                        {viewMode === 'globe' && <HudRings />}
                        
                        {/* Render active view */}
                        {viewMode === 'globe' ? <ThreatGlobe /> : <ThreatFlatMap />}
                      </div>
                    </FuiPanel>
                    {/* View Toggle — OUTSIDE the globe container to avoid Three.js event capture */}
                    <ViewToggle viewMode={viewMode} onChange={setViewMode} />
                  </div>
                  {/* Time Series — subtle, integrated (hidden on ultra-wide to save vertical space) */}
                  {!isUltraWide && (
                    <div className="h-[4vh] min-h-[40px] max-h-[80px] cp-panel shrink-0 overflow-hidden">
                      <TimeSeriesChart />
                    </div>
                  )}
                  {/* Bottom row: Spotlight + Briefing (auto-collapsed on ultra-wide) */}
                  <div className={`${isUltraWide ? 'flex-[1]' : 'flex-[2]'} min-h-[80px] flex gap-[0.75vw] overflow-hidden`}>
                    <FuiPanel className="flex-1 overflow-hidden" delay={0.8} cornerSize={8}>
                      <CollapsiblePanel title="CVE Spotlight" defaultCollapsed={isUltraWide}>
                        <div className="cp-panel h-full">
                          <ThreatSpotlight />
                        </div>
                      </CollapsiblePanel>
                    </FuiPanel>
                    <FuiPanel className="flex-1 overflow-hidden" delay={1.0} cornerSize={8}>
                      <CollapsiblePanel title="Weekly Briefing" defaultCollapsed={isUltraWide}>
                        <div className="cp-panel h-full">
                          <WeeklyBriefing />
                        </div>
                      </CollapsiblePanel>
                    </FuiPanel>
                  </div>
                </div>

                {/* RIGHT SIDEBAR — Port Activity + Threat Feed (fixed width, no stretching) */}
                <div className="hidden xl:flex w-[240px] 2xl:w-[280px] shrink-0 flex-col gap-[0.75vw]">
                  <FuiPanel className="flex-[2] overflow-hidden" delay={0.3} cornerSize={8}>
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

              {/* BOTTOM ROW: Port Activity + Threat Feed (shown on smaller screens) */}
              <div className="flex xl:hidden gap-[0.75vw] h-[14vh] min-h-[100px] overflow-hidden">
                <FuiPanel className="flex-1 overflow-hidden" delay={0.4} cornerSize={8}>
                  <CollapsiblePanel title="Port Activity">
                    <div className="cp-panel h-full">
                      <PortHeatmap />
                    </div>
                  </CollapsiblePanel>
                </FuiPanel>
                <FuiPanel className="flex-1 overflow-hidden" delay={0.7} cornerSize={8}>
                  <CollapsiblePanel title="Threat Feed">
                    <div className="cp-panel h-full">
                      <ThreatFeed />
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
  const handleClick = (mode: ViewMode, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onChange(mode);
  };

  return (
    <div 
      className="absolute top-3 left-4 z-[50] flex items-center gap-1 bg-[var(--color-cp-surface)]/80 backdrop-blur-sm rounded-md p-0.5 border border-white/[0.06]"
      onPointerDown={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <button
        onClick={(e) => handleClick('globe', e)}
        onPointerDown={(e) => e.stopPropagation()}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-data font-medium transition-all duration-200 cursor-pointer ${
          viewMode === 'globe'
            ? 'bg-[var(--color-cp-accent)]/15 text-[var(--color-cp-accent)] shadow-sm'
            : 'text-[var(--color-cp-text-tertiary)] hover:text-[var(--color-cp-text-secondary)]'
        }`}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
          <path d="M2 12h20" />
        </svg>
        Globe
      </button>
      <button
        onClick={(e) => handleClick('map', e)}
        onPointerDown={(e) => e.stopPropagation()}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-data font-medium transition-all duration-200 cursor-pointer ${
          viewMode === 'map'
            ? 'bg-[var(--color-cp-accent)]/15 text-[var(--color-cp-accent)] shadow-sm'
            : 'text-[var(--color-cp-text-tertiary)] hover:text-[var(--color-cp-text-secondary)]'
        }`}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
          <line x1="8" y1="2" x2="8" y2="18" />
          <line x1="16" y1="6" x2="16" y2="22" />
        </svg>
        Map
      </button>
    </div>
  );
}
