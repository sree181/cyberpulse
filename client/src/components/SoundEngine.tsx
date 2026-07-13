/**
 * SoundEngine — Web Audio API sound design for threat intelligence
 * 
 * Synthesized sounds (no external audio files needed):
 * - Ambient hum: Low-frequency drone that creates atmosphere
 * - Threat bleep: Short tonal ping when new threat arrives
 * - Critical alert: Escalating tone for critical severity
 * - Data tick: Subtle click for data updates
 * 
 * All sounds are generated via Web Audio API oscillators and filters.
 * Volume is controlled globally and respects user preference.
 */
import { useEffect, useRef, useCallback, createContext, useContext, useState, type ReactNode } from 'react';
import { useThreatData } from '@/contexts/ThreatContext';

interface SoundEngineContextType {
  enabled: boolean;
  setEnabled: (v: boolean) => void;
  volume: number;
  setVolume: (v: number) => void;
  playBleep: () => void;
  playCriticalAlert: () => void;
  playDataTick: () => void;
}

const SoundEngineContext = createContext<SoundEngineContextType>({
  enabled: false,
  setEnabled: () => {},
  volume: 0.3,
  setVolume: () => {},
  playBleep: () => {},
  playCriticalAlert: () => {},
  playDataTick: () => {},
});

export function useSoundEngine() {
  return useContext(SoundEngineContext);
}

export function SoundEngineProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabled] = useState(false);
  const [volume, setVolume] = useState(0.3);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const ambientRef = useRef<{ osc: OscillatorNode; gain: GainNode } | null>(null);
  const { activeArcs } = useThreatData();
  const prevArcCountRef = useRef(0);

  // Initialize AudioContext on first enable
  useEffect(() => {
    if (!enabled) {
      // Stop ambient when disabled
      if (ambientRef.current) {
        ambientRef.current.gain.gain.linearRampToValueAtTime(0, audioCtxRef.current!.currentTime + 0.5);
        setTimeout(() => {
          ambientRef.current?.osc.stop();
          ambientRef.current = null;
        }, 600);
      }
      return;
    }

    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext();
      masterGainRef.current = audioCtxRef.current.createGain();
      masterGainRef.current.gain.value = volume;
      masterGainRef.current.connect(audioCtxRef.current.destination);
    }

    // Resume if suspended
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }

    // Start ambient hum
    if (!ambientRef.current && audioCtxRef.current && masterGainRef.current) {
      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = 'sawtooth';
      osc.frequency.value = 55; // Low A — deep hum
      
      filter.type = 'lowpass';
      filter.frequency.value = 120;
      filter.Q.value = 2;

      gain.gain.value = 0;
      
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(masterGainRef.current);
      
      osc.start();
      gain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 2); // Fade in over 2s

      ambientRef.current = { osc, gain };
    }
  }, [enabled]);

  // Update master volume
  useEffect(() => {
    if (masterGainRef.current) {
      masterGainRef.current.gain.linearRampToValueAtTime(
        volume,
        audioCtxRef.current!.currentTime + 0.1
      );
    }
  }, [volume]);

  // Play threat bleep
  const playBleep = useCallback(() => {
    if (!enabled || !audioCtxRef.current || !masterGainRef.current) return;
    const ctx = audioCtxRef.current;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.value = 880; // A5 — clean ping
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.15);

    gain.gain.value = 0.3;
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);

    osc.connect(gain);
    gain.connect(masterGainRef.current);

    osc.start();
    osc.stop(ctx.currentTime + 0.2);
  }, [enabled]);

  // Play critical alert — escalating two-tone
  const playCriticalAlert = useCallback(() => {
    if (!enabled || !audioCtxRef.current || !masterGainRef.current) return;
    const ctx = audioCtxRef.current;

    // First tone
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'square';
    osc1.frequency.value = 660;
    gain1.gain.value = 0.2;
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    osc1.connect(gain1);
    gain1.connect(masterGainRef.current);
    osc1.start();
    osc1.stop(ctx.currentTime + 0.15);

    // Second tone (higher, delayed)
    setTimeout(() => {
      if (!audioCtxRef.current || !masterGainRef.current) return;
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'square';
      osc2.frequency.value = 880;
      gain2.gain.value = 0.25;
      gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      osc2.connect(gain2);
      gain2.connect(masterGainRef.current!);
      osc2.start();
      osc2.stop(ctx.currentTime + 0.2);
    }, 150);
  }, [enabled]);

  // Play data tick — very subtle click
  const playDataTick = useCallback(() => {
    if (!enabled || !audioCtxRef.current || !masterGainRef.current) return;
    const ctx = audioCtxRef.current;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.value = 2000;

    gain.gain.value = 0.08;
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03);

    osc.connect(gain);
    gain.connect(masterGainRef.current);

    osc.start();
    osc.stop(ctx.currentTime + 0.03);
  }, [enabled]);

  // Auto-play sounds when new threats arrive
  useEffect(() => {
    if (!enabled) return;
    
    const currentCount = activeArcs.length;
    if (currentCount > prevArcCountRef.current) {
      // New threats arrived
      const newCount = currentCount - prevArcCountRef.current;
      
      // Check if any are critical
      const hasCritical = activeArcs.slice(-newCount).some(a => a.severity === 'critical');
      
      if (hasCritical) {
        playCriticalAlert();
      } else {
        playBleep();
      }
    }
    prevArcCountRef.current = currentCount;
  }, [activeArcs.length, enabled, playBleep, playCriticalAlert]);

  return (
    <SoundEngineContext.Provider value={{
      enabled,
      setEnabled,
      volume,
      setVolume,
      playBleep,
      playCriticalAlert,
      playDataTick,
    }}>
      {children}
    </SoundEngineContext.Provider>
  );
}

export default SoundEngineProvider;
