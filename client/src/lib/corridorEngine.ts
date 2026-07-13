/**
 * Corridor Aggregation Engine
 * 
 * Transforms individual threat events into meaningful "attack corridors" —
 * grouped flows from source_country → target_location that encode:
 *   - Volume (how many events in the rolling window)
 *   - Severity (dominant severity in the corridor)
 *   - Recency (when was the last event)
 *   - Trend (accelerating, stable, or decaying)
 * 
 * This is the difference between "random spaghetti" and "I can see 3 hot corridors."
 */

import type { ArcData } from '@/contexts/ThreatContext';
import { BRANDING } from './branding';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface Corridor {
  /** Unique key: "CN→US-EAST HQ" */
  id: string;
  /** Source country code */
  sourceCountry: string;
  /** Centroid lat/lng of source (averaged from events) */
  sourceLat: number;
  sourceLng: number;
  /** Target location name */
  targetName: string;
  /** Target lat/lng */
  targetLat: number;
  targetLng: number;
  /** Number of events in the rolling window (last 5 min) */
  eventCount: number;
  /** Events in the last 30 seconds (for "hot" detection) */
  recentCount: number;
  /** Timestamp of most recent event */
  lastEventTime: number;
  /** Dominant severity (most severe event in window) */
  dominantSeverity: 'critical' | 'high' | 'medium' | 'low';
  /** Most common attack type in this corridor */
  dominantAttackType: string;
  /** Visual width (computed from volume, log scale) */
  width: number;
  /** Visual opacity (computed from recency) */
  opacity: number;
  /** Pulse speed (ms for one traversal — lower = faster = more urgent) */
  pulseSpeed: number;
  /** Color (derived from severity) */
  color: string;
  /** Trend: accelerating (more events recently), stable, or decaying */
  trend: 'accelerating' | 'stable' | 'decaying';
  /** Individual recent events for drill-down */
  recentEvents: ArcData[];
}

export interface CorridorPulse {
  /** Which corridor this pulse belongs to */
  corridorId: string;
  /** The original arc data for info card */
  arc: ArcData;
  /** When this pulse was created */
  createdAt: number;
  /** Unique ID */
  id: string;
}

export interface TargetPressure {
  /** Target location name */
  targetName: string;
  lat: number;
  lng: number;
  /** Total events hitting this target in the window */
  totalEvents: number;
  /** Events in last 30s */
  recentEvents: number;
  /** Pressure level (0-1, normalized) */
  pressure: number;
  /** Dominant severity hitting this target */
  dominantSeverity: 'critical' | 'high' | 'medium' | 'low';
  /** Color based on pressure */
  color: string;
  /** Ring pulse rate (ms between pulses — lower = more pressure) */
  pulseRate: number;
  /** Ring max radius (larger = more pressure) */
  maxRadius: number;
}

export interface SourceHotspot {
  /** Country code */
  country: string;
  /** Centroid lat/lng */
  lat: number;
  lng: number;
  /** Number of unique IPs from this country */
  uniqueIPs: number;
  /** Total events from this country */
  totalEvents: number;
  /** Glow radius (proportional to activity) */
  radius: number;
  /** Glow intensity (0-1) */
  intensity: number;
  /** Color based on severity mix */
  color: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const WINDOW_MS = 5 * 60 * 1000;       // 5-minute rolling window
const RECENT_MS = 30 * 1000;            // "recent" = last 30 seconds
const DECAY_MS = 2 * 60 * 1000;         // Corridors fade over 2 minutes after last event
const MAX_CORRIDORS = 12;               // Maximum visible corridors (top by volume)
const PULSE_LIFETIME_MS = 3000;         // How long a pulse animation lives

const SEVERITY_RANK: Record<string, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#FF2D2D',   // Bright red — unmistakable danger
  high: '#FF8C00',       // Deep amber — serious
  medium: '#00D4FF',     // Cyan — notable but controlled
  low: '#4A9EFF',        // Blue — background noise
};

// ═══════════════════════════════════════════════════════════════════════════════
// CORRIDOR AGGREGATOR CLASS
// ═══════════════════════════════════════════════════════════════════════════════

interface EventRecord {
  arc: ArcData;
  timestamp: number;
  corridorId: string;
}

export class CorridorAggregator {
  private events: EventRecord[] = [];
  private corridorCache: Map<string, Corridor> = new Map();
  private pulses: CorridorPulse[] = [];

  /**
   * Add a new event and return the updated corridor state
   */
  addEvent(arc: ArcData): { corridors: Corridor[]; pulse: CorridorPulse | null } {
    const now = Date.now();
    const corridorId = `${arc.sourceCountry}→${arc.targetName}`;

    // Record the event
    this.events.push({ arc, timestamp: now, corridorId });

    // Prune old events outside the window
    this.events = this.events.filter(e => now - e.timestamp < WINDOW_MS);

    // Create a pulse for this new event
    const pulse: CorridorPulse = {
      corridorId,
      arc,
      createdAt: now,
      id: `pulse-${arc.id}-${now}`,
    };
    this.pulses.push(pulse);

    // Prune old pulses
    this.pulses = this.pulses.filter(p => now - p.createdAt < PULSE_LIFETIME_MS);

    // Recompute corridors
    const corridors = this.computeCorridors(now);
    return { corridors, pulse };
  }

