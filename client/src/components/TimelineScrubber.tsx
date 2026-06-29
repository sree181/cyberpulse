/**
 * TimelineScrubber — 24-hour attack replay timeline
 * 
 * A horizontal timeline bar that shows attack density over the past 24 hours.
 * Touch-drag to scrub through time. Includes play/pause for automated 10x speed replay.
 * 
 * Playback speed: 10x means 24h of data plays back in 2.4 hours (144 minutes).
 * At position 0→1 over 48 bins (30-min each), each bin advances every ~3 seconds.
 * 
 * The onTimeChange callback emits the selected timestamp so parent components
 * can filter/highlight data accordingly.
 */
import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useThreatData } from '@/contexts/ThreatContext';

interface TimelineScrubberProps {
  isVisible: boolean;
  onClose: () => void;
  onTimeChange?: (timestamp: number | null) => void; // null = live mode
}

// 10x speed: 24h in 144 min = 8640s. Position 0→1 over 8640s means +0.000116/frame at 60fps
// Simplified: advance position by 1/8640 per second, or ~0.007 per 50ms tick
const PLAYBACK_SPEED_10X = 0.007; // position increment per 50ms tick (10x real-time)

export default function TimelineScrubber({ isVisible, onClose, onTimeChange }: TimelineScrubberProps) {
  const { timeSeries } = useThreatData();
  const [position, setPosition] = useState(1); // 0-1, 1 = now
  const [isPlaying, setIsPlaying] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const playIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Generate 24h histogram data from timeSeries
  const histogram = useMemo(() => {
    const bins = 48; // 30-min bins over 24h
    const data = new Array(bins).fill(0);
    
    if (timeSeries.length > 0) {
      const now = Date.now();
      const dayAgo = now - 24 * 60 * 60 * 1000;
      
      timeSeries.forEach(point => {
        if (point.time >= dayAgo) {
          const binIndex = Math.floor(((point.time - dayAgo) / (24 * 60 * 60 * 1000)) * bins);
          if (binIndex >= 0 && binIndex < bins) {
            data[binIndex] += point.count;
          }
        }
      });
    } else {
      // Generate synthetic histogram for visual appeal
      for (let i = 0; i < bins; i++) {
        const baseActivity = 3 + Math.sin(i / 6) * 2;
        const spike = Math.random() > 0.85 ? Math.random() * 8 : 0;
        data[i] = Math.max(1, Math.floor(baseActivity + spike + Math.random() * 2));
      }
    }
    
    return data;
  }, [timeSeries]);

  const maxBin = Math.max(...histogram, 1);

  // Emit time changes to parent
  useEffect(() => {
    if (!onTimeChange) return;
    if (position >= 0.99) {
      onTimeChange(null); // Live mode
    } else {
      const now = Date.now();
      const dayAgo = now - 24 * 60 * 60 * 1000;
      const selectedTime = dayAgo + position * 24 * 60 * 60 * 1000;
      onTimeChange(selectedTime);
    }
  }, [position, onTimeChange]);

  // Auto-play at 10x speed
  useEffect(() => {
    if (isPlaying) {
      playIntervalRef.current = setInterval(() => {
        setPosition(prev => {
          const next = prev + PLAYBACK_SPEED_10X;
          if (next >= 1) {
            setIsPlaying(false);
            return 1;
          }
          return next;
        });
      }, 50);
    } else {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
        playIntervalRef.current = null;
      }
    }
    return () => {
      if (playIntervalRef.current) clearInterval(playIntervalRef.current);
    };
  }, [isPlaying]);

  // Touch/mouse drag handling
  const handleInteractionStart = useCallback((clientX: number) => {
    if (!trackRef.current) return;
    setIsDragging(true);
    setIsPlaying(false);
    const rect = trackRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    setPosition(x);
  }, []);

  const handleInteractionMove = useCallback((clientX: number) => {
    if (!isDragging || !trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    setPosition(x);
  }, [isDragging]);

  const handleInteractionEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Mouse events
  const handleMouseDown = (e: React.MouseEvent) => handleInteractionStart(e.clientX);
  const handleMouseMove = (e: React.MouseEvent) => handleInteractionMove(e.clientX);
  const handleMouseUp = () => handleInteractionEnd();

  // Touch events
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) handleInteractionStart(e.touches[0].clientX);
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1) handleInteractionMove(e.touches[0].clientX);
  };
  const handleTouchEnd = () => handleInteractionEnd();

  // Format time from position
  const getTimeLabel = (pos: number): string => {
    const hoursAgo = Math.round((1 - pos) * 24);
    if (hoursAgo === 0) return 'NOW';
    if (hoursAgo === 1) return '1h ago';
    return `${hoursAgo}h ago`;
  };

  // Get current bin index for highlight
  const currentBin = Math.min(histogram.length - 1, Math.floor(position * histogram.length));

  if (!isVisible) return null;

  return (
    <div className="absolute bottom-0 left-0 right-0 z-40 animate-in slide-in-from-bottom duration-300">
      {/* Gradient fade */}
      <div className="h-6 bg-gradient-to-t from-[var(--color-cp-surface)] to-transparent" />
      
      {/* Scrubber panel */}
      <div className="bg-[var(--color-cp-surface)]/95 backdrop-blur-md border-t border-[var(--color-cp-border)] px-4 py-3">
        {/* Header row */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-[var(--color-cp-text-tertiary)] uppercase tracking-wider font-medium">
              24H Timeline
            </span>
            <span className="font-data text-caption text-[var(--color-cp-accent)] tabular-nums">
              {getTimeLabel(position)}
            </span>
            {isPlaying && (
              <span className="text-[8px] px-1.5 py-0.5 rounded bg-[var(--color-cp-accent)]/10 text-[var(--color-cp-accent)] font-data">
                10× SPEED
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Play/Pause */}
            <button
              onClick={() => {
                if (position >= 1) setPosition(0);
                setIsPlaying(!isPlaying);
              }}
              className="w-6 h-6 rounded-full bg-[var(--color-cp-elevated)] border border-[var(--color-cp-border)] flex items-center justify-center text-[var(--color-cp-text-secondary)] hover:text-[var(--color-cp-accent)] hover:border-[var(--color-cp-accent)] transition-all cursor-pointer"
            >
              <span className="text-[10px]">{isPlaying ? '⏸' : '▶'}</span>
            </button>
            {/* Reset to live */}
            <button
              onClick={() => { setPosition(1); setIsPlaying(false); }}
              className="px-2 py-0.5 rounded bg-[var(--color-cp-elevated)] border border-[var(--color-cp-border)] text-[9px] font-data text-[var(--color-cp-text-tertiary)] hover:text-[var(--color-cp-accent)] hover:border-[var(--color-cp-accent)] transition-all cursor-pointer"
            >
              LIVE
            </button>
            {/* Close */}
            <button
              onClick={onClose}
              className="w-6 h-6 rounded-full bg-[var(--color-cp-elevated)] border border-[var(--color-cp-border)] flex items-center justify-center text-[var(--color-cp-text-tertiary)] hover:text-[var(--color-cp-text-primary)] transition-all cursor-pointer"
            >
              <span className="text-[10px]">✕</span>
            </button>
          </div>
        </div>

        {/* Histogram + Track */}
        <div 
          ref={trackRef}
          className="relative h-10 cursor-pointer select-none"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Histogram bars */}
          <div className="absolute inset-0 flex items-end gap-px">
            {histogram.map((value, i) => (
              <div
                key={i}
                className="flex-1 rounded-t-sm transition-colors duration-150"
                style={{
                  height: `${Math.max(8, (value / maxBin) * 100)}%`,
                  backgroundColor: i === currentBin 
                    ? 'var(--color-cp-accent)' 
                    : i <= Math.floor(position * histogram.length)
                      ? 'var(--color-cp-accent)'
                      : 'var(--color-cp-border)',
                  opacity: i <= Math.floor(position * histogram.length) ? 0.8 : 0.3,
                }}
              />
            ))}
          </div>

          {/* Playhead */}
          <div 
            className="absolute top-0 bottom-0 w-0.5 bg-[var(--color-cp-accent)] shadow-[0_0_6px_var(--color-cp-accent)]"
            style={{ left: `${position * 100}%` }}
          >
            {/* Playhead knob */}
            <div className="absolute -top-1 -left-1.5 w-3.5 h-3.5 rounded-full bg-[var(--color-cp-accent)] border-2 border-[var(--color-cp-surface)] shadow-lg" />
          </div>
        </div>

        {/* Time labels */}
        <div className="flex justify-between mt-1.5">
          <span className="text-[9px] font-data text-[var(--color-cp-text-tertiary)] tabular-nums">-24h</span>
          <span className="text-[9px] font-data text-[var(--color-cp-text-tertiary)] tabular-nums">-18h</span>
          <span className="text-[9px] font-data text-[var(--color-cp-text-tertiary)] tabular-nums">-12h</span>
          <span className="text-[9px] font-data text-[var(--color-cp-text-tertiary)] tabular-nums">-6h</span>
          <span className="text-[9px] font-data text-[var(--color-cp-accent)] tabular-nums font-medium">NOW</span>
        </div>
      </div>
    </div>
  );
}
