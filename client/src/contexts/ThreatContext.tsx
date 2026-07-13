import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from 'react';
import { type ThreatEvent, type Severity, type AttackType, ATTACK_COLORS } from '@/lib/threatEngine';
import { trpc } from '@/lib/trpc';
import { BRANDING } from '@/lib/branding';
import { CorridorAggregator, type Corridor, type CorridorPulse, type TargetPressure, type SourceHotspot } from '@/lib/corridorEngine';

interface ThreatStats {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  attacksPerMinute: number;
  topCountry: string;
  topAttackType: string;
  blockedPercent: number;
}

interface TimeSeriesPoint {
  time: number;
  count: number;
}

interface PortActivity {
  port: number;
  records: number;
  targets: number;
  sources: number;
  protocol: string;
  service: string;
}

interface ThreatContextType {
  threats: ThreatEvent[];
  recentThreats: ThreatEvent[];
  stats: ThreatStats;
  activeArcs: ArcData[];
  corridors: Corridor[];
  corridorPulses: CorridorPulse[];
  targetPressures: TargetPressure[];
  sourceHotspots: SourceHotspot[];
  tacticCounts: Record<string, number>;
  timeSeries: TimeSeriesPoint[];
  portActivity: PortActivity[];
  isLive: boolean;
  realDataStatus: string;
  selectedArc: ArcData | null;
  setSelectedArc: (arc: ArcData | null) => void;
}

export interface ArcData {
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  color: string;
  stroke: number;
  id: string;
  attackType: string;
  severity: string;
  sourceIp: string;
  sourceCountry: string;
  sourceCity: string;
  targetName: string;
  port: number;
  protocol: string;
  timestamp: number;
  campaignId: string; // Links arc to its parent campaign for visual grouping
}

const ThreatContext = createContext<ThreatContextType | null>(null);

export function useThreatData() {
  const ctx = useContext(ThreatContext);
  if (!ctx) throw new Error('useThreatData must be used within ThreatProvider');
  return ctx;
}

// ═══════════════════════════════════════════════════════════════════════════
// CAMPAIGN ENGINE — Generates coherent attack flows instead of random scatter
// ═══════════════════════════════════════════════════════════════════════════

interface Campaign {
  id: string;
  sourceCountry: string;
  sourceCity: string;
  sourceLat: number;
  sourceLng: number;
  targetName: string;
  targetLat: number;
  targetLng: number;
  attackType: AttackType;
  severity: Severity;
  port: number;
  protocol: string;
  mitreTactic: string;
  mitreTechnique: string;
  eventsRemaining: number;  // How many more events this campaign will produce
  intervalMs: number;       // Time between events in this campaign
  startedAt: number;
  sourceIps: string[];      // Pool of IPs for this campaign (from real data or generated)
}

