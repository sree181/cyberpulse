/**
 * ParticleNetwork — Reactive particle background using tsParticles v4
 * 
 * A subtle network of connected particles that responds to threat level:
 * - Low threat: Sparse, slow, blue particles
 * - Medium threat: Moderate density, amber particles
 * - High threat: Dense, fast, red particles with more connections
 * 
 * Uses ParticlesProvider + Particles pattern (tsParticles v4 API).
 * Positioned behind the globe as an ambient layer.
 */
import { useCallback, useMemo, memo } from 'react';
import { Particles, ParticlesProvider } from '@tsparticles/react';
import { loadSlim } from '@tsparticles/slim';
import type { Engine, ISourceOptions } from '@tsparticles/engine';
import { useThreatData } from '@/contexts/ThreatContext';

// Stable init callback (must not change across renders)
const initEngine = async (engine: Engine) => {
  await loadSlim(engine);
};

function ParticleCanvas() {
  const { stats } = useThreatData();
  
  // Determine threat intensity for particle behavior
  const threatIntensity = useMemo(() => {
    const critical = stats?.critical || 0;
    const high = stats?.high || 0;
    if (critical > 3) return 'high';
    if (critical > 0 || high > 3) return 'medium';
    return 'low';
  }, [stats?.critical, stats?.high]);

  // Color based on threat level
  const particleColor = useMemo(() => {
    switch (threatIntensity) {
      case 'high': return '#ff3333';
      case 'medium': return '#dd550c';
      default: return '#1a8a9a';
    }
  }, [threatIntensity]);

  const particleCount = useMemo(() => {
    switch (threatIntensity) {
      case 'high': return 80;
      case 'medium': return 50;
      default: return 30;
    }
  }, [threatIntensity]);

  const particleSpeed = useMemo(() => {
    switch (threatIntensity) {
      case 'high': return 0.6;
      case 'medium': return 0.3;
      default: return 0.15;
    }
  }, [threatIntensity]);

  const options: ISourceOptions = useMemo(() => ({
    fullScreen: false,
    fpsLimit: 30,
    particles: {
      number: {
        value: particleCount,
        density: {
          enable: true,
        },
      },
      color: {
        value: particleColor,
      },
      shape: {
        type: 'circle',
      },
      opacity: {
        value: { min: 0.1, max: 0.4 },
        animation: {
          enable: true,
          speed: 0.3,
          sync: false,
        },
      },
      size: {
        value: { min: 0.5, max: 2 },
      },
      links: {
        enable: true,
        distance: 120,
        color: particleColor,
        opacity: 0.12,
        width: 0.5,
      },
      move: {
        enable: true,
        speed: particleSpeed,
        direction: 'none' as const,
        random: true,
        straight: false,
        outModes: {
          default: 'bounce' as const,
        },
      },
    },
    interactivity: {
      events: {
        onHover: {
          enable: true,
          mode: 'grab',
        },
      },
      modes: {
        grab: {
          distance: 140,
          links: {
            opacity: 0.3,
          },
        },
      },
    },
    detectRetina: true,
    background: {
      color: 'transparent',
    },
  }), [particleColor, particleCount, particleSpeed]);

  return (
    <Particles
      id="threat-particles"
      className="absolute inset-0 z-[1]"
      options={options}
    />
  );
}

const ParticleNetwork = memo(function ParticleNetwork() {
  return (
    <div className="absolute inset-0 z-[1] pointer-events-none">
      <ParticlesProvider init={initEngine}>
        <ParticleCanvas />
      </ParticlesProvider>
    </div>
  );
});

export default ParticleNetwork;
