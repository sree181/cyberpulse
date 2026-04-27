/**
 * HeaderBar — Top persistent bar with UTC time, title, and system status
 * Inspired by military C4ISR command center displays.
 * Includes department branding for the Business School IS&A.
 */
import { useState, useEffect } from 'react';
import { useThreatData } from '@/contexts/ThreatContext';

export default function HeaderBar() {
  const [time, setTime] = useState(new Date());
  const { stats } = useThreatData();

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const utcTime = time.toISOString().replace('T', ' ').slice(0, 19);

  return (
    <div className="flex items-center justify-between px-4 py-1.5 border-b border-[#00F0FF]/15 bg-[#050510]/95 backdrop-blur-sm shrink-0 relative z-20">
      {/* Left: System status */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="relative">
            <div className="w-2 h-2 rounded-full bg-[#00FF88]" />
            <div className="absolute inset-0 w-2 h-2 rounded-full bg-[#00FF88] animate-ping opacity-40" />
          </div>
          <span className="font-data text-[9px] tracking-[0.15em] text-[#00FF88]/80 uppercase">
            Online
          </span>
        </div>
        <div className="h-3 w-px bg-[#00F0FF]/10" />
        <div className="font-data text-[9px] text-[#8899aa]/40">
          UPTIME <span className="text-[#00F0FF]/60">99.97%</span>
        </div>
        <div className="h-3 w-px bg-[#00F0FF]/10" />
        <div className="font-data text-[9px] text-[#8899aa]/40">
          BLOCKED <span className="text-[#00FF88]/70">{stats.blockedPercent.toFixed(1)}%</span>
        </div>
      </div>

      {/* Center: Title */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
        <div className="font-data text-[14px] font-bold tracking-[0.35em] uppercase text-[#00F0FF]">
          CyberPulse
        </div>
        <div className="font-data text-[7px] tracking-[0.3em] uppercase text-[#00F0FF]/25 mt-[-1px]">
          IS&A Data Immersion Lab — Threat Intelligence
        </div>
      </div>

      {/* Right: Time and threat count */}
      <div className="flex items-center gap-4">
        <div className="font-data text-[9px] text-[#8899aa]/40">
          THREATS <span className="text-[#FF1493]/80 font-bold">{stats.total.toLocaleString()}</span>
        </div>
        <div className="h-3 w-px bg-[#00F0FF]/10" />
        <div className="font-data text-[9px] text-[#8899aa]/40">
          ATK/MIN <span className="text-[#FF6600]/80 font-bold">{stats.attacksPerMinute}</span>
        </div>
        <div className="h-3 w-px bg-[#00F0FF]/10" />
        <div className="font-data text-[11px] tabular-nums tracking-wider text-[#00F0FF]/70">
          {utcTime}
          <span className="text-[#00F0FF]/25 ml-1 text-[8px]">UTC</span>
        </div>
      </div>
    </div>
  );
}
