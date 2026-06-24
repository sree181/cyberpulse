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

        {/* MAIN CONTENT — 3-column with generous spacing */}
        <div className="flex-1 flex gap-3 p-3 pt-0 overflow-hidden">
          
          {/* LEFT SIDEBAR — Compact metrics + MITRE */}
          <div className="w-[220px] shrink-0 flex flex-col gap-3">
            <div className="cp-panel flex-[3]">
              <StatsPanel />
            </div>
            <div className="cp-panel flex-[4]">
              <MitreHeatmap />
            </div>
          </div>

          {/* CENTER — Globe (hero) + Time Series */}
          <div className="flex-1 flex flex-col gap-3 overflow-hidden">
            {/* Globe — dominant visual, dark bg for contrast */}
            <div className="flex-[5] cp-panel relative overflow-hidden" style={{ background: 'oklch(0.12 0.04 255)' }}>
              <ThreatGlobe />
            </div>
            {/* Time Series — subtle, integrated */}
            <div className="h-[90px] cp-panel shrink-0 overflow-hidden">
              <TimeSeriesChart />
            </div>
            {/* Bottom row: Spotlight + Briefing */}
            <div className="flex-[2] flex gap-3 overflow-hidden">
              <div className="flex-1 cp-panel overflow-hidden">
                <ThreatSpotlight />
              </div>
              <div className="flex-1 cp-panel overflow-hidden">
                <WeeklyBriefing />
              </div>
            </div>
          </div>

          {/* RIGHT SIDEBAR — Port Activity + Threat Feed */}
          <div className="w-[260px] shrink-0 flex flex-col gap-3">
            <div className="cp-panel flex-[2] overflow-hidden">
              <PortHeatmap />
            </div>
            <div className="cp-panel flex-[5] overflow-hidden">
              <ThreatFeed />
            </div>
          </div>

        </div>
      </div>
    </ThreatProvider>
  );
}
