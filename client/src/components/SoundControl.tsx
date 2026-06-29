/**
 * SoundControl — Mute/unmute toggle button for the header bar
 * 
 * Shows a speaker icon that toggles sound effects on/off.
 * Initializes AudioContext on first enable if not already done.
 */
import { useState, useCallback } from 'react';
import { soundEngine } from '@/lib/soundEngine';
import { dataSonification } from '@/lib/dataSonification';

export default function SoundControl() {
  const [enabled, setEnabled] = useState(soundEngine.isEnabled());

  const toggle = useCallback(() => {
    const next = !enabled;
    
    // Initialize on first enable
    if (next && !soundEngine.isInitialized()) {
      soundEngine.init();
    }
    
    soundEngine.setEnabled(next);
    if (next) {
      dataSonification.enable();
    } else {
      dataSonification.disable();
    }
    setEnabled(next);
    
    // Play a confirmation sound when enabling
    if (next) {
      soundEngine.play('modeTransition');
    }
  }, [enabled]);

  return (
    <button
      onClick={toggle}
      className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-[var(--color-cp-elevated)] border border-[var(--color-cp-border)] hover:border-[var(--color-cp-accent)] transition-all cursor-pointer group"
      title={enabled ? 'Mute sound effects' : 'Enable sound effects'}
    >
      {/* Speaker icon */}
      <svg 
        width="12" 
        height="12" 
        viewBox="0 0 16 16" 
        fill="none" 
        className={`transition-colors ${enabled ? 'text-[var(--color-cp-accent)]' : 'text-[var(--color-cp-text-tertiary)]'}`}
      >
        {enabled ? (
          <>
            <path d="M2 5h2.5l3.5-3v12l-3.5-3H2a1 1 0 01-1-1V6a1 1 0 011-1z" fill="currentColor" />
            <path d="M11 4.5c1.2 1 2 2.5 2 3.5s-.8 2.5-2 3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            <path d="M12.5 2.5c2 1.5 3 3.5 3 5.5s-1 4-3 5.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.5" />
          </>
        ) : (
          <>
            <path d="M2 5h2.5l3.5-3v12l-3.5-3H2a1 1 0 01-1-1V6a1 1 0 011-1z" fill="currentColor" />
            <path d="M11 5.5l4 5M15 5.5l-4 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </>
        )}
      </svg>
      <span className="text-[9px] font-data text-[var(--color-cp-text-tertiary)] group-hover:text-[var(--color-cp-text-secondary)] transition-colors">
        {enabled ? 'ON' : 'OFF'}
      </span>
    </button>
  );
}
