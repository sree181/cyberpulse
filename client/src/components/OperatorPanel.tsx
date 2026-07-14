/**
 * OperatorPanel — Display Engineering: Hidden Admin Overlay
 * 
 * Accessible via triple-tap on any corner of the screen.
 * Provides display management controls for operators/staff:
 * - Force refresh
 * - Toggle fullscreen
 * - View diagnostics (FPS, uptime, connection health)
 * - Adjust brightness
 * - Lock/unlock touch
 * - Data source status
 * 
 * Auto-hides after 30s of inactivity.
 */
import { useEffect, useState, useRef } from 'react';
import { useSoundEngine } from '@/components/SoundEngine';

interface OperatorPanelProps {
  isOpen: boolean;
  onClose: () => void;
  diagnostics: {
    fps: number;
    uptime: number;
    isFullscreen: boolean;
    isWakeLocked: boolean;
    connectionHealth: 'healthy' | 'degraded' | 'offline';
    lastError: string | null;
    idleState: string;
    brightness: number;
  };
  onAction: (action: 'refresh' | 'fullscreen' | 'exit_fullscreen' | 'clear_cache' | 'brightness_up' | 'brightness_down' | 'reset_layout' | 'toggle_layout_lock') => void;
  isLayoutLocked?: boolean;
}

