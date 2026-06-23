/**
 * NetworkTopology — 3D Force-Directed Graph
 * 
 * Redesign: Monochromatic node palette (Auburn burnt orange shades), 
 * subtle link colors, no legend clutter. Let the 3D structure
 * communicate the network hierarchy visually.
 */
import { useEffect, useRef, useMemo } from 'react';
import { BRANDING } from '@/lib/branding';
import ForceGraph3D from '3d-force-graph';
import { useThreatData } from '@/contexts/ThreatContext';

interface NetworkNode {
  id: string;
  name: string;
  type: 'firewall' | 'server' | 'database' | 'endpoint' | 'router' | 'cloud' | 'iot' | 'honeypot';
  group: number;
  val: number;
}

interface NetworkLink {
  source: string;
  target: string;
  type: 'normal' | 'threat' | 'critical';
  particles: number;
}

const NETWORK_NODES: NetworkNode[] = [
  { id: 'fw1', name: 'PERIMETER-FW', type: 'firewall', group: 0, val: 18 },
  { id: 'fw2', name: 'INTERNAL-FW', type: 'firewall', group: 0, val: 14 },
  { id: 'rt1', name: 'CORE-ROUTER', type: 'router', group: 1, val: 14 },
  { id: 'rt2', name: 'DIST-ROUTER', type: 'router', group: 1, val: 10 },
  { id: 'web1', name: 'WEB-SRV-01', type: 'server', group: 2, val: 8 },
  { id: 'web2', name: 'WEB-SRV-02', type: 'server', group: 2, val: 8 },
  { id: 'app1', name: 'APP-SRV-01', type: 'server', group: 3, val: 8 },
  { id: 'app2', name: 'APP-SRV-02', type: 'server', group: 3, val: 8 },
  { id: 'api1', name: 'API-GATEWAY', type: 'server', group: 3, val: 10 },
  { id: 'db1', name: 'DB-PRIMARY', type: 'database', group: 4, val: 14 },
  { id: 'db2', name: 'DB-REPLICA', type: 'database', group: 4, val: 10 },
  { id: 'cloud', name: 'CLOUD-GW', type: 'cloud', group: 6, val: 12 },
  { id: 'vpn', name: 'VPN-GW', type: 'server', group: 1, val: 10 },
  { id: 'ep1', name: 'WORKSTATION-A', type: 'endpoint', group: 7, val: 5 },
  { id: 'ep2', name: 'WORKSTATION-B', type: 'endpoint', group: 7, val: 5 },
  { id: 'ep3', name: 'WORKSTATION-C', type: 'endpoint', group: 7, val: 5 },
];

const BASE_LINKS: Omit<NetworkLink, 'particles'>[] = [
  { source: 'fw1', target: 'rt1', type: 'normal' },
  { source: 'rt1', target: 'fw2', type: 'normal' },
  { source: 'fw2', target: 'rt2', type: 'normal' },
  { source: 'rt1', target: 'web1', type: 'normal' },
  { source: 'rt1', target: 'web2', type: 'normal' },
  { source: 'rt2', target: 'app1', type: 'normal' },
  { source: 'rt2', target: 'app2', type: 'normal' },
  { source: 'rt2', target: 'api1', type: 'normal' },
  { source: 'api1', target: 'db1', type: 'normal' },
  { source: 'app1', target: 'db1', type: 'normal' },
  { source: 'db1', target: 'db2', type: 'normal' },
  { source: 'rt1', target: 'vpn', type: 'normal' },
  { source: 'rt1', target: 'cloud', type: 'normal' },
  { source: 'vpn', target: 'ep1', type: 'normal' },
  { source: 'vpn', target: 'ep2', type: 'normal' },
  { source: 'vpn', target: 'ep3', type: 'normal' },
  { source: 'cloud', target: 'api1', type: 'normal' },
];

// Monochromatic palette — brand accent at varying opacities
const accent = BRANDING.accentColor;
const NODE_COLORS: Record<string, string> = {
  firewall: `${accent}E6`,
  server: `${accent}99`,
  database: `${accent}CC`,
  endpoint: `${accent}59`,
  router: `${accent}BF`,
  cloud: `${accent}A6`,
  iot: `${accent}66`,
  honeypot: `${accent}80`,
};

export default function NetworkTopology() {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<any>(null);
  const { threats } = useThreatData();

  const graphData = useMemo(() => {
    const recentCount = threats.slice(0, 15).length;
    const threatIntensity = Math.min(recentCount / 15, 1);
    
    const criticalPaths = new Set(['fw1', 'rt1', 'db1']);
    
    const links: NetworkLink[] = BASE_LINKS.map(link => {
      const isCriticalPath = criticalPaths.has(link.source as string) || criticalPaths.has(link.target as string);
      const isDbPath = (link.target as string).startsWith('db');
      return {
        ...link,
        type: isDbPath && threatIntensity > 0.5 ? 'critical' as const : 
              isCriticalPath && threatIntensity > 0.2 ? 'threat' as const : 'normal' as const,
        particles: isDbPath ? Math.ceil(threatIntensity * 3) : 
                   isCriticalPath ? Math.ceil(threatIntensity * 2) : 1,
      };
    });

    return { nodes: NETWORK_NODES, links };
  }, [threats]);

  useEffect(() => {
    if (!containerRef.current) return;

    const graph = ForceGraph3D()
      .backgroundColor('#00000000')
      .showNavInfo(false)
      .nodeColor((node: any) => NODE_COLORS[node.type] || `${accent}80`)
      .nodeVal('val')
      .nodeLabel('')
      .nodeOpacity(0.85)
      .nodeResolution(12)
      .linkColor((link: any) => {
        if (link.type === 'critical') return 'rgba(200, 80, 80, 0.5)';
        if (link.type === 'threat') return 'rgba(200, 80, 80, 0.25)';
        return `${accent}14`;
      })
      .linkWidth((link: any) => {
        if (link.type === 'critical') return 1.5;
        if (link.type === 'threat') return 0.8;
        return 0.3;
      })
      .linkOpacity(0.6)
      .linkDirectionalParticles((link: any) => link.particles || 0)
      .linkDirectionalParticleSpeed(0.006)
      .linkDirectionalParticleWidth((link: any) => link.type === 'critical' ? 2 : 1.5)
      .linkDirectionalParticleColor((link: any) => {
        if (link.type === 'critical') return 'rgba(200, 80, 80, 0.7)';
        if (link.type === 'threat') return 'rgba(200, 120, 80, 0.5)';
        return `${accent}33`;
      })
      .linkCurvature(0.1)
      (containerRef.current);

    graph.graphData(graphData);
    graph.cameraPosition({ x: 0, y: 0, z: 280 });
    
    const controls = graph.controls();
    if (controls) {
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.4;
      controls.enableZoom = false;
      controls.enablePan = false;
    }

    graphRef.current = graph;

    const handleResize = () => {
      if (containerRef.current && graphRef.current) {
        graphRef.current.width(containerRef.current.clientWidth);
        graphRef.current.height(containerRef.current.clientHeight);
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  useEffect(() => {
    if (graphRef.current) {
      graphRef.current.graphData(graphData);
    }
  }, [graphData]);

  return (
    <div className="relative w-full h-full overflow-hidden rounded-lg">
      <div ref={containerRef} className="w-full h-full" />
      {/* Minimal label */}
      <div className="absolute bottom-2 left-3 z-10">
        <span className="font-data text-caption text-[var(--color-cp-text-tertiary)]">
          {NETWORK_NODES.length} nodes · {BASE_LINKS.length} links
        </span>
      </div>
    </div>
  );
}
