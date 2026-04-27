/**
 * Threat Intelligence API — Server-side proxy
 * Fetches real data from DShield/ISC SANS and enriches with geolocation.
 * Falls back to cached data if APIs are unavailable.
 */
import axios from 'axios';

const DSHIELD_BASE = 'https://isc.sans.edu/api';
const IPAPI_BASE = 'https://ipapi.co';

// Cache to avoid hammering APIs
let topIpsCache: any[] = [];
let topPortsCache: any[] = [];
let threatLevelCache: any = null;
let lastFetchTime = 0;
const CACHE_TTL = 60_000; // 1 minute

// Geolocation cache to avoid re-fetching same IPs
const geoCache = new Map<string, { lat: number; lng: number; country: string; city: string; org: string }>();

// Port-to-protocol mapping for enrichment
const PORT_PROTOCOLS: Record<number, { protocol: string; service: string }> = {
  21: { protocol: 'TCP', service: 'FTP' },
  22: { protocol: 'TCP', service: 'SSH' },
  23: { protocol: 'TCP', service: 'Telnet' },
  25: { protocol: 'TCP', service: 'SMTP' },
  53: { protocol: 'UDP', service: 'DNS' },
  80: { protocol: 'TCP', service: 'HTTP' },
  110: { protocol: 'TCP', service: 'POP3' },
  143: { protocol: 'TCP', service: 'IMAP' },
  443: { protocol: 'TCP', service: 'HTTPS' },
  445: { protocol: 'TCP', service: 'SMB' },
  993: { protocol: 'TCP', service: 'IMAPS' },
  1433: { protocol: 'TCP', service: 'MSSQL' },
  1521: { protocol: 'TCP', service: 'Oracle' },
  2222: { protocol: 'TCP', service: 'SSH-Alt' },
  3306: { protocol: 'TCP', service: 'MySQL' },
  3389: { protocol: 'TCP', service: 'RDP' },
  5432: { protocol: 'TCP', service: 'PostgreSQL' },
  5900: { protocol: 'TCP', service: 'VNC' },
  6379: { protocol: 'TCP', service: 'Redis' },
  8080: { protocol: 'TCP', service: 'HTTP-Alt' },
  8443: { protocol: 'TCP', service: 'HTTPS-Alt' },
  27017: { protocol: 'TCP', service: 'MongoDB' },
};

export interface RealThreatData {
  topAttackers: Array<{
    ip: string;
    reports: number;
    targets: number;
    lat: number;
    lng: number;
    country: string;
    city: string;
    org: string;
  }>;
  topPorts: Array<{
    port: number;
    records: number;
    targets: number;
    sources: number;
    protocol: string;
    service: string;
  }>;
  threatLevel: {
    current: string;
    color: string;
  };
  lastUpdated: string;
  isLive: boolean;
}

async function geolocateIp(ip: string): Promise<{ lat: number; lng: number; country: string; city: string; org: string }> {
  if (geoCache.has(ip)) return geoCache.get(ip)!;
  
  try {
    const resp = await axios.get(`${IPAPI_BASE}/${ip}/json/`, { timeout: 5000 });
    const data = {
      lat: resp.data.latitude || 0,
      lng: resp.data.longitude || 0,
      country: resp.data.country_code || 'XX',
      city: resp.data.city || 'Unknown',
      org: resp.data.org || 'Unknown',
    };
    geoCache.set(ip, data);
    return data;
  } catch {
    const fallback = { lat: 0, lng: 0, country: 'XX', city: 'Unknown', org: 'Unknown' };
    geoCache.set(ip, fallback);
    return fallback;
  }
}

export async function fetchRealThreatData(): Promise<RealThreatData> {
  const now = Date.now();
  
  // Use cache if fresh
  if (now - lastFetchTime < CACHE_TTL && topIpsCache.length > 0) {
    return {
      topAttackers: topIpsCache,
      topPorts: topPortsCache,
      threatLevel: threatLevelCache || { current: 'green', color: '#00FF88' },
      lastUpdated: new Date(lastFetchTime).toISOString(),
      isLive: true,
    };
  }

  try {
    // Fetch top attacking IPs, top ports, and threat level from DShield
    const [ipsResp, portsResp, infoconResp] = await Promise.all([
      axios.get(`${DSHIELD_BASE}/topips/records/20?json`, { timeout: 10000 }),
      axios.get(`${DSHIELD_BASE}/topports/records/15?json`, { timeout: 10000 }),
      axios.get(`${DSHIELD_BASE}/infocon?json`, { timeout: 5000 }).catch(() => null),
    ]);

    // Parse top IPs
    const rawIps = Array.isArray(ipsResp.data) ? ipsResp.data : [];
    
    // Geolocate top 15 IPs (rate limit friendly)
    const geoPromises = rawIps.slice(0, 15).map(async (entry: any) => {
      const geo = await geolocateIp(entry.source);
      return {
        ip: entry.source,
        reports: entry.reports || 0,
        targets: entry.targets || 0,
        ...geo,
      };
    });
    
    topIpsCache = await Promise.all(geoPromises);

    // Parse top ports with protocol enrichment
    const rawPorts = typeof portsResp.data === 'object' ? Object.values(portsResp.data) : [];
    topPortsCache = (rawPorts as any[]).map((entry: any) => {
      const portNum = entry.targetport || 0;
      const portInfo = PORT_PROTOCOLS[portNum] || { protocol: 'TCP', service: `P:${portNum}` };
      return {
        port: portNum,
        records: entry.records || 0,
        targets: entry.targets || 0,
        sources: entry.sources || 0,
        protocol: portInfo.protocol,
        service: portInfo.service,
      };
    });

    // Parse threat level (infocon)
    if (infoconResp?.data) {
      const status = infoconResp.data.status || 'green';
      const colorMap: Record<string, string> = {
        green: '#00FF88',
        yellow: '#FFD700',
        orange: '#FF6600',
        red: '#FF0040',
      };
      threatLevelCache = {
        current: status,
        color: colorMap[status] || '#00FF88',
      };
    }

    lastFetchTime = now;

    return {
      topAttackers: topIpsCache,
      topPorts: topPortsCache,
      threatLevel: threatLevelCache || { current: 'green', color: '#00FF88' },
      lastUpdated: new Date().toISOString(),
      isLive: true,
    };
  } catch (error) {
    console.error('[ThreatAPI] Failed to fetch live data:', error);
    return {
      topAttackers: topIpsCache,
      topPorts: topPortsCache,
      threatLevel: threatLevelCache || { current: 'unknown', color: '#8899aa' },
      lastUpdated: new Date(lastFetchTime).toISOString(),
      isLive: topIpsCache.length > 0,
    };
  }
}
