/**
 * TimeSeriesChart — Real-time attack volume over time
 * Glowing area chart with animated gradient fill
 */
import { useThreatData } from '@/contexts/ThreatContext';
import { useRef, useEffect } from 'react';

export default function TimeSeriesChart() {
  const { timeSeries } = useThreatData();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
      const w = rect.width;
      const h = rect.height;

      // Clear
      ctx.clearRect(0, 0, w, h);

      if (timeSeries.length < 2) {
        animRef.current = requestAnimationFrame(draw);
        return;
      }

      const maxCount = Math.max(...timeSeries.map(p => p.count), 5);
      const padding = { top: 12, bottom: 4, left: 0, right: 0 };
      const chartW = w - padding.left - padding.right;
      const chartH = h - padding.top - padding.bottom;

      // Draw grid lines
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.06)';
      ctx.lineWidth = 0.5;
      for (let i = 0; i < 4; i++) {
        const y = padding.top + (chartH / 4) * i;
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(w - padding.right, y);
        ctx.stroke();
      }

      // Build path
      const points: [number, number][] = timeSeries.map((p, i) => [
        padding.left + (i / (timeSeries.length - 1)) * chartW,
        padding.top + chartH - (p.count / maxCount) * chartH,
      ]);

      // Gradient fill
      const gradient = ctx.createLinearGradient(0, padding.top, 0, h);
      gradient.addColorStop(0, 'rgba(0, 240, 255, 0.35)');
      gradient.addColorStop(0.5, 'rgba(0, 240, 255, 0.12)');
      gradient.addColorStop(1, 'rgba(0, 240, 255, 0.0)');

      ctx.beginPath();
      ctx.moveTo(points[0][0], h);
      
      // Smooth curve through points
      for (let i = 0; i < points.length; i++) {
        if (i === 0) {
          ctx.lineTo(points[i][0], points[i][1]);
        } else {
          const prev = points[i - 1];
          const curr = points[i];
          const cpx = (prev[0] + curr[0]) / 2;
          ctx.bezierCurveTo(cpx, prev[1], cpx, curr[1], curr[0], curr[1]);
        }
      }
      ctx.lineTo(points[points.length - 1][0], h);
      ctx.closePath();
      ctx.fillStyle = gradient;
      ctx.fill();

      // Glow line
      ctx.beginPath();
      for (let i = 0; i < points.length; i++) {
        if (i === 0) {
          ctx.moveTo(points[i][0], points[i][1]);
        } else {
          const prev = points[i - 1];
          const curr = points[i];
          const cpx = (prev[0] + curr[0]) / 2;
          ctx.bezierCurveTo(cpx, prev[1], cpx, curr[1], curr[0], curr[1]);
        }
      }
      ctx.strokeStyle = '#00F0FF';
      ctx.lineWidth = 1.5;
      ctx.shadowColor = '#00F0FF';
      ctx.shadowBlur = 8;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Pulse dot at the end
      const lastPoint = points[points.length - 1];
      const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 300);
      ctx.beginPath();
      ctx.arc(lastPoint[0], lastPoint[1], 3 + pulse * 2, 0, Math.PI * 2);
      ctx.fillStyle = '#00F0FF';
      ctx.shadowColor = '#00F0FF';
      ctx.shadowBlur = 12;
      ctx.fill();
      ctx.shadowBlur = 0;

      // Label
      ctx.font = '9px "JetBrains Mono", monospace';
      ctx.fillStyle = 'rgba(0, 240, 255, 0.5)';
      ctx.fillText('ATTACK VOLUME / 5s', 8, 10);

      // Current value
      const currentVal = timeSeries[timeSeries.length - 1]?.count || 0;
      ctx.font = 'bold 11px "JetBrains Mono", monospace';
      ctx.fillStyle = '#00F0FF';
      ctx.textAlign = 'right';
      ctx.fillText(`${currentVal} evt/5s`, w - 8, 10);
      ctx.textAlign = 'left';

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [timeSeries]);

  return (
    <div className="w-full h-full relative">
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
}
