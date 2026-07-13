import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CorridorAggregator } from './corridorEngine';
import type { ArcData } from '@/contexts/ThreatContext';

function makeArc(overrides: Partial<ArcData> = {}): ArcData {
  return {
    id: `arc-${Math.random().toString(36).slice(2)}`,
    startLat: 39.9,
    startLng: 116.4,
    endLat: 38.9,
    endLng: -77.0,
    color: '#FF2D2D',
    severity: 'high',
    attackType: 'SSH Brute Force',
    sourceIp: `10.0.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
    sourceCountry: 'CN',
    targetName: 'US-EAST HQ',
    port: 22,
    timestamp: Date.now(),
    ...overrides,
  };
}

describe('CorridorAggregator', () => {
  let aggregator: CorridorAggregator;

  beforeEach(() => {
    aggregator = new CorridorAggregator();
  });

  it('creates corridors from events with the same source→target', () => {
    const now = Date.now();
    // Add 5 events from CN → US-EAST HQ
    for (let i = 0; i < 5; i++) {
      aggregator.addEvent(makeArc({ timestamp: now - i * 1000 }));
    }
    const state = aggregator.getState(now);
    expect(state.corridors.length).toBe(1);
    expect(state.corridors[0].id).toContain('CN');
    expect(state.corridors[0].eventCount).toBe(5);
  });

  it('encodes corridor width using logarithmic scale based on volume', () => {
    const now = Date.now();
    // 1 event → small width
    aggregator.addEvent(makeArc({ timestamp: now }));
    let state = aggregator.getState(now);
    const widthWith1 = state.corridors[0].width;

    // Add 19 more events (total 20) → larger width
    for (let i = 0; i < 19; i++) {
      aggregator.addEvent(makeArc({ timestamp: now - i * 100 }));
    }
    state = aggregator.getState(now);
    const widthWith20 = state.corridors[0].width;

    expect(widthWith20).toBeGreaterThan(widthWith1);
    expect(widthWith1).toBeGreaterThanOrEqual(0.3);
    expect(widthWith20).toBeLessThanOrEqual(4.0);
  });

  it('maps severity to correct colors', () => {
    const now = Date.now();
    // Critical event
    aggregator.addEvent(makeArc({ severity: 'critical', timestamp: now }));
    let state = aggregator.getState(now);
    expect(state.corridors[0].color).toBe('#FF2D2D'); // Critical red

    // New aggregator for medium
    const agg2 = new CorridorAggregator();
    agg2.addEvent(makeArc({ severity: 'medium', timestamp: now }));
    state = agg2.getState(now);
    expect(state.corridors[0].color).toBe('#00D4FF'); // Medium cyan
  });

  it('assigns faster pulse speed to higher severity corridors', () => {
    const now = Date.now();
    // Critical corridor
    aggregator.addEvent(makeArc({ severity: 'critical', timestamp: now }));
    const critState = aggregator.getState(now);
    const critSpeed = critState.corridors[0].pulseSpeed;

    // Low severity corridor (different target to create separate corridor)
    const agg2 = new CorridorAggregator();
    agg2.addEvent(makeArc({
      severity: 'low',
      endLat: 51.5,
      endLng: -0.12,
      targetName: 'UK OFFICE',
      timestamp: now,
    }));
    const lowState = agg2.getState(now);
    const lowSpeed = lowState.corridors[0].pulseSpeed;

    // Critical should have lower ms (faster) than low
    expect(critSpeed).toBeLessThan(lowSpeed);
    expect(critSpeed).toBe(1200);
    expect(lowSpeed).toBe(3000);
  });

  it('caps visible corridors at MAX_CORRIDORS (12)', () => {
    const now = Date.now();
    // Create 15 distinct corridors (different targets)
    const targets = [
      { endLat: 38.9, endLng: -77.0, targetName: 'US-EAST HQ' },
      { endLat: 37.4, endLng: -122.1, targetName: 'US-WEST DC' },
      { endLat: 50.1, endLng: 8.7, targetName: 'EU-CENTRAL DC' },
      { endLat: 51.5, endLng: -0.1, targetName: 'UK OFFICE' },
      { endLat: 1.35, endLng: 103.8, targetName: 'APAC DC' },
      { endLat: 35.7, endLng: 139.7, targetName: 'TOKYO DC' },
      { endLat: -33.9, endLng: 151.2, targetName: 'SYDNEY DC' },
      { endLat: 55.8, endLng: 37.6, targetName: 'MOSCOW DC' },
      { endLat: 48.9, endLng: 2.35, targetName: 'PARIS DC' },
      { endLat: 52.5, endLng: 13.4, targetName: 'BERLIN DC' },
      { endLat: 40.4, endLng: -3.7, targetName: 'MADRID DC' },
      { endLat: 41.9, endLng: 12.5, targetName: 'ROME DC' },
      { endLat: 59.3, endLng: 18.1, targetName: 'STOCKHOLM DC' },
      { endLat: 60.2, endLng: 24.9, targetName: 'HELSINKI DC' },
      { endLat: 37.6, endLng: 127.0, targetName: 'SEOUL DC' },
    ];

    for (const target of targets) {
      aggregator.addEvent(makeArc({ ...target, timestamp: now }));
    }

    const state = aggregator.getState(now);
    expect(state.corridors.length).toBeLessThanOrEqual(12);
  });

  it('decays corridor opacity after recent window', () => {
    const now = Date.now();
    // Add event 30 seconds ago (past 15s recency, within 45s decay)
    const eventTime = now - 30_000;
    aggregator.addEvent(makeArc({ timestamp: eventTime }));
    const state = aggregator.getState(now);
    
    // Should still be visible (within 45s decay)
    expect(state.corridors.length).toBe(1);
    // Opacity should be reduced (decaying) — 30s into 45s decay = ~67% through
    expect(state.corridors[0].opacity).toBeLessThan(0.7);
    expect(state.corridors[0].opacity).toBeGreaterThan(0.1);
  });

  it('removes corridors after decay window', () => {
    const now = Date.now();
    // Add event 50 seconds ago (past the 45s decay)
    const eventTime = now - 50_000;
    const agg = new CorridorAggregator();
    agg.addEvent(makeArc({ timestamp: eventTime }));
    const state = agg.getState(now);
    
    // Should be gone (past DECAY_MS of 45 seconds since last event)
    expect(state.corridors.length).toBe(0);
  });

  it('generates event pulses when new events arrive', () => {
    const now = Date.now();
    aggregator.addEvent(makeArc({ timestamp: now }));
    const state = aggregator.getState(now);
    
    // Should have at least one active pulse
    expect(state.pulses.length).toBeGreaterThanOrEqual(1);
    expect(state.pulses[0].corridorId).toContain('CN');
  });

  it('computes source hotspots for countries with multiple events', () => {
    const now = Date.now();
    // Add 5 events from CN
    for (let i = 0; i < 5; i++) {
      aggregator.addEvent(makeArc({ timestamp: now - i * 1000 }));
    }
    const state = aggregator.getState(now);
    
    expect(state.hotspots.length).toBeGreaterThanOrEqual(1);
    expect(state.hotspots[0].country).toBe('CN');
    expect(state.hotspots[0].totalEvents).toBe(5);
    expect(state.hotspots[0].radius).toBeGreaterThan(0.5);
    expect(state.hotspots[0].intensity).toBeGreaterThan(0);
  });

  it('computes target pressure for attacked locations', () => {
    const now = Date.now();
    // Add 5 events targeting US-EAST HQ
    for (let i = 0; i < 5; i++) {
      aggregator.addEvent(makeArc({ timestamp: now - i * 1000 }));
    }
    const state = aggregator.getState(now);
    
    expect(state.targets.length).toBeGreaterThanOrEqual(1);
    const usTarget = state.targets.find(t => t.targetName === 'US-EAST HQ');
    expect(usTarget).toBeDefined();
    expect(usTarget!.totalEvents).toBe(5);
    expect(usTarget!.pressure).toBeGreaterThan(0);
  });

  it('recent events have higher opacity than older events', () => {
    const now = Date.now();
    // Corridor with recent event (5s ago — within 15s recency window)
    const recentAgg = new CorridorAggregator();
    recentAgg.addEvent(makeArc({ timestamp: now - 5_000 }));
    const recentState = recentAgg.getState(now);
    const recentOpacity = recentState.corridors[0].opacity;

    // Corridor with old event (35s ago — past 15s recency, in 45s decay phase)
    const oldAgg = new CorridorAggregator();
    oldAgg.addEvent(makeArc({ timestamp: now - 35_000 }));
    const oldState = oldAgg.getState(now);
    const oldOpacity = oldState.corridors[0].opacity;

    // Recent (within 15s) should have higher opacity than decaying (35s old)
    expect(recentOpacity).toBeGreaterThan(oldOpacity);
  });
});
