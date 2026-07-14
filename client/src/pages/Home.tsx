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
 *
 * DRAG-AND-DROP: Panels within each zone (left, right, bottom) can be
 * reordered via touch drag. Order persists in localStorage.
 */
import { useState, useMemo, ReactNode } from 'react';
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
import { Link } from 'wouter';
import { SortableZone, SortablePanel } from '@/components/SortableZone';
import { usePanelOrder, ZoneConfig } from '@/hooks/usePanelOrder';

type ViewMode = 'globe' | 'map';

// ═══════════════════════════════════════════════════════════════════════════════
// ZONE CONFIGURATION — defines which panels belong to which zone
// ═══════════════════════════════════════════════════════════════════════════════

const ZONE_CONFIGS: ZoneConfig[] = [
  { id: 'left', defaultOrder: ['analytics', 'mitre'] },
  { id: 'right', defaultOrder: ['port-activity', 'threat-feed'] },
  { id: 'bottom', defaultOrder: ['timeseries', 'attack-map', 'cve-spotlight', 'weekly-briefing'] },
];

// Panel registry — maps panel IDs to their flex ratios and content
interface PanelDef {
  flex: number;
  delay: number;
  title?: string;
  collapsible?: boolean;
}

const LEFT_PANELS: Record<string, PanelDef> = {
  'analytics': { flex: 3, delay: 0.2, title: 'Analytics', collapsible: true },
  'mitre': { flex: 5, delay: 0.5, title: 'MITRE ATT&CK', collapsible: true },
};

const RIGHT_PANELS: Record<string, PanelDef> = {
  'port-activity': { flex: 3, delay: 0.3, title: 'Port Activity', collapsible: true },
  'threat-feed': { flex: 5, delay: 0.6, title: 'Threat Feed', collapsible: true },
};

const BOTTOM_PANELS: Record<string, PanelDef> = {
  'timeseries': { flex: 2, delay: 0.4 },
  'attack-map': { flex: 2, delay: 0.7 },
  'cve-spotlight': { flex: 3, delay: 0.8, title: 'CVE Spotlight', collapsible: true },
  'weekly-briefing': { flex: 3, delay: 1.0, title: 'Weekly Briefing', collapsible: true },
};

// ═══════════════════════════════════════════════════════════════════════════════
// PANEL CONTENT RENDERER — returns the inner content for each panel ID
// ═══════════════════════════════════════════════════════════════════════════════

