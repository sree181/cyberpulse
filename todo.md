# Project TODO

- [x] Basic command center layout with 3-zone design
- [x] 3D Globe with animated attack arcs
- [x] Network topology 3D force graph
- [x] Live threat feed panel
- [x] MITRE ATT&CK heatmap
- [x] Stats panel with severity distribution
- [x] Attack vectors chart
- [x] Geo source chart
- [x] Heartbeat waveform
- [x] Header bar with system status
- [x] Connect real threat intelligence data (DShield/ISC SANS API)
- [x] Add IP geolocation enrichment for real attack data
- [x] Build backend API proxy for threat data
- [x] Make visualization significantly more visually stunning and heavy
- [x] Add time-series sparkline/chart for attack volume over time
- [x] Add more dramatic visual effects (pulsing impacts, denser arcs, faster refresh)
- [x] Add protocol/port activity heatmap panel
- [x] Increase data density - more simultaneous arcs and events
- [x] Increase real data integration - use DShield attacker data for more threat events (>70% real-sourced)
- [x] Add protocol dimension to port heatmap (TCP/UDP breakdown)
- [x] Show fallback/cached indicator in UI when live API is unavailable
- [x] Add "Threat of the Day" spotlight panel with real CVE data
- [x] Build backend endpoint to fetch CVE data from free API (NVD/CISA KEV)
- [x] Design cinematic spotlight component with auto-rotation
- [x] Integrate spotlight panel into the main command center layout
- [x] Add educational descriptions with CVSS score, affected systems, and MITRE mapping
- [x] Add "Weekly Threat Briefing" summary panel with aggregated weekly trends
- [x] Build backend endpoint to compute weekly threat statistics and trends
- [x] Design rotating infographic slides (top vectors, geo trends, severity breakdown, key takeaway)
- [x] Integrate the briefing panel into the main command center layout
- [x] Add smooth slide transitions and auto-rotation for passive viewing
- [x] Add error/cached/empty UI states to WeeklyBriefing for API failures
- [x] Add severity breakdown slide to Weekly Briefing
- [x] UI/UX Redesign: Audit current visual issues (cognitive overload, competing elements, inconsistent hierarchy)
- [x] UI/UX Redesign: Establish new design system (restrained color palette, typography scale, spacing tokens)
- [x] UI/UX Redesign: Simplify layout grid — reduce panel count, increase whitespace, clear visual hierarchy
- [x] UI/UX Redesign: Redesign Header — minimal, elegant, less cluttered
- [x] UI/UX Redesign: Redesign Globe panel — cleaner, less visual noise
- [x] UI/UX Redesign: Redesign Stats/Analytics panels — unified card system, less competing colors
- [x] UI/UX Redesign: Redesign Threat Feed — cleaner typography, less color noise
- [x] UI/UX Redesign: Redesign MITRE Heatmap — subtler, integrated
- [x] UI/UX Redesign: Redesign Port Activity panel — cohesive with new system
- [x] UI/UX Redesign: Redesign bottom panels (Topology, Spotlight, Briefing) — unified treatment
- [x] UI/UX Redesign: Polish transitions, micro-interactions, and final cohesion
- [x] Fix status display logic — show LIVE/CACHED correctly based on API response timing
- [x] Ensure all panels handle loading/empty states gracefully and consistently
- [x] Add university logo placeholder in the header
- [x] Make primary accent color configurable via CSS custom property or env variable
- [x] Add branding configuration section for easy school customization (Auburn University applied)
- [x] Globe: Make arcs directional (gradient opacity from source to target, projectile-style dash animation)
- [x] Globe: Color-code arcs by attack type (5-color palette with legend)
- [x] Globe: Hybrid zoom — auto-zoom on critical attacks every 30s + click-to-zoom on arcs
- [x] Globe: Inactivity timeout (15s) returns to overview after zoom interaction
- [x] Globe: Zoomed-in map detail view showing attack location on Google Maps panel
- [x] Globe: Redesign arcs with sophisticated cinematic rendering (smooth glowing trails, proper visual weight, museum-quality)
- [x] AI Model: Vulnerability Priority Scoring — LLM-powered risk ranking (CVSS + exploitation + ransomware + CWE)
- [x] AI Model: LLM Threat Narrative Generator — contextual analyst prose replacing static briefing text
- [x] AI Model: Attack-to-CVE Linkage — connects live attack patterns to specific exploited CVEs
- [x] Design professional frontend panels for all three AI models
- [x] Integrate AI panels into the main dashboard layout with cohesive design
- [x] Add tRPC endpoints for all three AI model services
- [x] Fix broken Auburn University logo in header
- [x] Make Auburn University and BASY label more prominent in header
- [x] Change dashboard background to lighter colors

