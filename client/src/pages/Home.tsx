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
            <div className="relative z-10">
              <HeaderBar />
            </div>

            {/* MAIN CONTENT — Responsive layout */}
            <div className="flex-1 flex flex-col gap-[0.75vw] p-[0.75vw] pt-0 overflow-hidden relative z-10">
              
              {/* TOP ROW: Left sidebar + Globe/Map area */}
              <div className="flex-1 flex flex-col xl:flex-row gap-[0.75vw] overflow-hidden">
                
                {/* LEFT SIDEBAR — Compact metrics + MITRE */}
                <div className="w-full xl:w-[12vw] xl:min-w-[160px] xl:max-w-[240px] xl:shrink-0 h-[12vh] xl:h-auto flex xl:flex-col gap-[0.75vw]">
                  <FuiPanel className="flex-1 lg:flex-[3] overflow-hidden" delay={0.2} cornerSize={8}>
                    <div className="cp-panel h-full">
                      <StatsPanel />
                    </div>
                  </FuiPanel>
                  <FuiPanel className="flex-1 lg:flex-[4] overflow-hidden" delay={0.5} cornerSize={8}>
                    <div className="cp-panel h-full">
                      <MitreHeatmap />
                    </div>
                  </FuiPanel>
                </div>

                {/* CENTER — Globe/Map (hero) + Time Series + Bottom panels */}
                <div className="flex-1 flex flex-col gap-[0.75vw] overflow-hidden">
                  {/* Globe/Map — dominant visual with toggle */}
                  <FuiPanel className="flex-[5] overflow-hidden" delay={0} cornerSize={14} glowColor="var(--color-cp-accent)">
                    <div className="cp-panel relative h-full" style={{ background: 'oklch(0.12 0.04 255)' }}>
                      {viewMode === 'globe' && <HudRings />}
                      
                      {/* View Toggle Button */}
                      <ViewToggle viewMode={viewMode} onChange={setViewMode} />

                      {/* Render active view */}
                      {viewMode === 'globe' ? <ThreatGlobe /> : <ThreatFlatMap />}
                    </div>
                  </FuiPanel>
                  {/* Time Series — subtle, integrated */}
                  <div className="h-[5.5vh] min-h-[70px] cp-panel shrink-0 overflow-hidden">
                    <TimeSeriesChart />
                  </div>
                  {/* Bottom row: Spotlight + Briefing */}
                  <div className="flex-[2] flex gap-[0.75vw] overflow-hidden">
                    <FuiPanel className="flex-1 overflow-hidden" delay={0.8} cornerSize={8}>
                      <div className="cp-panel h-full">
                        <ThreatSpotlight />
                      </div>
                    </FuiPanel>
                    <FuiPanel className="flex-1 overflow-hidden" delay={1.0} cornerSize={8}>
                      <div className="cp-panel h-full">
                        <WeeklyBriefing />
                      </div>
                    </FuiPanel>
                  </div>
                </div>

                {/* RIGHT SIDEBAR — Port Activity + Threat Feed */}
                <div className="hidden xl:flex w-[14vw] min-w-[200px] max-w-[300px] shrink-0 flex-col gap-[0.75vw]">
                  <FuiPanel className="flex-[2] overflow-hidden" delay={0.3} cornerSize={8}>
                    <div className="cp-panel h-full">
                      <PortHeatmap />
                    </div>
                  </FuiPanel>
                  <FuiPanel className="flex-[5] overflow-hidden" delay={0.6} cornerSize={8}>
                    <div className="cp-panel h-full">
                      <ThreatFeed />
                    </div>
                  </FuiPanel>
                </div>
              </div>

              {/* BOTTOM ROW: Port Activity + Threat Feed (shown on smaller screens) */}
              <div className="flex xl:hidden gap-[0.75vw] h-[16vh] overflow-hidden">
                <FuiPanel className="flex-1 overflow-hidden" delay={0.4} cornerSize={8}>
                  <div className="cp-panel h-full">
                    <PortHeatmap />
                  </div>
                </FuiPanel>
                <FuiPanel className="flex-1 overflow-hidden" delay={0.7} cornerSize={8}>
                  <div className="cp-panel h-full">
                    <ThreatFeed />
                  </div>
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
  return (
    <div className="absolute top-3 left-4 z-20 flex items-center gap-1 bg-[var(--color-cp-surface)]/80 backdrop-blur-sm rounded-md p-0.5 border border-white/[0.06]">
      <button
        onClick={() => onChange('globe')}
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
        onClick={() => onChange('map')}
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