function PanelContent({ id }: { id: string }) {
  switch (id) {
    case 'analytics': return <StatsPanel />;
    case 'mitre': return <MitreHeatmap />;
    case 'port-activity': return <PortHeatmap />;
    case 'threat-feed': return <ThreatFeed />;
    case 'timeseries': return <TimeSeriesChart />;
    case 'attack-map': return <AttackLocationMap />;
    case 'cve-spotlight': return <ThreatSpotlight />;
    case 'weekly-briefing': return <WeeklyBriefing />;
    default: return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function Home() {
  const [viewMode, setViewMode] = useState<ViewMode>('globe');
  const { order, reorder, isLocked } = usePanelOrder(ZONE_CONFIGS);

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
                
                {/* LEFT COLUMN — Sortable zone */}
                <SortableZone
                  zoneId="left"
                  items={order['left']}
                  direction="vertical"
                  onReorder={reorder}
                  isLocked={isLocked}
                  className="w-[20%] min-w-[220px] max-w-[640px] shrink-0 flex flex-col gap-[0.4vw] overflow-hidden"
                >
                  {(orderedIds) => (
                    <>
                      {orderedIds.map(id => {
                        const def = LEFT_PANELS[id];
                        if (!def) return null;
                        return (
                          <SortablePanel key={id} id={id} className="overflow-hidden" style={{ flex: def.flex }} isLocked={isLocked}>
                            <FuiPanel className="h-full overflow-hidden" delay={def.delay} cornerSize={8}>
                              {def.collapsible ? (
                                <CollapsiblePanel title={def.title!}>
                                  <div className="cp-panel h-full">
                                    <PanelContent id={id} />
                                  </div>
                                </CollapsiblePanel>
                              ) : (
                                <div className="cp-panel h-full">
                                  <PanelContent id={id} />
                                </div>
                              )}
                            </FuiPanel>
                          </SortablePanel>
                        );
                      })}
                    </>
                  )}
                </SortableZone>

                {/* CENTER — Globe/Map (hero) */}
                <div className="flex-1 relative overflow-hidden min-h-0">
                  <FuiPanel className="h-full" delay={0} cornerSize={14} glowColor="var(--color-cp-accent)">
                    <div className="cp-panel relative h-full w-full" style={{ background: 'oklch(0.12 0.04 255)' }}>
                      {viewMode === 'globe' && <HudRings />}
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

                  {/* View Toggle — BOTTOM CENTER */}
                  <ViewToggle viewMode={viewMode} onChange={setViewMode} />

                  {/* Edit Mode Toggle — bottom left */}
                  <div
                    className={`absolute bottom-4 left-[clamp(16px,1.5vw,40px)] z-[50] flex items-center gap-[clamp(6px,0.4vw,10px)] backdrop-blur-md rounded-lg px-[clamp(12px,0.8vw,20px)] py-[clamp(8px,0.5vw,14px)] border shadow-lg cursor-pointer touch-manipulation min-h-[48px] transition-all duration-200 ${
                      isLocked
                        ? 'bg-gray-500/15 border-gray-500/30 hover:bg-gray-500/25'
                        : 'bg-cyan-500/20 border-cyan-400/50 hover:bg-cyan-500/30'
                    }`}
                    onClick={() => window.dispatchEvent(new CustomEvent('cyberpulse:toggle-layout-lock'))}
                    onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); window.dispatchEvent(new CustomEvent('cyberpulse:toggle-layout-lock')); }}
                    onPointerDown={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    <span className="text-[clamp(14px,0.9vw,22px)]">{isLocked ? '\uD83D\uDD12' : '\uD83D\uDD13'}</span>
                    <span className={`font-data font-medium text-[clamp(12px,0.8vw,20px)] tracking-wide ${
                      isLocked ? 'text-gray-400' : 'text-cyan-300'
                    }`}>
                      {isLocked ? 'LOCKED' : 'EDIT MODE'}
                    </span>
                    {!isLocked && <div className="w-[clamp(8px,0.5vw,12px)] h-[clamp(8px,0.5vw,12px)] rounded-full bg-cyan-400 animate-live-pulse" />}
                  </div>

                  {/* AI Models — bottom right */}
                  <Link href="/ai">
                    <div
                      className="absolute bottom-4 right-[clamp(16px,1.5vw,40px)] z-[50] flex items-center gap-[clamp(6px,0.4vw,10px)] bg-violet-500/15 backdrop-blur-md rounded-lg px-[clamp(12px,0.8vw,20px)] py-[clamp(8px,0.5vw,14px)] border border-violet-500/30 shadow-lg cursor-pointer touch-manipulation min-h-[48px] hover:bg-violet-500/25 transition-all duration-200"
                      onTouchEnd={(e) => { e.stopPropagation(); }}
                      onPointerDown={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                    >
                      <div className="w-[clamp(8px,0.5vw,12px)] h-[clamp(8px,0.5vw,12px)] rounded-full bg-violet-500 animate-live-pulse" />
                      <span className="font-data font-medium text-[clamp(12px,0.8vw,20px)] text-violet-300 tracking-wide">
                        AI MODELS
                      </span>
                    </div>
                  </Link>
                </div>

                {/* RIGHT COLUMN — Sortable zone */}
                <SortableZone
                  zoneId="right"
                  items={order['right']}
                  direction="vertical"
                  onReorder={reorder}
                  isLocked={isLocked}
                  className="w-[20%] min-w-[220px] max-w-[640px] shrink-0 flex flex-col gap-[0.4vw] overflow-hidden"
                >
                  {(orderedIds) => (
                    <>
                      {orderedIds.map(id => {
                        const def = RIGHT_PANELS[id];
                        if (!def) return null;
                        return (
                          <SortablePanel key={id} id={id} className="overflow-hidden" style={{ flex: def.flex }} isLocked={isLocked}>
                            <FuiPanel className="h-full overflow-hidden" delay={def.delay} cornerSize={8}>
                              {def.collapsible ? (
                                <CollapsiblePanel title={def.title!}>
                                  <div className="cp-panel h-full">
                                    <PanelContent id={id} />
                                  </div>
                                </CollapsiblePanel>
                              ) : (
                                <div className="cp-panel h-full">
                                  <PanelContent id={id} />
                                </div>
                              )}
                            </FuiPanel>
                          </SortablePanel>
                        );
                      })}
                    </>
                  )}
                </SortableZone>
              </div>

              {/* SECONDARY ROW — Sortable zone (horizontal) */}
              <SortableZone
                zoneId="bottom"
                items={order['bottom']}
                direction="horizontal"
                onReorder={reorder}
                isLocked={isLocked}
                className="flex-[2] flex gap-[0.4vw] overflow-hidden min-h-[80px]"
              >
                {(orderedIds) => (
                  <>
                    {orderedIds.map(id => {
                      const def = BOTTOM_PANELS[id];
                      if (!def) return null;
                      return (
                        <SortablePanel key={id} id={id} className="overflow-hidden" style={{ flex: def.flex }} direction="horizontal" isLocked={isLocked}>
                          {def.collapsible ? (
                            <FuiPanel className="h-full overflow-hidden" delay={def.delay} cornerSize={8}>
                              <CollapsiblePanel title={def.title!}>
                                <div className="cp-panel h-full">
                                  <PanelContent id={id} />
                                </div>
                              </CollapsiblePanel>
                            </FuiPanel>
                          ) : id === 'timeseries' ? (
                            <div className="cp-panel h-full overflow-hidden">
                              <PanelContent id={id} />
                            </div>
                          ) : (
                            <FuiPanel className="h-full overflow-hidden" delay={def.delay} cornerSize={8}>
                              <div className="cp-panel h-full">
                                <PanelContent id={id} />
                              </div>
                            </FuiPanel>
                          )}
                        </SortablePanel>
                      );
                    })}
                  </>
                )}
              </SortableZone>

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
