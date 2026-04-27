/**
 * ThreatFeed — Live scrolling terminal-style threat log
 * ENHANCED: Critical alert flash, MITRE technique tags, protocol badges
 */
import { useRef, useEffect } from 'react';
import { useThreatData } from '@/contexts/ThreatContext';
import { SEVERITY_COLORS, ATTACK_COLORS, type ThreatEvent } from '@/lib/threatEngine';

function formatTime(date: Date): string {
  return date.toISOString().replace('T', ' ').slice(11, 19);
}

function ThreatEntry({ threat, isNew }: { threat: ThreatEvent; isNew: boolean }) {
  const severityColor = SEVERITY_COLORS[threat.severity];
  const attackColor = ATTACK_COLORS[threat.attackType];
  const isCritical = threat.severity === 'critical';

  return (
    <div 
      className={`animate-slide-in border-l-2 px-2.5 py-1 font-data relative overflow-hidden ${isCritical ? 'animate-critical-flash' : ''}`}
      style={{ borderLeftColor: severityColor }}
    >
      {/* Background glow for critical */}
      {isCritical && (
        <div className="absolute inset-0 bg-gradient-to-r from-[#FF1493]/[0.03] to-transparent pointer-events-none" />
      )}
      
      <div className="flex items-center gap-1.5 flex-wrap relative">
        <span 
          className="px-1 py-0 text-[8px] font-bold tracking-wider uppercase"
          style={{ 
            backgroundColor: `${attackColor}15`,
            color: attackColor,
            border: `1px solid ${attackColor}30`,
            textShadow: isCritical ? `0 0 4px ${attackColor}44` : 'none',
          }}
        >
          {threat.attackType}
        </span>
        <span 
          className="px-0.5 text-[7px] font-bold tracking-wider uppercase"
          style={{ color: severityColor, textShadow: `0 0 4px ${severityColor}44` }}
        >
          {threat.severity}
        </span>
        <span className="text-[#00F0FF]/30 text-[8px] ml-auto tabular-nums">
          {formatTime(threat.timestamp)}
        </span>
      </div>
      <div className="mt-0.5 text-[9px] text-[#8899aa]/60 flex items-center gap-1 flex-wrap relative">
        <span className="text-[#00F0FF]/60">{threat.sourceCountry}</span>
        <span className="text-[#00F0FF]/20">&rarr;</span>
        <span className="text-[#FFD700]/50">{threat.targetName}</span>
        <span className="text-[#00F0FF]/15">|</span>
        <span className="text-[#8899aa]/40 tabular-nums">{threat.sourceIp}</span>
        <span className="text-[#00F0FF]/15">:</span>
        <span className="text-[#FF6600]/50 tabular-nums">{threat.port}</span>
        <span className="text-[#8B00FF]/40 text-[7px]">{threat.protocol}</span>
      </div>
      {/* MITRE technique tag */}
      <div className="mt-0.5 text-[7px] text-[#8899aa]/25 relative">
        <span className="text-[#00BFFF]/25">[{threat.mitreTechnique}]</span>
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
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-[#00F0FF]/10 shrink-0 relative">
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
        {/* Scan line */}
        <div className="absolute bottom-0 left-0 right-0 h-[1px] overflow-hidden">
          <div className="w-1/3 h-full bg-gradient-to-r from-transparent via-[#00F0FF]/30 to-transparent animate-h-scan" />
        </div>
      </div>
      
      {/* Feed entries */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-px py-0.5"
        style={{ scrollBehavior: 'smooth' }}
      >
        {recentThreats.map((threat, i) => (
          <ThreatEntry key={threat.id} threat={threat} isNew={i === 0} />
        ))}
      </div>
    </div>
  );
}
