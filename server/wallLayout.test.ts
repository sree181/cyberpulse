/**
 * Wall Display Layout Tests
 * 
 * Verifies that the layout proportions work correctly for the two Planar video walls:
 * - Left wall:  8192 × 2160 (~3.8:1)
 * - Right wall: 3840 × 2160 (16:9)
 */
import { describe, it, expect } from 'vitest';

// Layout constants from Home.tsx
const SIDE_COLUMN_PERCENT = 0.16; // w-[16%]
const SIDE_COLUMN_MIN = 200; // min-w-[200px]
const SIDE_COLUMN_MAX = 520; // max-w-[520px]
const GAP = 0.004; // 0.4vw

// Header height (approximately 50px on these walls)
const HEADER_HEIGHT = 50;

// Flex ratios: top row = 7, bottom row = 2
const TOP_ROW_RATIO = 7;
const BOTTOM_ROW_RATIO = 2;

function calculateLayout(viewportWidth: number, viewportHeight: number) {
  const totalGap = viewportWidth * GAP * 4; // gaps between columns
  
  // Side column width (clamped between min and max)
  const rawSideWidth = viewportWidth * SIDE_COLUMN_PERCENT;
  const sideColumnWidth = Math.min(SIDE_COLUMN_MAX, Math.max(SIDE_COLUMN_MIN, rawSideWidth));
  
  // Center (globe) width
  const centerWidth = viewportWidth - (sideColumnWidth * 2) - totalGap;
  
  // Vertical distribution
  const contentHeight = viewportHeight - HEADER_HEIGHT;
  const topRowHeight = contentHeight * (TOP_ROW_RATIO / (TOP_ROW_RATIO + BOTTOM_ROW_RATIO));
  const bottomRowHeight = contentHeight * (BOTTOM_ROW_RATIO / (TOP_ROW_RATIO + BOTTOM_ROW_RATIO));
  
  // Globe diameter (constrained by height — sphere fills the smaller dimension)
  const globeDiameter = Math.min(centerWidth, topRowHeight);
  
  return {
    sideColumnWidth,
    centerWidth,
    topRowHeight,
    bottomRowHeight,
    globeDiameter,
    contentHeight,
  };
}

describe('Wall Display Layout — 8192×2160 (Left Wall, ~3.8:1)', () => {
  const layout = calculateLayout(8192, 2160);
  
  it('side columns are capped at max width', () => {
    expect(layout.sideColumnWidth).toBe(520);
  });
  
  it('center area is wide enough for the globe', () => {
    expect(layout.centerWidth).toBeGreaterThan(5000);
  });
  
  it('globe diameter is constrained by height (not width)', () => {
    // On ~3.8:1, height is the constraining dimension
    expect(layout.globeDiameter).toBeLessThanOrEqual(layout.topRowHeight);
    expect(layout.globeDiameter).toBeGreaterThan(1400); // At least 1400px diameter
  });
  
  it('top row gets ~77% of content height', () => {
    const ratio = layout.topRowHeight / layout.contentHeight;
    expect(ratio).toBeCloseTo(0.778, 1);
  });
  
  it('bottom row has enough height for panels', () => {
    expect(layout.bottomRowHeight).toBeGreaterThan(400); // At least 400px
  });
  
  it('no element exceeds viewport bounds', () => {
    expect(layout.sideColumnWidth * 2 + layout.centerWidth).toBeLessThanOrEqual(8192);
    expect(layout.topRowHeight + layout.bottomRowHeight + HEADER_HEIGHT).toBeLessThanOrEqual(2160);
  });
});

describe('Wall Display Layout — 3840×2160 (Right Wall, 16:9)', () => {
  const layout = calculateLayout(3840, 2160);
  
  it('side columns are capped at max width', () => {
    expect(layout.sideColumnWidth).toBe(520);
  });
  
  it('center area is wide enough for the globe', () => {
    expect(layout.centerWidth).toBeGreaterThan(2000);
  });
  
  it('globe diameter is constrained by height (not width)', () => {
    expect(layout.globeDiameter).toBeLessThanOrEqual(layout.topRowHeight);
    expect(layout.globeDiameter).toBeGreaterThan(1400);
  });
  
  it('top row gets ~77% of content height', () => {
    const ratio = layout.topRowHeight / layout.contentHeight;
    expect(ratio).toBeCloseTo(0.778, 1);
  });
  
  it('bottom row has enough height for panels', () => {
    expect(layout.bottomRowHeight).toBeGreaterThan(400);
  });
  
  it('no element exceeds viewport bounds', () => {
    expect(layout.sideColumnWidth * 2 + layout.centerWidth).toBeLessThanOrEqual(3840);
    expect(layout.topRowHeight + layout.bottomRowHeight + HEADER_HEIGHT).toBeLessThanOrEqual(2160);
  });
});

describe('Globe stays circular at ultra-wide aspect ratios', () => {
  it('globe is height-constrained on ~3.8:1 (8192x2160)', () => {
    const layout = calculateLayout(8192, 2160);
    // Globe diameter should be determined by height, not width
    expect(layout.globeDiameter).toBe(layout.topRowHeight);
    expect(layout.globeDiameter).toBeLessThan(layout.centerWidth);
  });
  
  it('globe is height-constrained on 16:9 (3840x2160)', () => {
    const layout = calculateLayout(3840, 2160);
    expect(layout.globeDiameter).toBe(layout.topRowHeight);
    expect(layout.globeDiameter).toBeLessThan(layout.centerWidth);
  });
  
  it('globe is height-constrained on standard 16:9 (1920x1080)', () => {
    const layout = calculateLayout(1920, 1080);
    // On 16:9, the center width might be smaller than height
    // Globe should still be constrained by the smaller dimension
    expect(layout.globeDiameter).toBeLessThanOrEqual(Math.min(layout.centerWidth, layout.topRowHeight));
  });
});
