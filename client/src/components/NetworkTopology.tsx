/**
 * NetworkTopology — 3D Force-Directed Graph
 * Shows internal corporate network structure with nodes for servers,
 * databases, and endpoints. Malicious traffic shown as red particles.
 */
import { useEffect, useRef, useMemo } from 'react';
import ForceGraph3D from '3d-force-graph';
import { useThreatData } from '@/contexts/ThreatContext';

interface NetworkNode {
  id: string;
  name: string;
  type: 'firewall' | 'server' | 'database' | 'endpoint' | 'router' | 'cloud';
  group: number;
  val: number;
}

interface NetworkLink {
  source: string;
  target: string;
  type: 'normal' | 'threat';
  particles: number;
}

const NETWORK_NODES: NetworkNode[] = [
  { id: 'fw1', name: 'FIREWALL', type: 'firewall', group: 0, val: 18 },
  { id: 'rt1', name: 'CORE ROUTER', type: 'router', group: 1, val: 14 },
  { id: 'web1', name: 'WEB-SRV-01', type: 'server', group: 2, val: 10 },
  { id: 'web2', name: 'WEB-SRV-02', type: 'server', group: 2, val: 10 },
  { id: 'app1', name: 'APP-SRV-01', type: 'server', group: 3, val: 10 },
  { id: 'app2', name: 'APP-SRV-02', type: 'server', group: 3, val: 10 },
  { id: 'db1', name: 'DB-PRIMARY', type: 'database', group: 4, val: 16 },
  { id: 'db2', name: 'DB-REPLICA', type: 'database', group: 4, val: 12 },
  { id: 'mail', name: 'MAIL-SRV', type: 'server', group: 5, val: 8 },
  { id: 'dns', name: 'DNS-SRV', type: 'server', group: 5, val: 8 },
  { id: 'vpn', name: 'VPN-GW', type: 'server', group: 1, val: 10 },
  { id: 'cloud', name: 'CLOUD-GW', type: 'cloud', group: 6, val: 12 },
  { id: 'ep1', name: 'WORKSTATION-A', type: 'endpoint', group: 7, val: 6 },
  { id: 'ep2', name: 'WORKSTATION-B', type: 'endpoint', group: 7, val: 6 },
  { id: 'ep3', name: 'WORKSTATION-C', type: 'endpoint', group: 7, val: 6 },
];

const BASE_LINKS: Omit<NetworkLink, 'particles'>[] = [
  { source: 'fw1', target: 'rt1', type: 'normal' },
  { source: 'rt1', target: 'web1', type: 'normal' },
  { source: 'rt1', target: 'web2', type: 'normal' },
  { source: 'rt1', target: 'app1', type: 'normal' },
  { source: 'rt1', target: 'app2', type: 'normal' },
  { source: 'app1', target: 'db1', type: 'normal' },
  { source: 'app2', target: 'db1', type: 'normal' },
  { source: 'db1', target: 'db2', type: 'normal' },
  { source: 'rt1', target: 'mail', type: 'normal' },
  { source: 'rt1', target: 'dns', type: 'normal' },
  { source: 'rt1', target: 'vpn', type: 'normal' },
  { source: 'rt1', target: 'cloud', type: 'normal' },
  { source: 'vpn', target: 'ep1', type: 'normal' },
  { source: 'vpn', target: 'ep2', type: 'normal' },
  { source: 'vpn', target: 'ep3', type: 'normal' },
  { source: 'web1', target: 'app1', type: 'normal' },
  { source: 'web2', target: 'app2', type: 'normal' },
];

const NODE_COLORS: Record<string, string> = {
  firewall: '#FF0040',
  server: '#00F0FF',
  database: '#FFD700',
  endpoint: '#00FF88',
  router: '#FF6600',
  cloud: '#8B00FF',
};

export default function NetworkTopology() {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<any>(null);
  const { threats } = useThreatData();

  const graphData = useMemo(() => {
    const recentCount = threats.slice(0, 10).length;
    const threatIntensity = Math.min(recentCount / 10, 1);
    
    const links: NetworkLink[] = BASE_LINKS.map(link => {
      const isCriticalPath = link.source === 'fw1' || link.target === 'db1';
      return {
        ...link,
        type: isCriticalPath && threatIntensity > 0.3 ? 'threat' as const : 'normal' as const,
        particles: isCriticalPath ? Math.ceil(threatIntensity * 4) : 1,
      };
    });

    return { nodes: NETWORK_NODES, links };
  }, [threats]);

  useEffect(() => {
    if (!containerRef.current) return;

    const graph = ForceGraph3D()
      .backgroundColor('#00000000')
      .showNavInfo(false)
      .nodeColor((node: any) => NODE_COLORS[node.type] || '#00F0FF')
      .nodeVal('val')
      .nodeLabel((node: any) => `<div style="color:#00F0FF;font-family:JetBrains Mono,monospace;font-size:10px;background:rgba(5,5,16,0.95);padding:3px 6px;border:1px solid rgba(0,240,255,0.3);border-radius:1px;white-space:nowrap">${node.name}</div>`)
      .nodeOpacity(0.9)
      .nodeResolution(16)
      .linkColor((link: any) => link.type === 'threat' ? '#FF004066' : '#00F0FF22')
      .linkWidth((link: any) => link.type === 'threat' ? 1.5 : 0.5)
      .linkOpacity(0.6)
      .linkDirectionalParticles((link: any) => link.particles || 1)
      .linkDirectionalParticleSpeed(0.006)
      .linkDirectionalParticleWidth(2)
      .linkDirectionalParticleColor((link: any) => link.type === 'threat' ? '#FF0040' : '#00F0FF44')
      .linkCurvature(0.15)
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
      graphRef.current?._destructor?.();
    };
  }, []);

  useEffect(() => {
    if (graphRef.current) {
      graphRef.current.graphData(graphData);
    }
  }, [graphData]);

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" />
      {/* Title overlay */}
      <div className="absolute top-2 left-3 z-10">
        <div className="font-data text-[10px] tracking-[0.2em] uppercase text-[#00F0FF]/50">
          Internal Network Topology
        </div>
      </div>
      {/* Legend */}
      <div className="absolute bottom-2 left-3 z-10 flex items-center gap-3">
        {Object.entries(NODE_COLORS).map(([type, color]) => (
          <div key={type} className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
            <span className="font-data text-[7px] tracking-wider uppercase text-[#8899aa]/50">
              {type}
            </span>
          </div>
        ))}
      </div>
      {/* Top gradient */}
      <div className="absolute top-0 left-0 right-0 h-6 bg-gradient-to-b from-[#050510] to-transparent pointer-events-none z-[5]" />
    </div>
  );
}