## Wall Display Fixes (Ultra-Wide / Large Planar Screen)

- [x] Fix 1: Layout warping — adjusted responsive grid for ultra-wide (32:9, 48:9) aspect ratios
- [x] Fix 2: Small fonts — increased minimum font sizes and improved readability for distance viewing
- [x] Fix 3: Touch events — enabled pointer events and touch-action support for wall displays

## Live Data Fix (July 2026)

- [x] Diagnose "cached results not live" issue — DShield/ISC SANS API blocked by Cloudflare
- [x] Replace DShield API with blocklist.de (real-time attacker IPs by service category)
- [x] Replace ipapi.co geolocation with ip-api.com batch endpoint (100 IPs per request)
- [x] Update weekly briefing API to use blocklist.de instead of blocked DShield endpoints
- [x] Update UI labels from "DShield/ISC" to "blocklist.de"
- [x] All 18 tests passing with new data sources

## Display Engineering — Large Touch-Mounted Planar Screen (July 2026)

- [x] Kiosk Mode: Fullscreen API with auto-enter, F11 fallback, browser-chrome hiding
- [x] Screensaver Prevention: Wake Lock API + invisible video fallback for older browsers
- [x] Auto-Recovery: Error boundary with automatic page reload on crash (exponential backoff)
- [x] Touch Gestures: Swipe navigation between panels, pinch-to-zoom on globe, long-press for details
- [x] Attract Mode: Enhanced animations when idle >60s (larger arcs, faster rotation, dramatic zoom sweeps)
- [x] Ambient Awareness: Time-of-day brightness adaptation (dimmer at night for hallway comfort)
- [x] Operator Panel: Hidden admin overlay (triple-tap corner) for display management, refresh, diagnostics
- [x] Connection Resilience: Auto-reconnect with visual indicator, stale data detection, graceful degradation
- [x] Performance Monitor: FPS counter, memory usage, auto-quality reduction if dropping below 30fps
- [x] Touch Feedback: Ripple effects, haptic-style visual feedback on touch interactions

## Hollywood Visualization Upgrade (July 2026)

- [x] Cinematic Post-Processing: Vignette, film grain canvas, scanlines, chromatic aberration (CSS + Canvas)
- [x] GSAP Text Scramble: Threat feed entries decode from hex characters
- [x] GSAP Text Scramble: IP addresses resolve with scramble effect
- [x] GSAP NumberMorph: Header metrics animate between values with rolling digit effect
- [x] tsParticles: Reactive particle network background behind globe
- [x] tsParticles: Particle color/density responds to threat level (blue→amber→red)
- [x] FUI Panel Borders: Animated SVG borders that draw-in on panel mount (GSAP)
- [x] FUI Panel Borders: Corner indicators with pulse animation
- [x] FUI HUD Elements: Rotating concentric rings/reticles on the globe
- [x] Web Audio: Subtle bleep on new threat arrival
- [x] Web Audio: Ambient low-frequency hum (adjustable volume)
- [x] Web Audio: Alert tone escalation for critical threats
- [x] Sound Toggle: Header button to enable/disable audio
- [x] Hollywood CSS: Bloom glow, chromatic-hover, holographic shimmer, gradient-border-flow

## Arc Redesign — From Ornamental to Meaningful (July 2026)

- [x] Corridor Aggregator: Group events by source_country→target into rolling 5-min corridors
- [x] Arc WIDTH = corridor volume (log scale, thin=few events, thick=campaign)
- [x] Arc OPACITY/BRIGHTNESS = recency (last 30s bright, older fades over 2 min)
- [x] Arc COLOR = dominant severity (critical=red, high=amber, medium=cyan)
- [x] Arc SPEED = urgency (critical corridors pulse faster)
- [x] Source Heatmap Glow: Radial glow at countries with many attackers
- [x] Target Pressure Rings: Dynamic pulse rate/size based on actual attack volume
- [x] Temporal Decay: Corridors persist and fade over 2 min instead of vanishing at 15s
- [x] Event Pulses: Single bright pulse travels along corridor when new attack arrives
- [x] Remove spaghetti: Max 12 corridors visible, not 60 individual arcs