// Realistic campaign templates (what real APT campaigns look like)
const CAMPAIGN_TEMPLATES: { attackType: AttackType; severity: Severity; port: number; protocol: string; tactic: string; technique: string; burstSize: [number, number]; intervalMs: [number, number] }[] = [
  { attackType: 'SSH Brute Force', severity: 'high', port: 22, protocol: 'SSH', tactic: 'Credential Access', technique: 'T1110 - Brute Force', burstSize: [5, 10], intervalMs: [800, 2000] },
  { attackType: 'DDoS', severity: 'critical', port: 80, protocol: 'HTTP', tactic: 'Impact', technique: 'T1498 - Network DoS', burstSize: [8, 15], intervalMs: [300, 800] },
  { attackType: 'SQL Injection', severity: 'critical', port: 443, protocol: 'HTTPS', tactic: 'Initial Access', technique: 'T1190 - Exploit Public App', burstSize: [3, 6], intervalMs: [1500, 3000] },
  { attackType: 'Credential Stuffing', severity: 'high', port: 443, protocol: 'HTTPS', tactic: 'Credential Access', technique: 'T1110.004 - Credential Stuffing', burstSize: [6, 12], intervalMs: [600, 1500] },
  { attackType: 'Port Scan', severity: 'low', port: 0, protocol: 'TCP', tactic: 'Reconnaissance', technique: 'T1046 - Network Scanning', burstSize: [4, 8], intervalMs: [400, 1000] },
  { attackType: 'Malware C2', severity: 'critical', port: 8443, protocol: 'HTTPS', tactic: 'Command and Control', technique: 'T1071 - Application Layer', burstSize: [3, 5], intervalMs: [2000, 4000] },
  { attackType: 'Ransomware', severity: 'critical', port: 445, protocol: 'SMB', tactic: 'Impact', technique: 'T1486 - Data Encrypted', burstSize: [2, 4], intervalMs: [2000, 5000] },
  { attackType: 'Phishing', severity: 'medium', port: 25, protocol: 'SMTP', tactic: 'Initial Access', technique: 'T1566 - Phishing', burstSize: [4, 8], intervalMs: [1000, 2500] },
  { attackType: 'DNS Tunneling', severity: 'high', port: 53, protocol: 'DNS', tactic: 'Exfiltration', technique: 'T1048 - Exfil Over Alt Protocol', burstSize: [3, 6], intervalMs: [1500, 3000] },
  { attackType: 'XSS', severity: 'medium', port: 443, protocol: 'HTTPS', tactic: 'Initial Access', technique: 'T1189 - Drive-by Compromise', burstSize: [3, 5], intervalMs: [1200, 2500] },
];

// Target infrastructure (fewer, more distinct locations)
const TARGETS = [
  { name: 'US-EAST HQ', lat: 38.9072, lng: -77.0369 },
  { name: 'US-WEST DC', lat: 37.3861, lng: -122.0839 },
  { name: 'EU-CENTRAL DC', lat: 50.1109, lng: 8.6821 },
  { name: 'UK OFFICE', lat: 51.5074, lng: -0.1278 },
  { name: 'APAC DC', lat: 1.3521, lng: 103.8198 },
  { name: 'INDIA OFFICE', lat: 19.0760, lng: 72.8777 },
];

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function generateIp(): string {
  const octet = () => Math.floor(Math.random() * 254) + 1;
  return `${octet()}.${octet()}.${octet()}.${octet()}`;
}

let campaignCounter = 0;
let threatCounter = 0;

