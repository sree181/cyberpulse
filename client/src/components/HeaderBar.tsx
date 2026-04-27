/**
 * HeaderBar — Top persistent bar with UTC time, title, and system status
 * ENHANCED: Live data indicator, more dramatic styling, pulsing threat counter
 */
import { useState, useEffect } from 'react';
import { useThreatData } from '@/contexts/ThreatContext';

export default function HeaderBar() {
  const [time, setTime] = useState(new Date());
  const { stats, isLive, realDataStatus } = useThreatData();

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const utcTime = time.toISOString().replace('T', ' ').slice(0, 19);

  return (
    <div className="flex items-center justify-between px-4 py-1.5 border-b border-[#00F0FF]/15 bg-[#050510]/95 backdrop-blur-sm shrink-0 relative z-20">
      {/* Subtle top glow line */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#00F0FF]/30 to-transparent" />
      
      {/* Left: System status */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="relative">
            <div className={`w-2 h-2 rounded-full ${isLive ? 'bg-[#00FF88]' : 'bg-amber-500'}`} />
            <div className={`absolute inset-0 w-2 h-2 rounded-full ${isLive ? 'bg-[#00FF88]' : 'bg-amber-500'} animate-ping opacity-40`} />
          </div>
          <span className={`font-data text-[9px] tracking-[0.15em] uppercase ${isLive ? 'text-[#00FF88]/80' : 'text-amber-500/80'}`}>
            {isLive ? 'Live Feed' : realDataStatus.includes('Fallback') ? 'Fallback' : 'Cached'}
          </span>
        </div>
        <div className="h-3 w-px bg-[#00F0FF]/10" />
        <div className="font-data text-[9px] text-[#8899aa]/40">
          BLOCKED <span className="text-[#00FF88]/70">{stats.blockedPercent.toFixed(1)}%</span>
        </div>
        <div className="h-3 w-px bg-[#00F0FF]/10" />
        <div className="font-data text-[9px] text-[#8899aa]/40">
          SOURCE <span className="text-[#00F0FF]/50">DShield/ISC SANS</span>
        </div>
      </div>

      {/* Center: Title */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
        <div className="font-data text-[15px] font-bold tracking-[0.4em] uppercase text-[#00F0FF] relative">
          CyberPulse
          {/* Glow effect behind title */}
          <div className="absolute inset-0 blur-lg bg-[#00F0FF]/10 -z-10" />
        </div>
        <div className="font-data text-[7px] tracking-[0.3em] uppercase text-[#00F0FF]/25 mt-[-1px]">
          IS&A Data Immersion Lab — Real-Time Threat Intelligence
        </div>
      </div>

      {/* Right: Time and threat count */}
      <div className="flex items-center gap-4">
        <div className="font-data text-[9px] text-[#8899aa]/40">
          THREATS <span className="text-[#FF1493]/90 font-bold text-[10px]">{stats.total.toLocaleString()}</span>
        </div>
        <div className="h-3 w-px bg-[#00F0FF]/10" />
        <div className="font-data text-[9px] text-[#8899aa]/40">
          ATK/MIN <span className="text-[#FF6600]/90 font-bold text-[10px]">{stats.attacksPerMinute}</span>
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
