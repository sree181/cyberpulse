/**
 * useTimelinePersistence — Persists threat events to the server for 24h replay
 * 
 * Batches events client-side and sends them to the server every 10 seconds.
 * This ensures the timeline scrubber can replay actual historical attacks
 * even after page refresh.
 */
import { useEffect, useRef } from 'react';
import { useThreatData } from '@/contexts/ThreatContext';
import { trpc } from '@/lib/trpc';

interface PendingEvent {
  eventId: string;
  attackType: string;
  severity: string;
  sourceIp: string;
  sourceCountry: string;
  sourceCity?: string;
  sourceLat: number;
  sourceLng: number;
  targetName?: string;
  targetLat: number;
  targetLng: number;
  port?: number;
  protocol?: string;
}

const BATCH_INTERVAL_MS = 10000; // Send batch every 10s
const MAX_BATCH_SIZE = 30;

export function useTimelinePersistence() {
  const { threats } = useThreatData();
  const persistMutation = trpc.timeline.persistEvent.useMutation();
  const lastPersistedCountRef = useRef(0);
  const bufferRef = useRef<PendingEvent[]>([]);
  const flushTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Collect new threats into buffer
  useEffect(() => {
    const currentCount = threats.length;
    if (currentCount <= lastPersistedCountRef.current) {
      lastPersistedCountRef.current = currentCount;
      return;
    }

    // Get new threats since last check
    const newCount = currentCount - lastPersistedCountRef.current;
    const newThreats = threats.slice(0, Math.min(newCount, 10)); // Cap at 10 per tick

    for (const threat of newThreats) {
      bufferRef.current.push({
        eventId: threat.id,
        attackType: threat.attackType,
        severity: threat.severity,
        sourceIp: threat.sourceIp,
        sourceCountry: threat.sourceCountry,
        sourceCity: threat.sourceCity,
        sourceLat: threat.sourceLat,
        sourceLng: threat.sourceLng,
        targetName: threat.targetName,
        targetLat: threat.targetLat,
        targetLng: threat.targetLng,
        port: threat.port,
        protocol: threat.protocol,
      });
    }

    // Cap buffer size
    if (bufferRef.current.length > MAX_BATCH_SIZE * 3) {
      bufferRef.current = bufferRef.current.slice(-MAX_BATCH_SIZE * 2);
    }

    lastPersistedCountRef.current = currentCount;
  }, [threats]);

  // Flush buffer periodically
  useEffect(() => {
    const flush = () => {
      if (bufferRef.current.length === 0) return;
      
      const batch = bufferRef.current.splice(0, MAX_BATCH_SIZE);
      
      // Send each event (tRPC mutations are lightweight)
      for (const event of batch) {
        persistMutation.mutate(event);
      }
    };

    flushTimerRef.current = setInterval(flush, BATCH_INTERVAL_MS);
    
    return () => {
      if (flushTimerRef.current) clearInterval(flushTimerRef.current);
    };
  }, [persistMutation]);
}
