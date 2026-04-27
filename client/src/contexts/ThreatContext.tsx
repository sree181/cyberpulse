import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from 'react';
import { generateThreat, type ThreatEvent, type Severity } from '@/lib/threatEngine';

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

interface ThreatContextType {
  threats: ThreatEvent[];
  recentThreats: ThreatEvent[];
  stats: ThreatStats;
  activeArcs: ArcData[];
  tacticCounts: Record<string, number>;
}

export interface ArcData {
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  color: string;
  stroke: number;
  id: string;
}

const ThreatContext = createContext<ThreatContextType | null>(null);

export function useThreatData() {
  const ctx = useContext(ThreatContext);
  if (!ctx) throw new Error('useThreatData must be used within ThreatProvider');
  return ctx;
}

export function ThreatProvider({ children }: { children: ReactNode }) {
  const [threats, setThreats] = useState<ThreatEvent[]>([]);
  const [activeArcs, setActiveArcs] = useState<ArcData[]>([]);
  const [tacticCounts, setTacticCounts] = useState<Record<string, number>>({});
  const countryCountsRef = useRef<Record<string, number>>({});
  const attackCountsRef = useRef<Record<string, number>>({});
  const minuteCountRef = useRef<number[]>([]);

  const addThreat = useCallback((threat: ThreatEvent) => {
    setThreats(prev => {
      const next = [threat, ...prev];
      return next.slice(0, 200); // Keep last 200
    });

    // Track country counts
    countryCountsRef.current[threat.sourceCountry] = 
      (countryCountsRef.current[threat.sourceCountry] || 0) + 1;
    
    // Track attack type counts
    attackCountsRef.current[threat.attackType] = 
      (attackCountsRef.current[threat.attackType] || 0) + 1;

    // Track per-minute rate
    minuteCountRef.current.push(Date.now());
    minuteCountRef.current = minuteCountRef.current.filter(t => Date.now() - t < 60000);

    // Update tactic counts for MITRE heatmap
    setTacticCounts(prev => ({
      ...prev,
      [threat.mitreTactic]: (prev[threat.mitreTactic] || 0) + 1,
    }));

    // Add arc
    const severityStroke = threat.severity === 'critical' ? 2.5 : threat.severity === 'high' ? 1.8 : 1;
    const colors: Record<string, string> = {
      'DDoS': '#FF0040',
      'SSH Brute Force': '#00F0FF',
      'SQL Injection': '#FF6600',
      'Phishing': '#FFD700',
      'Ransomware': '#FF1493',
      'Port Scan': '#00FF88',
      'XSS': '#FF8C00',
      'Malware C2': '#8B00FF',
      'DNS Tunneling': '#00BFFF',
      'Credential Stuffing': '#FF4500',
    };

    const newArc: ArcData = {
      startLat: threat.sourceLat,
      startLng: threat.sourceLng,
      endLat: threat.targetLat,
      endLng: threat.targetLng,
      color: colors[threat.attackType] || '#00F0FF',
      stroke: severityStroke,
      id: threat.id,
    };

    setActiveArcs(prev => {
      const next = [...prev, newArc];
      return next.slice(-40); // Max 40 arcs
    });

    // Auto-remove arc after 12 seconds
    setTimeout(() => {
      setActiveArcs(prev => prev.filter(a => a.id !== threat.id));
    }, 12000);
  }, []);

  // Generate threats at random intervals
  useEffect(() => {
    const generateNext = () => {
      const threat = generateThreat();
      addThreat(threat);
      // Random interval between 400ms and 2500ms
      const delay = 400 + Math.random() * 2100;
      return setTimeout(generateNext, delay);
    };

    // Start with a burst of initial threats
    for (let i = 0; i < 8; i++) {
      setTimeout(() => addThreat(generateThreat()), i * 300);
    }

    const timeout = setTimeout(generateNext, 2000);
    return () => clearTimeout(timeout);
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

  const recentThreats = threats.slice(0, 25);

  return (
    <ThreatContext.Provider value={{ threats, recentThreats, stats, activeArcs, tacticCounts }}>
      {children}
    </ThreatContext.Provider>
  );
}
