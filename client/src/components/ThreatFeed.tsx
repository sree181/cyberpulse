/**
 * ThreatFeed — Live scrolling terminal-style threat log
 * Cyberpunk aesthetic with color-coded severity and auto-scroll.
 */
import { useRef, useEffect } from 'react';
import { useThreatData } from '@/contexts/ThreatContext';
import { SEVERITY_COLORS, ATTACK_COLORS, type ThreatEvent } from '@/lib/threatEngine';

function formatTime(date: Date): string {
  return date.toISOString().replace('T', ' ').slice(11, 19);
}

function ThreatEntry({ threat }: { threat: ThreatEvent }) {
  const severityColor = SEVERITY_COLORS[threat.severity];
  const attackColor = ATTACK_COLORS[threat.attackType];

  return (
    <div 
      className="animate-slide-in border-l-2 px-2.5 py-1 font-data"
      style={{ borderLeftColor: severityColor }}
    >
      <div className="flex items-center gap-1.5 flex-wrap">
        <span 
          className="px-1 py-0 text-[8px] font-bold tracking-wider uppercase"
          style={{ 
            backgroundColor: `${attackColor}12`,
            color: attackColor,
            border: `1px solid ${attackColor}25`,
          }}
        >
          {threat.attackType}
        </span>
        <span 
          className="px-0.5 text-[7px] font-bold tracking-wider uppercase"
          style={{ color: severityColor }}
        >
          {threat.severity}
        </span>
        <span className="text-[#00F0FF]/30 text-[8px] ml-auto">
          {formatTime(threat.timestamp)}
        </span>
      </div>
      <div className="mt-0.5 text-[9px] text-[#8899aa]/60 flex items-center gap-1 flex-wrap">
        <span className="text-[#00F0FF]/60">{threat.sourceCountry}</span>
        <span className="text-[#00F0FF]/15">→</span>
        <span className="text-[#FFD700]/50">{threat.targetName}</span>
        <span className="text-[#00F0FF]/15">|</span>
        <span className="text-[#8899aa]/40">{threat.sourceIp}</span>
        <span className="text-[#00F0FF]/15">:</span>
        <span className="text-[#FF6600]/50">{threat.port}</span>
      </div>
    </div>
  );
}

export default function ThreatFeed() {
  const { recentThreats } = useThreatData();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [recentThreats]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-[#00F0FF]/10 shrink-0">
        <div className="font-data text-[10px] tracking-[0.2em] uppercase text-[#00F0FF]/60">
          Live Threat Feed
        </div>
        <div className="flex items-center gap-1.5">
          <div className="relative">
            <div className="w-1.5 h-1.5 rounded-full bg-[#00FF88]" />
            <div className="absolute inset-0 w-1.5 h-1.5 rounded-full bg-[#00FF88] animate-ping opacity-40" />
          </div>
          <span className="font-data text-[8px] text-[#00FF88]/70">LIVE</span>
        </div>
      </div>
      
      {/* Feed entries */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-px py-0.5"
        style={{ scrollBehavior: 'smooth' }}
      >
        {recentThreats.map((threat) => (
          <ThreatEntry key={threat.id} threat={threat} />
        ))}
      </div>
    </div>
  );
}