  /**
   * Get current state (call on tick/interval for decay updates)
   */
  getState(now: number = Date.now()): {
    corridors: Corridor[];
    pulses: CorridorPulse[];
    targets: TargetPressure[];
    hotspots: SourceHotspot[];
  } {
    // Prune
    this.events = this.events.filter(e => now - e.timestamp < WINDOW_MS);
    this.pulses = this.pulses.filter(p => now - p.createdAt < PULSE_LIFETIME_MS);

    return {
      corridors: this.computeCorridors(now),
      pulses: [...this.pulses],
      targets: this.computeTargetPressure(now),
      hotspots: this.computeSourceHotspots(now),
    };
  }

  /**
   * Get active pulses (for animation)
   */
  getActivePulses(now: number = Date.now()): CorridorPulse[] {
    this.pulses = this.pulses.filter(p => now - p.createdAt < PULSE_LIFETIME_MS);
    return [...this.pulses];
  }

  private computeCorridors(now: number): Corridor[] {
    // Group events by corridor ID
    const groups = new Map<string, EventRecord[]>();
    for (const event of this.events) {
      const existing = groups.get(event.corridorId) || [];
      existing.push(event);
      groups.set(event.corridorId, existing);
    }

    // Build corridor objects
    const corridors: Corridor[] = [];
    for (const [id, events] of groups) {
      if (events.length === 0) continue;

      const lastEvent = events[events.length - 1];
      const timeSinceLastEvent = now - lastEvent.timestamp;

      // Skip corridors that have fully decayed
      if (timeSinceLastEvent > DECAY_MS) continue;

      // Compute centroid of source positions
      const sourceLat = events.reduce((sum, e) => sum + e.arc.startLat, 0) / events.length;
      const sourceLng = events.reduce((sum, e) => sum + e.arc.startLng, 0) / events.length;

      // Count recent events (last 30s)
      const recentCount = events.filter(e => now - e.timestamp < RECENT_MS).length;
      const totalCount = events.length;

      // Determine dominant severity (highest in window)
      let dominantSeverity: 'critical' | 'high' | 'medium' | 'low' = 'low';
      for (const e of events) {
        if ((SEVERITY_RANK[e.arc.severity] || 0) > (SEVERITY_RANK[dominantSeverity] || 0)) {
          dominantSeverity = e.arc.severity as any;
        }
      }

      // Determine dominant attack type (most frequent)
      const attackCounts = new Map<string, number>();
      for (const e of events) {
        attackCounts.set(e.arc.attackType, (attackCounts.get(e.arc.attackType) || 0) + 1);
      }
      const dominantAttackType = [...attackCounts.entries()]
        .sort(([, a], [, b]) => b - a)[0]?.[0] || 'Unknown';

      // Compute trend
      const halfWindow = WINDOW_MS / 2;
      const recentHalf = events.filter(e => now - e.timestamp < halfWindow).length;
      const olderHalf = totalCount - recentHalf;
      let trend: 'accelerating' | 'stable' | 'decaying';
      if (recentHalf > olderHalf * 1.5) trend = 'accelerating';
      else if (recentHalf < olderHalf * 0.5) trend = 'decaying';
      else trend = 'stable';

      // ─── VISUAL ENCODING ─────────────────────────────────────────────────
      
      // WIDTH: logarithmic scale, min 0.3, max 4.0
      // 1 event → 0.3, 5 events → 1.0, 20 events → 2.0, 100+ events → 4.0
      const width = Math.min(4.0, Math.max(0.3, Math.log2(totalCount + 1) * 0.6));

      // OPACITY: based on recency (1.0 if active in last 30s, fades to 0.15 over 2 min)
      let opacity: number;
      if (timeSinceLastEvent < RECENT_MS) {
        opacity = 0.85 + (recentCount / Math.max(totalCount, 1)) * 0.15; // 0.85-1.0
      } else {
        // Linear decay from 0.7 to 0.15 over DECAY_MS
        const decayProgress = Math.min(1, timeSinceLastEvent / DECAY_MS);
        opacity = 0.7 - decayProgress * 0.55;
      }

      // PULSE SPEED: critical=1200ms (fast), high=1800ms, medium=2400ms, low=3000ms (slow)
      const speedMap: Record<string, number> = { critical: 1200, high: 1800, medium: 2400, low: 3000 };
      const pulseSpeed = speedMap[dominantSeverity] || 2400;

      // COLOR: based on dominant severity
      const color = SEVERITY_COLORS[dominantSeverity] || SEVERITY_COLORS.medium;

      corridors.push({
        id,
        sourceCountry: lastEvent.arc.sourceCountry,
        sourceLat,
        sourceLng,
        targetName: lastEvent.arc.targetName,
        targetLat: lastEvent.arc.endLat,
        targetLng: lastEvent.arc.endLng,
        eventCount: totalCount,
        recentCount,
        lastEventTime: lastEvent.timestamp,
        dominantSeverity,
        dominantAttackType,
        width,
        opacity,
        pulseSpeed,
        color,
        trend,
        recentEvents: events.slice(-5).map(e => e.arc),
      });
    }

    // Sort by volume (descending) and take top N
    corridors.sort((a, b) => b.eventCount - a.eventCount);
    return corridors.slice(0, MAX_CORRIDORS);
  }

