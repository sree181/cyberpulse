/**
 * Heartbeat — EKG-style waveform showing network health
 * Persistent bottom bar that pulses with network activity.
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
      
      // Draw the waveform
      const midY = displayH / 2;
      const intensity = Math.min(stats.attacksPerMinute / 30, 1);
      
      ctx.beginPath();
      ctx.strokeStyle = `rgba(0, 240, 255, ${0.3 + intensity * 0.5})`;
      ctx.lineWidth = 1.5;
      ctx.shadowColor = '#00F0FF';
      ctx.shadowBlur = 4 + intensity * 8;

      offsetRef.current += 1.5;

      for (let x = 0; x < displayW; x++) {
        const t = (x + offsetRef.current) * 0.02;
        // Combine multiple sine waves for EKG-like pattern
        const spike = Math.sin(t * 3) > 0.95 ? Math.sin(t * 3) * 12 * (1 + intensity) : 0;
        const base = Math.sin(t) * 2 + Math.sin(t * 2.3) * 1.5;
        const noise = Math.sin(t * 7) * 0.5 * intensity;
        const y = midY + base + spike + noise;
        
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Draw a second, fainter wave
      ctx.beginPath();
      ctx.strokeStyle = `rgba(0, 240, 255, ${0.1 + intensity * 0.15})`;
      ctx.lineWidth = 0.5;
      ctx.shadowBlur = 2;

      for (let x = 0; x < displayW; x++) {
        const t = (x + offsetRef.current * 0.7) * 0.015;
        const y = midY + Math.sin(t) * 3 + Math.sin(t * 1.7) * 2;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      animRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [stats.attacksPerMinute]);

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
