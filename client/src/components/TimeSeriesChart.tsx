/**
 * TimeSeriesChart — Real-time attack volume
 * 
 * Redesign: Subtle area chart. Single accent color, no glow, no pulsing dot.
 * Clean and readable at a glance.
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

      ctx.clearRect(0, 0, w, h);

      if (timeSeries.length < 2) {
        animRef.current = requestAnimationFrame(draw);
        return;
      }

      const maxCount = Math.max(...timeSeries.map(p => p.count), 5);
      const padding = { top: 20, bottom: 8, left: 50, right: 16 };
      const chartW = w - padding.left - padding.right;
      const chartH = h - padding.top - padding.bottom;

      // Subtle horizontal grid
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.lineWidth = 0.5;
      for (let i = 0; i <= 3; i++) {
        const y = padding.top + (chartH / 3) * i;
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

      // Area fill — very subtle
      const gradient = ctx.createLinearGradient(0, padding.top, 0, h);
      gradient.addColorStop(0, 'rgba(100, 200, 220, 0.15)');
      gradient.addColorStop(1, 'rgba(100, 200, 220, 0.0)');

      ctx.beginPath();
      ctx.moveTo(points[0][0], padding.top + chartH);
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
      ctx.lineTo(points[points.length - 1][0], padding.top + chartH);
      ctx.closePath();
      ctx.fillStyle = gradient;
      ctx.fill();

      // Line — clean, no glow
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
      ctx.strokeStyle = 'rgba(100, 200, 220, 0.6)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Small dot at end
      const lastPoint = points[points.length - 1];
      ctx.beginPath();
      ctx.arc(lastPoint[0], lastPoint[1], 2.5, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(100, 200, 220, 0.8)';
      ctx.fill();

      // Label — left side
      ctx.font = '500 9px Inter, sans-serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.textAlign = 'left';
      ctx.fillText('ATTACK VOLUME', padding.left, 12);

      // Current value — right side
      const currentVal = timeSeries[timeSeries.length - 1]?.count || 0;
      ctx.font = '11px "JetBrains Mono", monospace';
      ctx.fillStyle = 'rgba(100, 200, 220, 0.7)';
      ctx.textAlign = 'right';
      ctx.fillText(`${currentVal}`, w - padding.right, 12);
      ctx.font = '8px Inter, sans-serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.fillText(' evt/5s', w - padding.right + 1, 12);
      ctx.textAlign = 'left';

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [timeSeries]);

  return (
    <div className="w-full h-full">
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
}
