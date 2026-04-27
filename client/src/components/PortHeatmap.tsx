/**
 * PortHeatmap — Real-time port & protocol activity heatmap
 * Shows top attacked ports from DShield data with protocol breakdown (TCP/UDP)
 * and glowing animated bars
 */
import { useThreatData } from '@/contexts/ThreatContext';
import { useRef, useEffect } from 'react';

export default function PortHeatmap() {
  const { portActivity } = useThreatData();
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

      // Title
      ctx.font = '9px "JetBrains Mono", monospace';
      ctx.fillStyle = 'rgba(0, 240, 255, 0.5)';
      ctx.fillText('PORT ACTIVITY — DSHIELD/ISC', 8, 14);

      // Protocol legend
      ctx.font = '7px "JetBrains Mono", monospace';
      ctx.fillStyle = 'rgba(0, 240, 255, 0.35)';
      ctx.textAlign = 'right';
      ctx.fillText('TCP', w - 30, 14);
      ctx.fillStyle = 'rgba(255, 0, 200, 0.35)';
      ctx.fillText('UDP', w - 8, 14);
      ctx.textAlign = 'left';

      if (portActivity.length === 0) {
        ctx.font = '10px "JetBrains Mono", monospace';
        ctx.fillStyle = 'rgba(0, 240, 255, 0.3)';
        ctx.fillText('Awaiting data...', 8, 35);
        animRef.current = requestAnimationFrame(draw);
        return;
      }

      const maxRecords = Math.max(...portActivity.map(p => p.records), 1);
      const barHeight = 16;
      const gap = 3;
      const startY = 24;
      const labelWidth = 65;
      const barMaxWidth = w - labelWidth - 50;

      portActivity.slice(0, Math.floor((h - startY) / (barHeight + gap))).forEach((port, i) => {
        const y = startY + i * (barHeight + gap);
        const intensity = port.records / maxRecords;
        const barW = Math.max(2, intensity * barMaxWidth);
        const isUDP = port.protocol === 'UDP';

        // Service label
        const serviceName = port.service || `P:${port.port}`;
        ctx.font = '9px "JetBrains Mono", monospace';
        ctx.fillStyle = 'rgba(0, 240, 255, 0.6)';
        ctx.textAlign = 'right';
        ctx.fillText(serviceName, labelWidth - 6, y + 11);
        ctx.textAlign = 'left';

        // Bar background
        ctx.fillStyle = 'rgba(0, 240, 255, 0.03)';
        ctx.fillRect(labelWidth, y, barMaxWidth, barHeight);

        // Color based on protocol and intensity
        const pulse = 0.85 + 0.15 * Math.sin(Date.now() / 500 + i * 0.5);
        const alpha = (0.3 + intensity * 0.5) * pulse;
        
        let r: number, g: number, b: number;
        if (isUDP) {
          // Magenta for UDP
          r = 255; g = Math.floor((1 - intensity) * 100); b = 200;
        } else {
          // Cyan-to-red gradient for TCP based on intensity
          r = Math.floor(intensity * 255);
          g = Math.floor((1 - intensity) * 240);
          b = 255;
        }

        // Gradient bar
        const grad = ctx.createLinearGradient(labelWidth, 0, labelWidth + barW, 0);
        grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${alpha})`);
        grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, ${alpha * 0.5})`);
        ctx.fillStyle = grad;
        ctx.fillRect(labelWidth, y, barW, barHeight);

        // Glow edge
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${Math.min(alpha * 1.8, 1)})`;
        ctx.fillRect(labelWidth + barW - 2, y, 2, barHeight);

        // Protocol tag
        ctx.font = '6px "JetBrains Mono", monospace';
        ctx.fillStyle = isUDP ? 'rgba(255, 0, 200, 0.4)' : 'rgba(0, 240, 255, 0.3)';
        ctx.fillText(port.protocol || 'TCP', labelWidth + 3, y + 7);

        // Count label
        const countStr = port.records > 1000 ? `${(port.records / 1000).toFixed(0)}K` : `${port.records}`;
        ctx.font = '8px "JetBrains Mono", monospace';
        ctx.fillStyle = `rgba(255, 255, 255, ${0.4 + intensity * 0.4})`;
        ctx.fillText(countStr, labelWidth + barW + 4, y + 11);
      });

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [portActivity]);

  return (
    <div className="w-full h-full relative">
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
}
