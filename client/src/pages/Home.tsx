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

export default function Home() {
  return (
    <ThreatProvider>
      <div className="h-screen w-screen flex flex-col overflow-hidden bg-[var(--color-cp-base)]">
        
        {/* HEADER — Minimal, elegant */}
        <HeaderBar />

        {/* MAIN CONTENT — Responsive layout: 3-col on normal screens, 2-col on ultra-wide */}
        <div className="flex-1 flex flex-col gap-[0.75vw] p-[0.75vw] pt-0 overflow-hidden">
          
          {/* TOP ROW: Left sidebar + Globe area (3-col on normal, 2-col on ultra-wide) */}
          <div className="flex-1 flex flex-col xl:flex-row gap-[0.75vw] overflow-hidden">
            
            {/* LEFT SIDEBAR — Compact metrics + MITRE */}
            <div className="w-full xl:w-[12vw] xl:min-w-[160px] xl:max-w-[240px] xl:shrink-0 h-[12vh] xl:h-auto flex xl:flex-col gap-[0.75vw]">
              <div className="cp-panel flex-1 lg:flex-[3] overflow-hidden">
                <StatsPanel />
              </div>
              <div className="cp-panel flex-1 lg:flex-[4] overflow-hidden">
                <MitreHeatmap />
              </div>
            </div>

            {/* CENTER — Globe (hero) + Time Series + Bottom panels */}
            <div className="flex-1 flex flex-col gap-[0.75vw] overflow-hidden">
              {/* Globe — dominant visual, dark bg for contrast */}
              <div className="flex-[5] cp-panel relative overflow-hidden" style={{ background: 'oklch(0.12 0.04 255)' }}>
                <ThreatGlobe />
              </div>
              {/* Time Series — subtle, integrated */}
              <div className="h-[5.5vh] min-h-[70px] cp-panel shrink-0 overflow-hidden">
                <TimeSeriesChart />
              </div>
              {/* Bottom row: Spotlight + Briefing */}
              <div className="flex-[2] flex gap-[0.75vw] overflow-hidden">
                <div className="flex-1 cp-panel overflow-hidden">
                  <ThreatSpotlight />
                </div>
                <div className="flex-1 cp-panel overflow-hidden">
                  <WeeklyBriefing />
                </div>
              </div>
            </div>

            {/* RIGHT SIDEBAR — Port Activity + Threat Feed (hidden on ultra-wide, shown on normal screens) */}
            <div className="hidden xl:flex w-[14vw] min-w-[200px] max-w-[300px] shrink-0 flex-col gap-[0.75vw]">
              <div className="cp-panel flex-[2] overflow-hidden">
                <PortHeatmap />
              </div>
              <div className="cp-panel flex-[5] overflow-hidden">
                <ThreatFeed />
              </div>
            </div>
          </div>

          {/* BOTTOM ROW: Port Activity + Threat Feed (shown on ultra-wide displays) */}
          <div className="flex xl:hidden gap-[0.75vw] h-[16vh] overflow-hidden">
            <div className="flex-1 cp-panel overflow-hidden">
              <PortHeatmap />
            </div>
            <div className="flex-1 cp-panel overflow-hidden">
              <ThreatFeed />
            </div>
          </div>

        </div>
      </div>
    </ThreatProvider>
  );
}
