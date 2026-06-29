/**
 * timelineDb — Server-side helpers for persisting threat events and querying timeline replay data
 * 
 * Architecture:
 *   - Events are batched in memory and flushed to DB every 5 seconds
 *   - Timeline bins are pre-aggregated for efficient histogram queries
 *   - Cleanup runs every hour to prune events older than 24h
 *   - Replay queries return events within a time window for the scrubber
 */
import { getDb } from './db';
import { threatEvents, timelineBins, type InsertThreatEvent } from '../drizzle/schema';
import { sql, gte, lte, and, desc } from 'drizzle-orm';

// ═══════════════════════════════════════════════════════════════════
// BATCH INSERT BUFFER
// ═══════════════════════════════════════════════════════════════════

const eventBuffer: InsertThreatEvent[] = [];
let flushTimer: ReturnType<typeof setInterval> | null = null;
const FLUSH_INTERVAL_MS = 5000;
const MAX_BUFFER_SIZE = 100;

/**
 * Queue a threat event for persistence. Events are batched and flushed periodically.
 */
export function queueThreatEvent(event: InsertThreatEvent): void {
  eventBuffer.push(event);
  if (eventBuffer.length >= MAX_BUFFER_SIZE) {
    flushEvents();
  }
}

/**
 * Flush buffered events to the database
 */
async function flushEvents(): Promise<void> {
  if (eventBuffer.length === 0) return;
  
  const batch = eventBuffer.splice(0, eventBuffer.length);
  const db = await getDb();
  if (!db) return;

  try {
    await db.insert(threatEvents).values(batch);
    
    // Update timeline bins for the flushed events
    await updateBins(batch);
  } catch (error) {
    console.error('[Timeline] Failed to flush events:', error);
    // Don't re-queue — data loss is acceptable for this visualization use case
  }
}

/**
 * Update pre-aggregated timeline bins for a batch of events
 */
async function updateBins(events: InsertThreatEvent[]): Promise<void> {
  const db = await getDb();
  if (!db) return;

  // Group events by 5-minute bin
  const binMap = new Map<string, { binStart: Date; total: number; critical: number; high: number; medium: number; low: number }>();
  
  for (const event of events) {
    const ts = event.timestamp instanceof Date ? event.timestamp : new Date();
    const binMs = Math.floor(ts.getTime() / (5 * 60 * 1000)) * (5 * 60 * 1000);
    const binKey = String(binMs);
    const binStart = new Date(binMs);
    
    if (!binMap.has(binKey)) {
      binMap.set(binKey, { binStart, total: 0, critical: 0, high: 0, medium: 0, low: 0 });
    }
    const bin = binMap.get(binKey)!;
    bin.total++;
    if (event.severity === 'critical') bin.critical++;
    else if (event.severity === 'high') bin.high++;
    else if (event.severity === 'medium') bin.medium++;
    else bin.low++;
  }

  // Upsert each bin using onDuplicateKeyUpdate for atomicity
  for (const [, bin] of Array.from(binMap.entries())) {
    try {
      await db.insert(timelineBins).values({
        binStart: bin.binStart,
        eventCount: bin.total,
        criticalCount: bin.critical,
        highCount: bin.high,
        mediumCount: bin.medium,
        lowCount: bin.low,
      }).onDuplicateKeyUpdate({
        set: {
          eventCount: sql`${timelineBins.eventCount} + ${bin.total}`,
          criticalCount: sql`${timelineBins.criticalCount} + ${bin.critical}`,
          highCount: sql`${timelineBins.highCount} + ${bin.high}`,
          mediumCount: sql`${timelineBins.mediumCount} + ${bin.medium}`,
          lowCount: sql`${timelineBins.lowCount} + ${bin.low}`,
        },
      });
    } catch (err) {
      console.error('[Timeline] Failed to upsert bin:', err);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════
// QUERY HELPERS
// ═══════════════════════════════════════════════════════════════════

/**
 * Get 24h histogram bins for the timeline scrubber
 * Returns pre-aggregated 5-minute bins for the past 24 hours
 */
export async function getTimelineHistogram(): Promise<{
  bins: Array<{ binStart: string; eventCount: number; criticalCount: number; highCount: number; mediumCount: number; lowCount: number }>;
}> {
  const db = await getDb();
  if (!db) return { bins: [] };

  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  try {
    const rows = await db.select()
      .from(timelineBins)
      .where(gte(timelineBins.binStart, dayAgo))
      .orderBy(timelineBins.binStart);

    return {
      bins: rows.map(r => ({
        binStart: r.binStart.toISOString(),
        eventCount: r.eventCount,
        criticalCount: r.criticalCount,
        highCount: r.highCount,
        mediumCount: r.mediumCount,
        lowCount: r.lowCount,
      })),
    };
  } catch (error) {
    console.error('[Timeline] Failed to query histogram:', error);
    return { bins: [] };
  }
}

/**
 * Get threat events within a specific time window for replay
 * Used when the timeline scrubber is at a specific position
 */
export async function getReplayEvents(startTime: Date, endTime: Date, limit: number = 50): Promise<{
  events: Array<{
    eventId: string;
    timestamp: string;
    attackType: string;
    severity: string;
    sourceIp: string;
    sourceCountry: string;
    sourceCity: string | null;
    sourceLat: number;
    sourceLng: number;
    targetName: string | null;
    targetLat: number;
    targetLng: number;
    port: number | null;
    protocol: string | null;
  }>;
}> {
  const db = await getDb();
  if (!db) return { events: [] };

  try {
    const rows = await db.select()
      .from(threatEvents)
      .where(and(
        gte(threatEvents.timestamp, startTime),
        lte(threatEvents.timestamp, endTime)
      ))
      .orderBy(desc(threatEvents.timestamp))
      .limit(limit);

    return {
      events: rows.map(r => ({
        eventId: r.eventId,
        timestamp: r.timestamp.toISOString(),
        attackType: r.attackType,
        severity: r.severity,
        sourceIp: r.sourceIp,
        sourceCountry: r.sourceCountry,
        sourceCity: r.sourceCity,
        sourceLat: parseFloat(r.sourceLat),
        sourceLng: parseFloat(r.sourceLng),
        targetName: r.targetName,
        targetLat: parseFloat(r.targetLat),
        targetLng: parseFloat(r.targetLng),
        port: r.port,
        protocol: r.protocol,
      })),
    };
  } catch (error) {
    console.error('[Timeline] Failed to query replay events:', error);
    return { events: [] };
  }
}

/**
 * Cleanup events older than 24 hours
 */
export async function cleanupOldEvents(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  try {
    // Delete old events
    const eventResult = await db.delete(threatEvents)
      .where(sql`${threatEvents.timestamp} < ${dayAgo}`);
    
    // Delete old bins
    await db.delete(timelineBins)
      .where(sql`${timelineBins.binStart} < ${dayAgo}`);

    return (eventResult as any)[0]?.affectedRows || 0;
  } catch (error) {
    console.error('[Timeline] Failed to cleanup old events:', error);
    return 0;
  }
}

// ═══════════════════════════════════════════════════════════════════
// LIFECYCLE
// ═══════════════════════════════════════════════════════════════════

/**
 * Start the background flush timer and cleanup schedule
 */
export function startTimelinePersistence(): void {
  // Flush events every 5 seconds
  if (!flushTimer) {
    flushTimer = setInterval(flushEvents, FLUSH_INTERVAL_MS);
  }

  // Cleanup old events every hour
  setInterval(cleanupOldEvents, 60 * 60 * 1000);
  
  console.log('[Timeline] Persistence engine started (flush every 5s, cleanup every 1h)');
}