export default function OperatorPanel({ isOpen, onClose, diagnostics, onAction, isLayoutLocked = true }: OperatorPanelProps) {
  const { enabled: soundEnabled, setEnabled: setSoundEnabled, volume, setVolume } = useSoundEngine();
  const [autoCloseTimer, setAutoCloseTimer] = useState(30);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-close after 30s
  useEffect(() => {
    if (!isOpen) return;
    setAutoCloseTimer(30);
    
    timerRef.current = setInterval(() => {
      setAutoCloseTimer(prev => {
        if (prev <= 1) {
          onClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const formatUptime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const healthColor = {
    healthy: 'text-green-400',
    degraded: 'text-amber-400',
    offline: 'text-red-400',
  }[diagnostics.connectionHealth];

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md">
      <div 
        className="bg-[#0a1628] border border-[#1a3a5c] rounded-2xl p-8 max-w-lg w-full mx-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-amber-500 animate-pulse" />
            <h2 className="text-xl font-bold text-white tracking-wider uppercase">Operator Panel</h2>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500 font-mono">Auto-close: {autoCloseTimer}s</span>
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors text-2xl leading-none cursor-pointer"
            >
              &times;
            </button>
          </div>
        </div>

        {/* Diagnostics Grid */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <DiagCard label="FPS" value={`${diagnostics.fps}`} status={diagnostics.fps > 30 ? 'good' : diagnostics.fps > 15 ? 'warn' : 'bad'} />
          <DiagCard label="UPTIME" value={formatUptime(diagnostics.uptime)} status="good" />
          <DiagCard label="CONNECTION" value={diagnostics.connectionHealth.toUpperCase()} status={diagnostics.connectionHealth === 'healthy' ? 'good' : diagnostics.connectionHealth === 'degraded' ? 'warn' : 'bad'} />
          <DiagCard label="FULLSCREEN" value={diagnostics.isFullscreen ? 'YES' : 'NO'} status={diagnostics.isFullscreen ? 'good' : 'warn'} />
          <DiagCard label="WAKE LOCK" value={diagnostics.isWakeLocked ? 'ACTIVE' : 'OFF'} status={diagnostics.isWakeLocked ? 'good' : 'warn'} />
          <DiagCard label="IDLE STATE" value={diagnostics.idleState.toUpperCase()} status={diagnostics.idleState === 'active' ? 'good' : 'warn'} />
        </div>

        {/* Brightness Control */}
        <div className="mb-6 p-4 bg-[#0c1e38] rounded-lg border border-[#1a3a5c]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400 uppercase tracking-wider">Brightness</span>
            <span className="text-sm text-white font-mono">{Math.round(diagnostics.brightness * 100)}%</span>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => onAction('brightness_down')}
              className="w-10 h-10 rounded-lg bg-[#1a3a5c] text-white flex items-center justify-center text-xl hover:bg-[#2a4a6c] transition-colors cursor-pointer"
            >
              −
            </button>
            <div className="flex-1 h-2 bg-[#1a3a5c] rounded-full overflow-hidden">
              <div 
                className="h-full bg-amber-500 rounded-full transition-all duration-300"
                style={{ width: `${diagnostics.brightness * 100}%` }}
              />
            </div>
            <button 
              onClick={() => onAction('brightness_up')}
              className="w-10 h-10 rounded-lg bg-[#1a3a5c] text-white flex items-center justify-center text-xl hover:bg-[#2a4a6c] transition-colors cursor-pointer"
            >
              +
            </button>
          </div>
        </div>

        {/* Audio Volume Control */}
        <div className="mb-6 p-4 bg-[#0c1e38] rounded-lg border border-[#1a3a5c]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400 uppercase tracking-wider">Audio</span>
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`text-xs px-2 py-0.5 rounded cursor-pointer ${
                soundEnabled ? 'bg-green-700/50 text-green-300' : 'bg-gray-700/50 text-gray-400'
              }`}
            >
              {soundEnabled ? 'ON' : 'OFF'}
            </button>
          </div>
          {soundEnabled && (
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setVolume(Math.max(0, volume - 0.1))}
                className="w-10 h-10 rounded-lg bg-[#1a3a5c] text-white flex items-center justify-center text-xl hover:bg-[#2a4a6c] transition-colors cursor-pointer"
              >
                −
              </button>
              <div className="flex-1 h-2 bg-[#1a3a5c] rounded-full overflow-hidden">
                <div 
                  className="h-full bg-cyan-500 rounded-full transition-all duration-300"
                  style={{ width: `${volume * 100}%` }}
                />
              </div>
              <button 
                onClick={() => setVolume(Math.min(1, volume + 0.1))}
                className="w-10 h-10 rounded-lg bg-[#1a3a5c] text-white flex items-center justify-center text-xl hover:bg-[#2a4a6c] transition-colors cursor-pointer"
              >
                +
              </button>
              <span className="text-sm text-white font-mono w-10 text-right">{Math.round(volume * 100)}%</span>
            </div>
          )}
        </div>

        {/* Last Error */}
        {diagnostics.lastError && (
          <div className="mb-6 p-3 bg-red-900/30 border border-red-700/50 rounded-lg">
            <span className="text-xs text-red-300 font-mono">{diagnostics.lastError}</span>
          </div>
        )}

        {/* Layout Controls */}
        <div className="mb-4 p-3 bg-[#0c1e38] rounded-lg border border-cyan-900/50">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Panel Layout</div>
          <div className="grid grid-cols-2 gap-2">
            <ActionButton 
              label={isLayoutLocked ? "Unlock Panels" : "Lock Panels"} 
              icon={isLayoutLocked ? "🔒" : "🔓"} 
              onClick={() => onAction('toggle_layout_lock')} 
              variant={isLayoutLocked ? 'default' : 'primary'}
            />
            <ActionButton 
              label="Reset Layout" 
              icon="↺" 
              onClick={() => onAction('reset_layout')} 
              variant="default"
            />
          </div>
          {!isLayoutLocked && (
            <div className="mt-2 text-[10px] text-cyan-400 font-mono">
              ✦ Edit mode active — drag panel handles to reorder
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <ActionButton 
            label="Force Refresh" 
            icon="↻" 
            onClick={() => onAction('refresh')} 
            variant="primary"
          />
          <ActionButton 
            label={diagnostics.isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"} 
            icon="⛶" 
            onClick={() => onAction(diagnostics.isFullscreen ? 'exit_fullscreen' : 'fullscreen')} 
          />
          <ActionButton 
            label="Clear Cache" 
            icon="🗑" 
            onClick={() => onAction('clear_cache')} 
            variant="danger"
          />
          <ActionButton 
            label="Close Panel" 
            icon="✕" 
            onClick={onClose} 
          />
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-[#1a3a5c] flex items-center justify-between">
          <span className="text-xs text-gray-600 font-mono">CyberPulse Display Engine v2.0</span>
          <span className="text-xs text-gray-600 font-mono">Triple-tap corner to access</span>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function DiagCard({ label, value, status }: { label: string; value: string; status: 'good' | 'warn' | 'bad' }) {
  const statusColor = {
    good: 'text-green-400 border-green-900/50',
    warn: 'text-amber-400 border-amber-900/50',
    bad: 'text-red-400 border-red-900/50',
  }[status];

  return (
    <div className={`p-3 bg-[#0c1e38] rounded-lg border ${statusColor.split(' ')[1]}`}>
      <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">{label}</div>
      <div className={`text-sm font-mono font-bold ${statusColor.split(' ')[0]}`}>{value}</div>
    </div>
  );
}

function ActionButton({ label, icon, onClick, variant = 'default' }: { 
  label: string; icon: string; onClick: () => void; variant?: 'default' | 'primary' | 'danger' 
}) {
  const variantStyles = {
    default: 'bg-[#1a3a5c] hover:bg-[#2a4a6c] text-gray-200',
    primary: 'bg-blue-700 hover:bg-blue-600 text-white',
    danger: 'bg-red-900/50 hover:bg-red-800/50 text-red-300',
  }[variant];

  return (
    <button 
      onClick={onClick}
      className={`${variantStyles} rounded-lg px-4 py-3 flex items-center justify-center gap-2 transition-colors cursor-pointer`}
    >
      <span className="text-lg">{icon}</span>
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}
