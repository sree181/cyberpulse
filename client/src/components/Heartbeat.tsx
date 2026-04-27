/**
 * Heartbeat — EKG-style waveform showing network health
 * ENHANCED: Triple-wave with threat-responsive intensity, magenta critical wave
 */
import { useEffect, useRef } from 'react';
import { useThreatData } from '@/contexts/ThreatContext';

export default function Heartbeat() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { stats } = useThreatData();
  const animRef = useRef<number>(0);
  const offsetRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      const w = canvas.width = canvas.offsetWidth * 2;
      const h = canvas.height = canvas.offsetHeight * 2;
      ctx.scale(2, 2);
      const displayW = canvas.offsetWidth;
      const displayH = canvas.offsetHeight;

      ctx.clearRect(0, 0, displayW, displayH);
      
      const midY = displayH / 2;
      const intensity = Math.min(stats.attacksPerMinute / 30, 1);
      
      // Primary cyan wave
      ctx.beginPath();
      ctx.strokeStyle = `rgba(0, 240, 255, ${0.35 + intensity * 0.5})`;
      ctx.lineWidth = 1.5;
      ctx.shadowColor = '#00F0FF';
      ctx.shadowBlur = 6 + intensity * 10;

      offsetRef.current += 1.8;

      for (let x = 0; x < displayW; x++) {
        const t = (x + offsetRef.current) * 0.02;
        const spike = Math.sin(t * 3) > 0.95 ? Math.sin(t * 3) * 12 * (1 + intensity) : 0;
        const base = Math.sin(t) * 2 + Math.sin(t * 2.3) * 1.5;
        const noise = Math.sin(t * 7) * 0.5 * intensity;
        const y = midY + base + spike + noise;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Secondary faint cyan wave
      ctx.beginPath();
      ctx.strokeStyle = `rgba(0, 240, 255, ${0.08 + intensity * 0.12})`;
      ctx.lineWidth = 0.5;

      for (let x = 0; x < displayW; x++) {
        const t = (x + offsetRef.current * 0.7) * 0.015;
        const y = midY + Math.sin(t) * 3 + Math.sin(t * 1.7) * 2;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Third magenta wave — critical threat indicator
      if (stats.critical > 0) {
        const critIntensity = Math.min(stats.critical / 10, 1);
        ctx.beginPath();
        ctx.strokeStyle = `rgba(255, 20, 147, ${0.1 + critIntensity * 0.3})`;
        ctx.lineWidth = 0.8;
        ctx.shadowColor = '#FF1493';
        ctx.shadowBlur = 4;

        for (let x = 0; x < displayW; x++) {
          const t = (x + offsetRef.current * 1.2) * 0.025;
          const y = midY + Math.sin(t * 1.5) * 2.5 + Math.sin(t * 3.7) * 1;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      // Status text
      ctx.font = '8px "JetBrains Mono", monospace';
      ctx.fillStyle = 'rgba(0, 240, 255, 0.2)';
      ctx.fillText('NETWORK HEALTH', 6, displayH - 3);

      const healthPct = (100 - intensity * 30).toFixed(0);
      ctx.fillStyle = intensity > 0.7 ? 'rgba(255, 0, 64, 0.5)' : 'rgba(0, 255, 136, 0.4)';
      ctx.textAlign = 'right';
      ctx.fillText(`${healthPct}%`, displayW - 6, displayH - 3);
      ctx.textAlign = 'left';

      animRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [stats.attacksPerMinute, stats.critical]);

  return (
    <div className="w-full h-full relative">
      <canvas 
        ref={canvasRef} 
        className="w-full h-full"
        style={{ imageRendering: 'auto' }}
      />
    </div>
  );
}
