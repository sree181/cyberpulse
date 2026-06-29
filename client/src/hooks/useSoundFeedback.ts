/**
 * useSoundFeedback — Connects sound engine to app state
 * 
 * Automatically plays audio cues when:
 *   - Critical/high severity threats arrive
 *   - Kiosk mode transitions between passive/interactive
 *   - New arcs appear on the globe
 * 
 * Must be mounted inside both ThreatProvider and KioskProvider.
 * Initializes AudioContext on first user interaction.
 */
import { useEffect, useRef, useCallback } from 'react';
import { soundEngine } from '@/lib/soundEngine';
import { useThreatData } from '@/contexts/ThreatContext';
import { useKiosk } from '@/contexts/KioskContext';

export function useSoundFeedback() {
  const { threats, activeArcs } = useThreatData();
  const { mode } = useKiosk();
  
  const prevThreatCountRef = useRef(0);
  const prevArcCountRef = useRef(0);
  const prevModeRef = useRef(mode);
  const initAttemptedRef = useRef(false);

  // Initialize audio on first user interaction
  const handleFirstInteraction = useCallback(() => {
    if (initAttemptedRef.current) return;
    initAttemptedRef.current = true;
    soundEngine.init();
    // Remove listeners after init
    document.removeEventListener('click', handleFirstInteraction);
    document.removeEventListener('touchstart', handleFirstInteraction);
  }, []);

  useEffect(() => {
    document.addEventListener('click', handleFirstInteraction, { once: true });
    document.addEventListener('touchstart', handleFirstInteraction, { once: true });
    return () => {
      document.removeEventListener('click', handleFirstInteraction);
      document.removeEventListener('touchstart', handleFirstInteraction);
    };
  }, [handleFirstInteraction]);

  // React to new threats
  useEffect(() => {
    const currentCount = threats.length;
    if (currentCount <= prevThreatCountRef.current) {
      prevThreatCountRef.current = currentCount;
      return;
    }

    // Check the newest threat
    const newest = threats[0];
    if (newest) {
      if (newest.severity === 'critical') {
        soundEngine.play('criticalAlert');
      } else if (newest.severity === 'high') {
        soundEngine.play('highAlert');
      } else {
        soundEngine.play('newThreat');
      }
    }

    prevThreatCountRef.current = currentCount;
  }, [threats]);

  // React to new arcs (impact sound)
  useEffect(() => {
    const currentCount = activeArcs.length;
    if (currentCount > prevArcCountRef.current) {
      soundEngine.play('arcImpact');
    }
    prevArcCountRef.current = currentCount;
  }, [activeArcs]);

  // React to mode transitions
  useEffect(() => {
    if (mode !== prevModeRef.current) {
      soundEngine.play('modeTransition');
      prevModeRef.current = mode;
    }
  }, [mode]);
}
