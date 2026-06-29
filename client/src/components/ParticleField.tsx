/**
 * ParticleField — Animated neural network mesh background
 * 
 * A full-viewport canvas that renders floating particles connected by lines,
 * creating a neural network visualization effect. Responds to threat level:
 *   - Calm: slow blue-tinted drift, sparse connections
 *   - Elevated: faster movement, warmer tones
 *   - Critical: rapid motion, red-shifted glow, denser connections
 * 
 * Performance: Uses requestAnimationFrame with particle count capped at ~120.
 * Renders behind all panels via z-index: 0.
 */
import { useEffect, useRef, useCallback } from 'react';
import { useThreatData } from '@/contexts/ThreatContext';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  baseSpeed: number;
}

const PARTICLE_COUNT = 100;
const CONNECTION_DISTANCE = 120;
const BASE_SPEED = 0.15;

export default function ParticleField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animFrameRef = useRef<number>(0);
  const { stats } = useThreatData();

  // Compute threat intensity (0-1) from current stats
  const threatIntensity = Math.min(1, (stats.critical * 3 + stats.total) / 100);

  const initParticles = useCallback((width: number, height: number) => {
    const particles: Particle[] = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = BASE_SPEED + Math.random() * BASE_SPEED;
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 1 + Math.random() * 1.5,
        baseSpeed: speed,
      });
    }
    particlesRef.current = particles;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
      if (particlesRef.current.length === 0) {
        initParticles(width, height);
      }
    };

    resize();
    window.addEventListener('resize', resize);

    const animate = () => {
      ctx.clearRect(0, 0, width, height);

      const particles = particlesRef.current;
      const intensity = threatIntensity;

      // Speed multiplier based on threat level (1x calm → 3x critical)
      const speedMult = 1 + intensity * 2;

      // Color interpolation: blue (calm) → orange/red (critical)
      const r = Math.floor(20 + intensity * 180); // 20 → 200
      const g = Math.floor(80 + intensity * -40);  // 80 → 40
      const b = Math.floor(200 - intensity * 150); // 200 → 50

      // Update and draw particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Move
        p.x += p.vx * speedMult;
        p.y += p.vy * speedMult;

        // Wrap around edges
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        // Draw particle
        const alpha = 0.3 + intensity * 0.3;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
        ctx.fill();
      }

      // Draw connections between nearby particles
      const connectionAlpha = 0.06 + intensity * 0.08;
      const maxDist = CONNECTION_DISTANCE + intensity * 40;
      
      ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${connectionAlpha})`;
      ctx.lineWidth = 0.5;

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < maxDist) {
            const lineAlpha = connectionAlpha * (1 - dist / maxDist);
            ctx.beginPath();
            ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${lineAlpha})`;
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [threatIntensity, initParticles]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-0 pointer-events-none"
      style={{ opacity: 0.6 }}
    />
  );
}
