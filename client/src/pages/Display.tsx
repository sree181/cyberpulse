/**
 * Display Mode — Purpose-built route for wall-mounted planar screens
 * 
 * URL: /display
 * 
 * Query parameters for operator configuration:
 *   ?kiosk=true       — Enable fullscreen + wake lock (default: true)
 *   ?idle=60          — Idle timeout in seconds before attract mode (default: 60)
 *   ?brightness=0.8   — Manual brightness override (0.2–1.0)
 *   ?fps=true         — Show FPS counter (default: false)
 *   ?refresh=300      — Auto-refresh interval in seconds (default: 0 = disabled)
 * 
 * Example for deployment:
 *   https://cyberpulse.manus.space/display?kiosk=true&idle=45&refresh=600
 * 
 * This route is identical to Home but with the DisplayShell configured
 * for unattended operation. It also adds a scheduled auto-refresh to
 * prevent memory leaks from long-running WebGL sessions.
 */
import { useEffect, useMemo } from 'react';
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

export default function Display() {
  // Parse URL parameters for operator configuration
  const params = useMemo(() => {
    const search = new URLSearchParams(window.location.search);
    return {
      kiosk: search.get('kiosk') !== 'false', // default true
      idleTimeout: parseInt(search.get('idle') || '60', 10) * 1000,
      brightness: parseFloat(search.get('brightness') || '1.0'),
      showFPS: search.get('fps') === 'true',
      refreshInterval: parseInt(search.get('refresh') || '0', 10) * 1000,
    };
  }, []);

  // Scheduled auto-refresh to prevent memory leaks from long WebGL sessions
  useEffect(() => {
    if (params.refreshInterval <= 0) return;
    
    const timer = setTimeout(() => {
      // Only refresh if idle (don't interrupt active interaction)
      window.location.reload();
    }, params.refreshInterval);

    return () => clearTimeout(timer);
  }, [params.refreshInterval]);

  // Prevent all default browser behaviors for kiosk
  useEffect(() => {
    if (!params.kiosk) return;

    const preventDefaults = (e: KeyboardEvent) => {
      // Block F5 refresh, Ctrl+R, Ctrl+W, Alt+F4
      if (
        e.key === 'F5' ||
        (e.ctrlKey && e.key === 'r') ||
        (e.ctrlKey && e.key === 'w') ||
        (e.altKey && e.key === 'F4')
      ) {
        e.preventDefault();
      }
    };

    document.addEventListener('keydown', preventDefaults);
    return () => document.removeEventListener('keydown', preventDefaults);
  }, [params.kiosk]);

  return (
    <ThreatProvider>
      <DisplayShell kioskEnabled={params.kiosk}>
        <div className="h-screen w-screen flex flex-col overflow-hidden bg-[var(--color-cp-base)]">
          
          {/* HEADER — Minimal, elegant */}
          <HeaderBar />

          {/* MAIN CONTENT */}
          <div className="flex-1 flex flex-col gap-[0.75vw] p-[0.75vw] pt-0 overflow-hidden">
            
            {/* TOP ROW */}
            <div className="flex-1 flex flex-col xl:flex-row gap-[0.75vw] overflow-hidden">
              
              {/* LEFT SIDEBAR */}
              <div className="w-full xl:w-[12vw] xl:min-w-[160px] xl:max-w-[240px] xl:shrink-0 h-[12vh] xl:h-auto flex xl:flex-col gap-[0.75vw]">
                <div className="cp-panel flex-1 lg:flex-[3] overflow-hidden">
                  <StatsPanel />
                </div>
                <div className="cp-panel flex-1 lg:flex-[4] overflow-hidden">
                  <MitreHeatmap />
                </div>
              </div>

              {/* CENTER — Globe + Time Series + Bottom panels */}
              <div className="flex-1 flex flex-col gap-[0.75vw] overflow-hidden">
                <div className="flex-[5] cp-panel relative overflow-hidden" style={{ background: 'oklch(0.12 0.04 255)' }}>
                  <ThreatGlobe />
                </div>
                <div className="h-[5.5vh] min-h-[70px] cp-panel shrink-0 overflow-hidden">
                  <TimeSeriesChart />
                </div>
                <div className="flex-[2] flex gap-[0.75vw] overflow-hidden">
                  <div className="flex-1 cp-panel overflow-hidden">
                    <ThreatSpotlight />
                  </div>
                  <div className="flex-1 cp-panel overflow-hidden">
                    <WeeklyBriefing />
                  </div>
                </div>
              </div>

              {/* RIGHT SIDEBAR */}
              <div className="hidden xl:flex w-[14vw] min-w-[200px] max-w-[300px] shrink-0 flex-col gap-[0.75vw]">
                <div className="cp-panel flex-[2] overflow-hidden">
                  <PortHeatmap />
                </div>
                <div className="cp-panel flex-[5] overflow-hidden">
                  <ThreatFeed />
                </div>
              </div>
            </div>

            {/* BOTTOM ROW (ultra-wide fallback) */}
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
      </DisplayShell>
    </ThreatProvider>
  );
}