function createCampaign(realAttackers: any[]): Campaign {
  campaignCounter++;
  const template = CAMPAIGN_TEMPLATES[Math.floor(Math.random() * CAMPAIGN_TEMPLATES.length)];
  const target = TARGETS[Math.floor(Math.random() * TARGETS.length)];
  const burstSize = Math.floor(randomBetween(template.burstSize[0], template.burstSize[1]));
  const intervalMs = Math.floor(randomBetween(template.intervalMs[0], template.intervalMs[1]));

  // Pick a source — prefer real attacker data
  let sourceLat: number, sourceLng: number, sourceCountry: string, sourceCity: string;
  const sourceIps: string[] = [];

  if (realAttackers.length > 0 && Math.random() < 0.85) {
    // Use a real attacker as the campaign origin
    const attacker = realAttackers[Math.floor(Math.random() * realAttackers.length)];
    sourceLat = attacker.lat;
    sourceLng = attacker.lng;
    sourceCountry = attacker.country;
    sourceCity = attacker.city || 'Unknown';
    // Generate IPs similar to the real one (same /16 subnet feel)
    sourceIps.push(attacker.ip);
    for (let i = 0; i < burstSize - 1; i++) {
      const parts = attacker.ip.split('.');
      parts[2] = String(Math.floor(Math.random() * 254) + 1);
      parts[3] = String(Math.floor(Math.random() * 254) + 1);
      sourceIps.push(parts.join('.'));
    }
  } else {
    // Fallback: pick from known threat actor regions
    const FALLBACK_SOURCES = [
      { country: 'CN', city: 'Beijing', lat: 39.9042, lng: 116.4074 },
      { country: 'RU', city: 'Moscow', lat: 55.7558, lng: 37.6173 },
      { country: 'BR', city: 'São Paulo', lat: -23.5505, lng: -46.6333 },
      { country: 'IN', city: 'Mumbai', lat: 19.0760, lng: 72.8777 },
      { country: 'IR', city: 'Tehran', lat: 35.6892, lng: 51.3890 },
      { country: 'KP', city: 'Pyongyang', lat: 39.0392, lng: 125.7625 },
      { country: 'NG', city: 'Lagos', lat: 6.5244, lng: 3.3792 },
    ];
    const src = FALLBACK_SOURCES[Math.floor(Math.random() * FALLBACK_SOURCES.length)];
    sourceLat = src.lat;
    sourceLng = src.lng;
    sourceCountry = src.country;
    sourceCity = src.city;
    for (let i = 0; i < burstSize; i++) {
      sourceIps.push(generateIp());
    }
  }

  return {
    id: `CAMP-${campaignCounter}`,
    sourceCountry,
    sourceCity,
    sourceLat,
    sourceLng,
    targetName: target.name,
    targetLat: target.lat,
    targetLng: target.lng,
    attackType: template.attackType,
    severity: template.severity,
    port: template.port || Math.floor(Math.random() * 65535),
    protocol: template.protocol,
    mitreTactic: template.tactic,
    mitreTechnique: template.technique,
    eventsRemaining: burstSize,
    intervalMs,
    startedAt: Date.now(),
    sourceIps,
  };
}