  private computeTargetPressure(now: number): TargetPressure[] {
    // Group events by target
    const targetGroups = new Map<string, EventRecord[]>();
    for (const event of this.events) {
      const existing = targetGroups.get(event.arc.targetName) || [];
      existing.push(event);
      targetGroups.set(event.arc.targetName, existing);
    }

    const targets: TargetPressure[] = [];
    const maxEvents = Math.max(...[...targetGroups.values()].map(g => g.length), 1);

    for (const [name, events] of targetGroups) {
      if (events.length === 0) continue;

      const lastEvent = events[events.length - 1];
      const recentEvents = events.filter(e => now - e.timestamp < RECENT_MS).length;
      const pressure = Math.min(1, events.length / Math.max(maxEvents, 1));

      // Dominant severity hitting this target
      let dominantSeverity: 'critical' | 'high' | 'medium' | 'low' = 'low';
      for (const e of events) {
        if ((SEVERITY_RANK[e.arc.severity] || 0) > (SEVERITY_RANK[dominantSeverity] || 0)) {
          dominantSeverity = e.arc.severity as any;
        }
      }

      // Color shifts from blue (low pressure) → amber → red (high pressure)
      let color: string;
      if (pressure > 0.7) color = 'rgba(255, 45, 45, 0.4)';
      else if (pressure > 0.4) color = 'rgba(255, 140, 0, 0.3)';
      else color = 'rgba(0, 212, 255, 0.2)';

      // Pulse rate: high pressure = fast pulsing (600ms), low = slow (2500ms)
      const pulseRate = 2500 - pressure * 1900;

      // Ring radius: high pressure = large (4), low = small (1.5)
      const maxRadius = 1.5 + pressure * 2.5;

      targets.push({
        targetName: name,
        lat: lastEvent.arc.endLat,
        lng: lastEvent.arc.endLng,
        totalEvents: events.length,
        recentEvents,
        pressure,
        dominantSeverity,
        color,
        pulseRate,
        maxRadius,
      });
    }

    return targets;
  }

  private computeSourceHotspots(now: number): SourceHotspot[] {
    // Group by source country
    const countryGroups = new Map<string, EventRecord[]>();
    for (const event of this.events) {
      const existing = countryGroups.get(event.arc.sourceCountry) || [];
      existing.push(event);
      countryGroups.set(event.arc.sourceCountry, existing);
    }

    const hotspots: SourceHotspot[] = [];
    const maxTotal = Math.max(...[...countryGroups.values()].map(g => g.length), 1);

    for (const [country, events] of countryGroups) {
      if (events.length < 2) continue; // Skip single-event countries

      // Centroid
      const lat = events.reduce((sum: number, e: EventRecord) => sum + e.arc.startLat, 0) / events.length;
      const lng = events.reduce((sum: number, e: EventRecord) => sum + e.arc.startLng, 0) / events.length;

      // Unique IPs
      const uniqueIPs = new Set(events.map((e: EventRecord) => e.arc.sourceIp)).size;

      // Intensity (normalized by max)
      const intensity = Math.min(1, events.length / maxTotal);

      // Radius (proportional to activity, 0.5-3.0)
      const radius = 0.5 + intensity * 2.5;

      // Color: based on severity mix
      let hasCritical = false, hasHigh = false;
      for (const e of events) {
        if (e.arc.severity === 'critical') hasCritical = true;
        if (e.arc.severity === 'high') hasHigh = true;
      }
      const color = hasCritical ? 'rgba(255, 45, 45, 0.35)' :
                    hasHigh ? 'rgba(255, 140, 0, 0.3)' :
                    'rgba(0, 212, 255, 0.25)';

      hotspots.push({
        country,
        lat,
        lng,
        uniqueIPs,
        totalEvents: events.length,
        radius,
        intensity,
        color,
      });
    }

    // Sort by total events, take top 8
    hotspots.sort((a, b) => b.totalEvents - a.totalEvents);
    return hotspots.slice(0, 8);
  }
}
