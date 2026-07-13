/**
 * Tests for ThreatFlatMap utility functions
 * 
 * We extract and test the pure projection/land-detection logic
 * that powers the 2D flat threat map view.
 */
import { describe, it, expect } from 'vitest';

// ─── Mercator Projection (same as in ThreatFlatMap.tsx) ─────────────────────
function latLngToXY(lat: number, lng: number): [number, number] {
  const x = (lng + 180) / 360;
  const latRad = (Math.max(-85, Math.min(85, lat)) * Math.PI) / 180;
  const mercN = Math.log(Math.tan(Math.PI / 4 + latRad / 2));
  const y = 0.5 - mercN / (2 * Math.PI);
  return [x, y];
}

// ─── Land Detection (same as in ThreatFlatMap.tsx) ──────────────────────────
function isLand(lat: number, lng: number): boolean {
  if (lat >= 25 && lat <= 72 && lng >= -170 && lng <= -50) {
    if (lat >= 48 && lng <= -130) return true;
    if (lat >= 25 && lat <= 50 && lng >= -130 && lng <= -65) return true;
    if (lat >= 50 && lng >= -140 && lng <= -55) return true;
    return false;
  }
  if (lat >= 7 && lat <= 25 && lng >= -120 && lng <= -60) return true;
  if (lat >= -56 && lat <= 12 && lng >= -82 && lng <= -34) {
    if (lng >= -82 && lng <= -34 && lat >= -56) return true;
  }
  if (lat >= 35 && lat <= 72 && lng >= -12 && lng <= 40) return true;
  if (lat >= -35 && lat <= 37 && lng >= -18 && lng <= 52) {
    if (lat >= 20 && lng >= 30 && lng <= 52) return true;
    if (lat >= -35 && lat <= 20 && lng >= -18 && lng <= 52) return true;
    if (lat >= 20 && lng >= -18 && lng <= 30) return true;
    return false;
  }
  if (lat >= 12 && lat <= 42 && lng >= 25 && lng <= 65) return true;
  if (lat >= 40 && lat <= 72 && lng >= 40 && lng <= 180) return true;
  if (lat >= 5 && lat <= 40 && lng >= 65 && lng <= 100) return true;
  if (lat >= 18 && lat <= 55 && lng >= 100 && lng <= 145) return true;
  if (lat >= -10 && lat <= 20 && lng >= 95 && lng <= 140) return true;
  if (lat >= -45 && lat <= -10 && lng >= 110 && lng <= 155) return true;
  if (lat >= 30 && lat <= 46 && lng >= 125 && lng <= 146) return true;
  return false;
}

describe('Mercator Projection (latLngToXY)', () => {
  it('maps (0, 0) to center of map', () => {
    const [x, y] = latLngToXY(0, 0);
    expect(x).toBeCloseTo(0.5, 5);
    expect(y).toBeCloseTo(0.5, 5);
  });

  it('maps (-180 lng) to left edge and (180 lng) to right edge', () => {
    const [xLeft] = latLngToXY(0, -180);
    const [xRight] = latLngToXY(0, 180);
    expect(xLeft).toBeCloseTo(0, 5);
    expect(xRight).toBeCloseTo(1, 5);
  });

  it('maps north pole area to top (y near 0)', () => {
    const [, y] = latLngToXY(85, 0);
    expect(y).toBeLessThan(0.1);
  });

  it('maps south pole area to bottom (y near 1)', () => {
    const [, y] = latLngToXY(-85, 0);
    expect(y).toBeGreaterThan(0.9);
  });

  it('clamps extreme latitudes to ±85', () => {
    const [, y90] = latLngToXY(90, 0);
    const [, y85] = latLngToXY(85, 0);
    expect(y90).toBeCloseTo(y85, 5);
  });

  it('returns values in [0, 1] range for all valid inputs', () => {
    const testCases = [
      [40, -74],   // New York
      [51, 0],     // London
      [35, 139],   // Tokyo
      [-34, 151],  // Sydney
      [-23, -46],  // São Paulo
    ];
    for (const [lat, lng] of testCases) {
      const [x, y] = latLngToXY(lat, lng);
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(1);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(1);
    }
  });
});

describe('Land Detection (isLand)', () => {
  it('detects major cities as land', () => {
    expect(isLand(40, -74)).toBe(true);   // New York
    expect(isLand(51, 0)).toBe(true);     // London
    expect(isLand(35, 139)).toBe(true);   // Tokyo
    expect(isLand(-34, 151)).toBe(true);  // Sydney
    expect(isLand(48, 2)).toBe(true);     // Paris
    expect(isLand(55, 37)).toBe(true);    // Moscow
    expect(isLand(28, 77)).toBe(true);    // Delhi
    expect(isLand(39, 116)).toBe(true);   // Beijing
  });

  it('detects ocean areas as not land', () => {
    expect(isLand(0, -150)).toBe(false);  // Pacific Ocean
    expect(isLand(30, -50)).toBe(false);  // Atlantic Ocean
    expect(isLand(-40, 80)).toBe(false);  // Indian Ocean
    expect(isLand(-70, 0)).toBe(false);   // Southern Ocean
  });

  it('detects Africa as land', () => {
    expect(isLand(0, 30)).toBe(true);     // Central Africa
    expect(isLand(-10, 25)).toBe(true);   // Congo region
    expect(isLand(30, 0)).toBe(true);     // North Africa
  });

  it('detects South America as land', () => {
    expect(isLand(-15, -50)).toBe(true);  // Brazil
    expect(isLand(-35, -60)).toBe(true);  // Argentina
    expect(isLand(5, -75)).toBe(true);    // Colombia
  });
});