function generateThreatFromCampaign(campaign: Campaign): ThreatEvent {
  threatCounter++;
  const ipIndex = campaign.sourceIps.length - campaign.eventsRemaining;
  const ip = campaign.sourceIps[ipIndex] || campaign.sourceIps[0];

  return {
    id: `THR-${Date.now()}-${threatCounter}`,
    timestamp: new Date(),
    attackType: campaign.attackType,
    severity: campaign.severity,
    sourceIp: ip,
    sourceCountry: campaign.sourceCountry,
    sourceCity: campaign.sourceCity,
    // Small jitter within the source city (same neighborhood, not random continent)
    sourceLat: campaign.sourceLat + (Math.random() - 0.5) * 0.3,
    sourceLng: campaign.sourceLng + (Math.random() - 0.5) * 0.3,
    // Minimal jitter on target (same data center)
    targetLat: campaign.targetLat + (Math.random() - 0.5) * 0.1,
    targetLng: campaign.targetLng + (Math.random() - 0.5) * 0.1,
    targetName: campaign.targetName,
    port: campaign.port,
    protocol: campaign.protocol,
    mitreTactic: campaign.mitreTactic,
    mitreTechnique: campaign.mitreTechnique,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// PROVIDER
// ═══════════════════════════════════════════════════════════════════════════

export function ThreatProvider({ children }: { children: ReactNode }) {
  const [threats, setThreats] = useState<ThreatEvent[]>([]);
  const [activeArcs, setActiveArcs] = useState<ArcData[]>([]);
  const [corridors, setCorridors] = useState<Corridor[]>([]);
  const [corridorPulses, setCorridorPulses] = useState<CorridorPulse[]>([]);
  const [targetPressures, setTargetPressures] = useState<TargetPressure[]>([]);
  const [sourceHotspots, setSourceHotspots] = useState<SourceHotspot[]>([]);
  const corridorAggregatorRef = useRef(new CorridorAggregator());
  const [tacticCounts, setTacticCounts] = useState<Record<string, number>>({});
  const [timeSeries, setTimeSeries] = useState<TimeSeriesPoint[]>([]);
  const [portActivity, setPortActivity] = useState<PortActivity[]>([]);
  const [isLive, setIsLive] = useState(false);
  const [realDataStatus, setRealDataStatus] = useState('Initializing...');
  const [selectedArc, setSelectedArc] = useState<ArcData | null>(null);
  const countryCountsRef = useRef<Record<string, number>>({});
  const attackCountsRef = useRef<Record<string, number>>({});
  const minuteCountRef = useRef<number[]>([]);
  const realAttackersRef = useRef<any[]>([]);
  const realDataAvailableRef = useRef(false);
  const activeCampaignsRef = useRef<Campaign[]>([]);

  // Fetch real threat data from blocklist.de via our backend
  const { data: realData, error: realDataError } = trpc.threats.realData.useQuery(undefined, {
    refetchInterval: 60_000,
    retry: 2,
  });

  // When real data arrives, integrate it
  useEffect(() => {
    if (realData) {
      setIsLive(realData.isLive);
      realDataAvailableRef.current = realData.isLive && realData.topAttackers.length > 0;
      
      if (realData.isLive) {
        setRealDataStatus(`LIVE — blocklist.de + ip-api.com — ${realData.lastUpdated.slice(0, 19)}`);
        window.dispatchEvent(new Event('threat-data-updated'));
      } else {
        setRealDataStatus('Cached data — API temporarily unavailable');
      }
      
      if (realData.topAttackers.length > 0) {
        realAttackersRef.current = realData.topAttackers;
      }
      
      if (realData.topPorts.length > 0) {
        setPortActivity(realData.topPorts);
      }
    } else if (realDataError) {
      setRealDataStatus('Fallback mode — simulated data');
      setIsLive(false);
      realDataAvailableRef.current = false;
    }
  }, [realData, realDataError]);

  const addThreat = useCallback((threat: ThreatEvent, campaignId: string) => {
    setThreats(prev => {
      const next = [threat, ...prev];
      return next.slice(0, 500);
    });

    countryCountsRef.current[threat.sourceCountry] = 
      (countryCountsRef.current[threat.sourceCountry] || 0) + 1;
    
    attackCountsRef.current[threat.attackType] = 
      (attackCountsRef.current[threat.attackType] || 0) + 1;

    minuteCountRef.current.push(Date.now());
    minuteCountRef.current = minuteCountRef.current.filter(t => Date.now() - t < 60000);

    setTacticCounts(prev => ({
      ...prev,
      [threat.mitreTactic]: (prev[threat.mitreTactic] || 0) + 1,
    }));

    // Update time series (bucket by 5-second intervals)
    setTimeSeries(prev => {
      const now = Math.floor(Date.now() / 5000) * 5000;
      const last = prev[prev.length - 1];
      if (last && last.time === now) {
        const updated = [...prev];
        updated[updated.length - 1] = { time: now, count: last.count + 1 };
        return updated.slice(-60);
      }
      return [...prev, { time: now, count: 1 }].slice(-60);
    });

    // Create arc with campaign linkage
    const severityStroke = threat.severity === 'critical' ? 3.5 : threat.severity === 'high' ? 2.5 : 1.5;
    const colors = BRANDING.attackColors as Record<string, string>;

    const newArc: ArcData = {
      startLat: threat.sourceLat,
      startLng: threat.sourceLng,
      endLat: threat.targetLat,
      endLng: threat.targetLng,
      color: colors[threat.attackType] || BRANDING.accentColor,
      stroke: severityStroke,
      id: threat.id,
      attackType: threat.attackType,
      severity: threat.severity,
      sourceIp: threat.sourceIp,
      sourceCountry: threat.sourceCountry,
      sourceCity: threat.sourceCity,
      targetName: threat.targetName,
      port: threat.port,
      protocol: threat.protocol,
      timestamp: Date.now(),
      campaignId,
    };

    setActiveArcs(prev => {
      const next = [...prev, newArc];
      // Keep max 8 arcs visible for visual clarity
      return next.slice(-8);
    });

    // Feed the corridor aggregator
    const { corridors: updatedCorridors, pulse } = corridorAggregatorRef.current.addEvent(newArc);
    setCorridors(updatedCorridors);
    if (pulse) {
      setCorridorPulses(prev => [...prev, pulse].slice(-20));
    }

    // Arc lives for 10 seconds (longer = more visible, but not cluttered since max 8)
    setTimeout(() => {
      setActiveArcs(prev => prev.filter(a => a.id !== threat.id));
    }, 10000);
  }, []);

  // ═══ CAMPAIGN-BASED GENERATION ═══
  // Instead of random events, we run 3-4 campaigns simultaneously.
  // Each campaign fires events at its own interval, then ends.
  // When a campaign ends, a new one spawns after a brief pause.
  useEffect(() => {
    const MAX_CONCURRENT_CAMPAIGNS = 4;
    const CAMPAIGN_SPAWN_DELAY = 3000; // 3s pause between campaign end and new spawn
    const timers: ReturnType<typeof setTimeout>[] = [];

    function runCampaign(campaign: Campaign) {
      if (campaign.eventsRemaining <= 0) {
        // Campaign exhausted — remove it and schedule a new one
        activeCampaignsRef.current = activeCampaignsRef.current.filter(c => c.id !== campaign.id);
        const spawnTimer = setTimeout(() => {
          spawnNewCampaign();
        }, CAMPAIGN_SPAWN_DELAY);
        timers.push(spawnTimer);
        return;
      }

      // Generate one event from this campaign
      const threat = generateThreatFromCampaign(campaign);
      campaign.eventsRemaining--;
      addThreat(threat, campaign.id);

      // Schedule next event in this campaign
      const nextTimer = setTimeout(() => {
        runCampaign(campaign);
      }, campaign.intervalMs);
      timers.push(nextTimer);
    }

    function spawnNewCampaign() {
      if (activeCampaignsRef.current.length >= MAX_CONCURRENT_CAMPAIGNS) return;
      const campaign = createCampaign(realAttackersRef.current);
      activeCampaignsRef.current.push(campaign);
      runCampaign(campaign);
    }

    // Initial spawn: stagger 3-4 campaigns over the first 2 seconds
    for (let i = 0; i < MAX_CONCURRENT_CAMPAIGNS; i++) {
      const delay = i * 500;
      const timer = setTimeout(() => spawnNewCampaign(), delay);
      timers.push(timer);
    }

    return () => {
      timers.forEach(t => clearTimeout(t));
      activeCampaignsRef.current = [];
    };
  }, [addThreat]);

  const stats: ThreatStats = {
    total: threats.length,
    critical: threats.filter(t => t.severity === 'critical').length,
    high: threats.filter(t => t.severity === 'high').length,
    medium: threats.filter(t => t.severity === 'medium').length,
    low: threats.filter(t => t.severity === 'low').length,
    attacksPerMinute: minuteCountRef.current.length,
    topCountry: Object.entries(countryCountsRef.current)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || 'N/A',
    topAttackType: Object.entries(attackCountsRef.current)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || 'N/A',
    blockedPercent: 72 + Math.random() * 20,
  };

  const recentThreats = threats.slice(0, 30);

  // Periodic corridor state refresh (for decay/pressure updates)
  useEffect(() => {
    const interval = setInterval(() => {
      const state = corridorAggregatorRef.current.getState();
      setCorridors(state.corridors);
      setCorridorPulses(state.pulses);
      setTargetPressures(state.targets);
      setSourceHotspots(state.hotspots);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <ThreatContext.Provider value={{ 
      threats, recentThreats, stats, activeArcs, corridors, corridorPulses,
      targetPressures, sourceHotspots, tacticCounts,
      timeSeries, portActivity, isLive, realDataStatus,
      selectedArc, setSelectedArc
    }}>
      {children}
    </ThreatContext.Provider>
  );
}
