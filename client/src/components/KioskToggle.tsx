/**
 * KioskToggle — Mode switch button for passive/interactive display
 * 
 * Shows current mode and countdown to passive mode.
 * In passive mode, shows a subtle "touch to interact" prompt.
 */
import { useKiosk } from '@/contexts/KioskContext';

export default function KioskToggle() {
  const { mode, toggleMode, secondsUntilPassive } = useKiosk();

  if (mode === 'passive') {
    return (
      <button
        onClick={toggleMode}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-full bg-[var(--color-cp-surface)]/80 backdrop-blur-md border border-[var(--color-cp-border)] shadow-2xl animate-pulse cursor-pointer"
      >
        <span className="text-caption text-[var(--color-cp-text-secondary)] font-medium">
          Touch anywhere to interact
        </span>
      </button>
    );
  }

  return (
    <button
      onClick={toggleMode}
      className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-[var(--color-cp-elevated)] border border-[var(--color-cp-border)] hover:border-[var(--color-cp-accent)] transition-all cursor-pointer"
      title="Switch to passive display mode"
    >
      <div className="flex items-center gap-1.5">
        {/* Mode indicator */}
        <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
        <span className="text-[9px] font-data text-[var(--color-cp-text-secondary)] uppercase tracking-wider">
          Interactive
        </span>
      </div>
      {/* Countdown */}
      {secondsUntilPassive <= 15 && (
        <span className="text-[8px] font-data tabular-nums text-[var(--color-cp-text-tertiary)]">
          {secondsUntilPassive}s
        </span>
      )}
    </button>
  );
}
