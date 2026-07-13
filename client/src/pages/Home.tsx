/**
 * CyberPulse — Hollywood-Grade Threat Intelligence Command Center
 * 
 * VISUAL UPGRADE: Cinematic post-processing, reactive particles,
 * animated FUI borders, GSAP text effects, and spatial audio.
 * 
 * Layout hierarchy:
 *   PRIMARY: Globe (hero, ~55% of viewport) — the centerpiece
 *   SECONDARY: Metrics bar + Threat feed — glanceable context
 *   TERTIARY: Bottom panels (Spotlight + Briefing) — for those who stop
 * 
 * Hollywood effects layered (back to front):
 *   z[1]  — Particle network (ambient background)
 *   z[5]  — HUD rotating rings (decorative)
 *   z[10] — Dashboard panels (content)
 *   z[97] — Film grain (texture)
 *   z[98] — Scanlines (retro-futurism)
 *   z[99] — Vignette (focus)
 */
import { ThreatProvider } from '@/contexts/ThreatContext';
import HeaderBar from '@/components/HeaderBar';
import ThreatGlobe from '@/components/ThreatGlobe';
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

export default function Home() {
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
              
              {/* TOP ROW: Left sidebar + Globe area */}
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

                {/* CENTER — Globe (hero) + Time Series + Bottom panels */}
                <div className="flex-1 flex flex-col gap-[0.75vw] overflow-hidden">
                  {/* Globe — dominant visual with HUD rings */}
                  <FuiPanel className="flex-[5] overflow-hidden" delay={0} cornerSize={14} glowColor="var(--color-cp-accent)">
                    <div className="cp-panel relative h-full" style={{ background: 'oklch(0.12 0.04 255)' }}>
                      <HudRings />
                      <ThreatGlobe />
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

              {/* BOTTOM ROW: Port Activity + Threat Feed (shown on ultra-wide displays) */}
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