## Arc-Feed Sync Fix (July 2026)
- [x] Globe PRIMARY layer: render activeArcs directly (1 arc = 1 feed event, exact source→target coords)
- [x] Globe SECONDARY layer: keep corridors as faint background beams (reduced opacity)
- [x] Remove TextScramble from IP addresses in threat feed (makes feed unreadable)
- [x] Keep TextScramble only on attack type (short, decorative, resolves quickly)

## Campaign-Based Arc Logic (July 2026)
- [x] Replace random scatter with campaign-based threat generation (3-5 active campaigns at a time)
- [x] Each campaign: one source region → one target, sustained burst of 5-10 events, then fades
- [x] Geographic coherence: attackers from same country hit same target (not random)
- [x] Temporal clustering: events arrive in bursts, not uniform random intervals
- [x] Visual clarity: max 6-8 arcs visible simultaneously (not 18+ tangled mess)
- [x] Arc lifecycle: new arc animates in, holds for 8-10s, fades out gracefully
- [x] Campaign rotation: every 20-30s, one campaign ends and a new one begins from different region

## UI Refinement — Borders & Map Toggle (July 2026)
- [x] Remove orange FUI panel borders from all panels (replace with clean borderless cards + subtle backdrop blur)
- [x] Add globe/map toggle button (switch between 3D globe and 2D flat threat map view)
- [x] Keep existing layout structure intact (no panel removal)

## Bug Fixes & UX Improvements (July 2026)
- [x] Fix globe/map toggle — currently not switching to map view on click
- [x] Make all info panels minimizable/collapsible (reduce information overload)
- [x] Add top attack source countries panel (like Kaspersky CyberMap ranking)
- [x] Add top target countries panel (like Kaspersky CyberMap ranking)

## Ultra-Wide Aspect Ratio Fix (July 2026)
- [x] Fix dashboard stretching/warping on ultra-wide monitors (32:9, 21:9)
- [x] Add max-width constraints to side panels so they don't over-stretch
- [x] Ensure globe maintains circular aspect ratio on any screen width
- [x] Prevent horizontal over-stretching of bottom panels

## Wall Display Optimization (July 2026)
- [x] Optimize layout for 7680x2160 (32:9) Planar video wall
- [x] Optimize layout for 5760x2160 (24:9) Planar video wall
- [x] Ensure no warping or stretching at either resolution
- [x] Globe stays circular (not elliptical) at ultra-wide aspect ratios
- [x] Panels use proportional sizing that works at both 32:9 and 24:9

## Flat Map View Fix (July 2026)
- [x] Replace dot-grid flat map with proper SVG world map showing country outlines
- [x] Add filled country shapes (dark fill with visible borders)
- [x] Keep attack arcs rendering on top of the map

## Globe Stability Fix (July 2026)
- [x] Fix globe re-mounting/refreshing — should stay in place with continuous rotation
- [x] Arcs should appear/disappear smoothly without causing globe to reset

## Text Truncation & Wall Dimension Fix (July 2026)
- [x] Fix MITRE ATT&CK tactic names truncated ("Reco...", "Reso...", "Initia...", "Exec...", "Persi...")
- [x] Fix Port Activity service names truncated ("SM...", "IM...", "HT...", "HT...")
- [x] Fix Threat Feed target names truncated ("US...")
- [x] Fix Analytics "Top Vector" text cut off ("Credential Stuffi...")
- [x] Update wall dimensions in code/comments: Left=8192x2160, Right=3840x2160
- [x] Widen side panels to accommodate full text at wall resolution

## Side Panel Width & Toggle Fix (July 2026)
- [x] Widen both side panels (left and right) to be more proportional with the wall width
- [x] Move Globe/Map toggle to the bottom of the globe area and make it touch-friendly (larger tap targets)

## Auto-Cycling Google Map Panel (July 2026)
- [x] Add persistent Google Map panel in the bottom row that auto-cycles through recent attack source locations every 8-10 seconds
- [x] Show marker at attack source with brief info overlay (attack type, IP, country)
- [x] Dark-themed map styling consistent with the dashboard
