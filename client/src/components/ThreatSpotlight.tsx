/**
 * ThreatSpotlight — "Threat of the Day" cinematic spotlight panel
 * 
 * Displays a featured CVE from CISA KEV / NVD with:
 * - Dramatic animated border and glow effects
 * - CVSS score gauge with color-coded severity
 * - Auto-rotating through recent CVEs every 15 seconds
 * - Educational notes and MITRE ATT&CK mapping
 * - Ransomware campaign indicator
 */
import { trpc } from '@/lib/trpc';
import { useState, useEffect, useRef, useCallback } from 'react';

interface SpotlightCVE {
  cveId: string;
  title: string;
  description: string;
  vendor: string;
  product: string;
  cvssScore: number | null;
  severity: string;
  severityColor: string;
  dateAdded: string;
  mitreTactic: string;
  cwes: string[];
  isRansomwareRelated: boolean;
  isActivelyExploited: boolean;
  nvdUrl: string;
  educationalNote: string;
}

const ROTATION_INTERVAL = 15000; // 15 seconds per CVE

export default function ThreatSpotlight() {
  const { data, isLoading } = trpc.threats.threatOfTheDay.useQuery(undefined, {
    refetchInterval: 10 * 60 * 1000, // Refresh every 10 minutes
    retry: 2,
  });

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  // recentCVEs[0] is always the spotlight (Threat of the Day), rest are secondary
  const allCVEs = data?.recentCVEs || [];
  const currentCVE = allCVEs[currentIndex] || data?.spotlight;
  const isSpotlightShowing = currentIndex === 0;

  // Auto-rotate through CVEs
  useEffect(() => {
    if (allCVEs.length <= 1) return;
    const interval = setInterval(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentIndex(prev => (prev + 1) % allCVEs.length);
        setIsTransitioning(false);
      }, 400);
    }, ROTATION_INTERVAL);
    return () => clearInterval(interval);
  }, [allCVEs.length]);

  // Draw the CVSS gauge on canvas
  const drawGauge = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !currentCVE) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    const w = rect.width;
    const h = rect.height;
    const cx = w / 2;
    const cy = h / 2 + 4;
    const radius = Math.min(w, h) / 2 - 8;

    ctx.clearRect(0, 0, w, h);

    const score = currentCVE.cvssScore || 0;
    const maxScore = 10;
    const angle = (score / maxScore) * Math.PI * 1.5; // 270 degree arc
    const startAngle = Math.PI * 0.75; // Start at bottom-left

    // Background arc
    ctx.beginPath();
    ctx.arc(cx, cy, radius, startAngle, startAngle + Math.PI * 1.5, false);
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.08)';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Score arc with gradient
    if (score > 0) {
      const pulse = 0.8 + 0.2 * Math.sin(Date.now() / 800);
      const grad = ctx.createLinearGradient(0, 0, w, h);
      
      if (score >= 9) {
        grad.addColorStop(0, `rgba(255, 0, 64, ${pulse})`);
        grad.addColorStop(1, `rgba(255, 20, 147, ${pulse})`);
      } else if (score >= 7) {
        grad.addColorStop(0, `rgba(255, 102, 0, ${pulse})`);
        grad.addColorStop(1, `rgba(255, 0, 64, ${pulse})`);
      } else if (score >= 4) {
        grad.addColorStop(0, `rgba(255, 215, 0, ${pulse})`);
        grad.addColorStop(1, `rgba(255, 102, 0, ${pulse})`);
      } else {
        grad.addColorStop(0, `rgba(0, 255, 136, ${pulse})`);
        grad.addColorStop(1, `rgba(255, 215, 0, ${pulse})`);
      }

      ctx.beginPath();
      ctx.arc(cx, cy, radius, startAngle, startAngle + angle, false);
      ctx.strokeStyle = grad;
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.stroke();

      // Glow effect
      ctx.shadowColor = currentCVE.severityColor;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, startAngle, startAngle + angle, false);
      ctx.strokeStyle = `${currentCVE.severityColor}40`;
      ctx.lineWidth = 10;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // Score text
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 18px "JetBrains Mono", monospace';
    ctx.fillStyle = currentCVE.severityColor || '#00F0FF';
    ctx.fillText(score > 0 ? score.toFixed(1) : 'N/A', cx, cy - 4);

    // Label
    ctx.font = '7px "JetBrains Mono", monospace';
    ctx.fillStyle = 'rgba(136, 153, 170, 0.5)';
    ctx.fillText('CVSS', cx, cy + 14);

    animRef.current = requestAnimationFrame(drawGauge);
  }, [currentCVE]);

  useEffect(() => {
    animRef.current = requestAnimationFrame(drawGauge);
    return () => cancelAnimationFrame(animRef.current);
  }, [drawGauge]);

  if (isLoading || !currentCVE) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="font-data text-[10px] text-[#00F0FF]/30 animate-pulse tracking-wider">
          LOADING THREAT INTELLIGENCE...
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full h-full flex flex-col p-3 relative overflow-hidden transition-opacity duration-400 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
      {/* Animated border glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div 
          className="absolute top-0 left-0 right-0 h-[1px]"
          style={{
            background: `linear-gradient(90deg, transparent, ${currentCVE.severityColor}60, transparent)`,
            animation: 'pulse 3s ease-in-out infinite',
          }}
        />
        <div 
          className="absolute bottom-0 left-0 right-0 h-[1px]"
          style={{
            background: `linear-gradient(90deg, transparent, ${currentCVE.severityColor}30, transparent)`,
          }}
        />
      </div>

      {/* Header row */}
      <div className="flex items-center justify-between mb-2 shrink-0">
        <div className="flex items-center gap-2">
          <div className="font-data text-[8px] tracking-[0.2em] uppercase text-[#00F0FF]/40">
            {isSpotlightShowing ? 'Threat of the Day' : 'Threat Spotlight'}
          </div>
          {currentCVE.isActivelyExploited && (
            <div className="px-1.5 py-0.5 bg-[#FF0040]/15 border border-[#FF0040]/30 rounded-sm">
              <span className="font-data text-[7px] text-[#FF0040] tracking-wider uppercase animate-pulse">
                Actively Exploited
              </span>
            </div>
          )}
          {currentCVE.isRansomwareRelated && (
            <div className="px-1.5 py-0.5 bg-[#FF1493]/15 border border-[#FF1493]/30 rounded-sm">
              <span className="font-data text-[7px] text-[#FF1493] tracking-wider uppercase">
                Ransomware
              </span>
            </div>
          )}
        </div>
        <div className="font-data text-[7px] text-[#8899aa]/30">
          {data?.source || 'CISA KEV + NVD'} — {currentIndex + 1}/{allCVEs.length}
        </div>
      </div>

      {/* Main content: CVE ID + Gauge + Details */}
      <div className="flex gap-3 flex-1 min-h-0">
        {/* CVSS Gauge */}
        <div className="w-[70px] shrink-0 flex flex-col items-center">
          <canvas ref={canvasRef} className="w-[70px] h-[70px]" />
          <div 
            className="font-data text-[7px] tracking-wider uppercase mt-0.5"
            style={{ color: currentCVE.severityColor }}
          >
            {currentCVE.severity}
          </div>
        </div>

        {/* Details */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* CVE ID */}
          <div className="font-data text-[13px] font-bold tracking-wider" style={{ color: currentCVE.severityColor }}>
            {currentCVE.cveId}
          </div>

          {/* Vendor / Product */}
          <div className="font-data text-[9px] text-[#00F0FF]/50 mt-0.5 truncate">
            {currentCVE.vendor} — {currentCVE.product}
          </div>

          {/* Description */}
          <div className="font-body text-[9px] text-[#8899aa]/60 mt-1.5 leading-[1.4] line-clamp-3 overflow-hidden">
            {currentCVE.description}
          </div>

          {/* CWE Tags */}
          {currentCVE.cwes.length > 0 && (
            <div className="flex gap-1 mt-1.5 flex-wrap">
              {currentCVE.cwes.slice(0, 3).map(cwe => (
                <div key={cwe} className="px-1 py-0.5 bg-[#00F0FF]/05 border border-[#00F0FF]/15 rounded-sm">
                  <span className="font-data text-[7px] text-[#00F0FF]/40">{cwe}</span>
                </div>
              ))}
              {currentCVE.mitreTactic !== 'Unknown' && (
                <div className="px-1 py-0.5 bg-[#FF6600]/05 border border-[#FF6600]/15 rounded-sm">
                  <span className="font-data text-[7px] text-[#FF6600]/50">{currentCVE.mitreTactic.split(' — ')[0]}</span>
                </div>
              )}
            </div>
          )}

          {/* Educational Note */}
          <div className="mt-auto pt-1.5">
            <div className="font-data text-[7px] text-[#FFD700]/30 tracking-wider uppercase mb-0.5">
              Analyst Note
            </div>
            <div className="font-body text-[8px] text-[#FFD700]/40 leading-[1.3] line-clamp-2">
              {currentCVE.educationalNote}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom: date + rotation indicator */}
      <div className="flex items-center justify-between mt-1.5 shrink-0">
        <div className="font-data text-[7px] text-[#8899aa]/25">
          Added: {currentCVE.dateAdded}
        </div>
        {/* Rotation dots */}
        <div className="flex gap-1">
          {allCVEs.slice(0, 10).map((_, i) => (
            <div
              key={i}
              className={`w-1 h-1 rounded-full transition-all duration-300 ${
                i === currentIndex 
                  ? 'bg-[#00F0FF] shadow-[0_0_4px_rgba(0,240,255,0.5)]' 
                  : 'bg-[#00F0FF]/15'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
