/**
 * CyberPulse — Immersive Threat Intelligence Command Center
 * 
 * DESIGN: Dark Ops Command Center
 * Full-bleed, edge-to-edge layout with no visible chrome.
 * Globe dominates the center, flanked by data panels.
 * Thin 1px cyan grid lines separate zones, evoking a HUD overlay.
 * Designed for passive hallway observation — auto-rotating, auto-scrolling.
 */
import { ThreatProvider } from '@/contexts/ThreatContext';
import HeaderBar from '@/components/HeaderBar';
import ThreatGlobe from '@/components/ThreatGlobe';
import NetworkTopology from '@/components/NetworkTopology';
import ThreatFeed from '@/components/ThreatFeed';
import StatsPanel from '@/components/StatsPanel';
import MitreHeatmap from '@/components/MitreHeatmap';
import AttackTypeChart from '@/components/AttackTypeChart';
import GeoSourceChart from '@/components/GeoSourceChart';
import Heartbeat from '@/components/Heartbeat';
import TimeSeriesChart from '@/components/TimeSeriesChart';
import PortHeatmap from '@/components/PortHeatmap';
import ThreatSpotlight from '@/components/ThreatSpotlight';

export default function Home() {
  return (
    <ThreatProvider>
      <div className="h-screen w-screen flex flex-col overflow-hidden bg-[#050510] relative">
        {/* Animated grid background */}
        <div 
          className="absolute inset-0 pointer-events-none opacity-[0.02] z-0"
          style={{
            backgroundImage: `
              linear-gradient(rgba(0,240,255,0.4) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0,240,255,0.4) 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px',
            animation: 'grid-scroll 25s linear infinite',
          }}
        />

        {/* Header */}
        <HeaderBar />

        {/* Main content area — 3-column layout */}
        <div className="flex-1 flex relative z-10 overflow-hidden">
          
          {/* LEFT PANEL — Stats + Attack Types + Geo Sources */}
          <div className="w-[20%] min-w-[240px] flex flex-col border-r border-[#00F0FF]/10 bg-[#050510]/80">
            <div className="flex-[3] overflow-hidden">
              <StatsPanel />
            </div>
            <div className="border-t border-[#00F0FF]/10 flex-[2] overflow-hidden">
              <AttackTypeChart />
            </div>
            <div className="border-t border-[#00F0FF]/10 flex-[2] overflow-hidden">
              <GeoSourceChart />
            </div>
          </div>

          {/* CENTER — Globe (top) + Time Series + Bottom Row (Network + Spotlight) */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Globe — primary visual */}
            <div className="flex-[6] relative overflow-hidden">
              <ThreatGlobe />
            </div>
            {/* Time Series Chart */}
            <div className="h-[100px] border-t border-[#00F0FF]/10 relative overflow-hidden shrink-0">
              <TimeSeriesChart />
            </div>
            {/* Bottom row: Network Topology + Threat Spotlight side by side */}
            <div className="flex-[3] border-t border-[#00F0FF]/10 flex overflow-hidden">
              {/* Network Topology — left half */}
              <div className="flex-1 relative overflow-hidden">
                <NetworkTopology />
              </div>
              {/* Threat Spotlight — right half */}
              <div className="flex-1 border-l border-[#00F0FF]/10 relative overflow-hidden bg-[#050510]/60">
                <ThreatSpotlight />
              </div>
            </div>
          </div>

          {/* RIGHT PANEL — MITRE Heatmap + Port Heatmap + Threat Feed */}
          <div className="w-[20%] min-w-[240px] flex flex-col border-l border-[#00F0FF]/10 bg-[#050510]/80">
            <div className="flex-[2] overflow-hidden">
              <MitreHeatmap />
            </div>
            <div className="border-t border-[#00F0FF]/10 flex-[1.5] overflow-hidden">
              <PortHeatmap />
            </div>
            <div className="border-t border-[#00F0FF]/10 flex-[3] overflow-hidden">
              <ThreatFeed />
            </div>
          </div>
        </div>

        {/* Bottom heartbeat bar */}
        <div className="h-7 border-t border-[#00F0FF]/15 bg-[#050510]/90 relative z-10 shrink-0">
          <Heartbeat />
        </div>
      </div>
    </ThreatProvider>
  );
}
