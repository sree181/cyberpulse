/**
 * CyberPulse Threat Simulation Engine
 * Generates realistic-looking cyber threat data for the immersive display.
 * Uses real-world geographic coordinates and attack type distributions.
 */
import { BRANDING } from './branding';

export interface ThreatEvent {
  id: string;
  timestamp: Date;
  attackType: AttackType;
  severity: Severity;
  sourceIp: string;
  sourceCountry: string;
  sourceCity: string;
  sourceLat: number;
  sourceLng: number;
  targetLat: number;
  targetLng: number;
  targetName: string;
  port: number;
  protocol: string;
  mitreTactic: string;
  mitreTechnique: string;
}

export type AttackType = 
  | 'DDoS' | 'SSH Brute Force' | 'SQL Injection' | 'Phishing' 
  | 'Ransomware' | 'Port Scan' | 'XSS' | 'Malware C2' 
  | 'DNS Tunneling' | 'Credential Stuffing';

export type Severity = 'critical' | 'high' | 'medium' | 'low';

// Colors imported from centralized branding config
export const ATTACK_COLORS: Record<AttackType, string> = BRANDING.attackColors as Record<AttackType, string>;

export const SEVERITY_COLORS: Record<Severity, string> = BRANDING.severityColors;

// Real-world attack source locations (weighted by known threat actor regions)
const ATTACK_SOURCES = [
  { country: 'CN', city: 'Beijing', lat: 39.9042, lng: 116.4074, weight: 18 },
  { country: 'CN', city: 'Shanghai', lat: 31.2304, lng: 121.4737, weight: 12 },
  { country: 'CN', city: 'Shenzhen', lat: 22.5431, lng: 114.0579, weight: 8 },
  { country: 'RU', city: 'Moscow', lat: 55.7558, lng: 37.6173, weight: 15 },
  { country: 'RU', city: 'St. Petersburg', lat: 59.9343, lng: 30.3351, weight: 7 },
  { country: 'US', city: 'New York', lat: 40.7128, lng: -74.0060, weight: 6 },
  { country: 'US', city: 'Los Angeles', lat: 34.0522, lng: -118.2437, weight: 4 },
  { country: 'US', city: 'Chicago', lat: 41.8781, lng: -87.6298, weight: 3 },
  { country: 'BR', city: 'São Paulo', lat: -23.5505, lng: -46.6333, weight: 8 },
  { country: 'IN', city: 'Mumbai', lat: 19.0760, lng: 72.8777, weight: 7 },
  { country: 'IN', city: 'Bangalore', lat: 12.9716, lng: 77.5946, weight: 5 },
  { country: 'KR', city: 'Seoul', lat: 37.5665, lng: 126.9780, weight: 4 },
  { country: 'IR', city: 'Tehran', lat: 35.6892, lng: 51.3890, weight: 6 },
  { country: 'NG', city: 'Lagos', lat: 6.5244, lng: 3.3792, weight: 5 },
  { country: 'DE', city: 'Frankfurt', lat: 50.1109, lng: 8.6821, weight: 3 },
  { country: 'NL', city: 'Amsterdam', lat: 52.3676, lng: 4.9041, weight: 3 },
  { country: 'UA', city: 'Kyiv', lat: 50.4501, lng: 30.5234, weight: 4 },
  { country: 'RO', city: 'Bucharest', lat: 44.4268, lng: 26.1025, weight: 3 },
  { country: 'VN', city: 'Ho Chi Minh', lat: 10.8231, lng: 106.6297, weight: 4 },
  { country: 'ID', city: 'Jakarta', lat: -6.2088, lng: 106.8456, weight: 3 },
  { country: 'PK', city: 'Karachi', lat: 24.8607, lng: 67.0011, weight: 2 },
  { country: 'TH', city: 'Bangkok', lat: 13.7563, lng: 100.5018, weight: 2 },
  { country: 'MX', city: 'Mexico City', lat: 19.4326, lng: -99.1332, weight: 2 },
  { country: 'AR', city: 'Buenos Aires', lat: -34.6037, lng: -58.3816, weight: 2 },
  { country: 'ZA', city: 'Johannesburg', lat: -26.2041, lng: 28.0473, weight: 2 },
  { country: 'GB', city: 'London', lat: 51.5074, lng: -0.1278, weight: 2 },
  { country: 'FR', city: 'Paris', lat: 48.8566, lng: 2.3522, weight: 2 },
  { country: 'JP', city: 'Tokyo', lat: 35.6762, lng: 139.6503, weight: 2 },
  { country: 'AU', city: 'Sydney', lat: -33.8688, lng: 151.2093, weight: 1 },
  { country: 'KP', city: 'Pyongyang', lat: 39.0392, lng: 125.7625, weight: 3 },
];

// Target infrastructure locations (simulating a multinational corporation)
const TARGETS = [
  { name: 'US-EAST HQ', lat: 38.9072, lng: -77.0369 },
  { name: 'US-WEST DC', lat: 37.3861, lng: -122.0839 },
  { name: 'EU-CENTRAL DC', lat: 50.1109, lng: 8.6821 },
  { name: 'APAC DC', lat: 1.3521, lng: 103.8198 },
  { name: 'UK OFFICE', lat: 51.5074, lng: -0.1278 },
];

const ATTACK_TYPES: { type: AttackType; severity: Severity; weight: number; port: number; protocol: string; tactic: string; technique: string }[] = [
  { type: 'DDoS', severity: 'critical', weight: 12, port: 80, protocol: 'TCP', tactic: 'Impact', technique: 'T1498 - Network DoS' },
  { type: 'SSH Brute Force', severity: 'high', weight: 18, port: 22, protocol: 'TCP', tactic: 'Credential Access', technique: 'T1110 - Brute Force' },
  { type: 'SQL Injection', severity: 'critical', weight: 10, port: 443, protocol: 'HTTPS', tactic: 'Initial Access', technique: 'T1190 - Exploit Public App' },
  { type: 'Phishing', severity: 'medium', weight: 15, port: 25, protocol: 'SMTP', tactic: 'Initial Access', technique: 'T1566 - Phishing' },
  { type: 'Ransomware', severity: 'critical', weight: 5, port: 445, protocol: 'SMB', tactic: 'Impact', technique: 'T1486 - Data Encrypted' },
  { type: 'Port Scan', severity: 'low', weight: 20, port: 0, protocol: 'TCP', tactic: 'Reconnaissance', technique: 'T1046 - Network Scanning' },
  { type: 'XSS', severity: 'medium', weight: 8, port: 443, protocol: 'HTTPS', tactic: 'Initial Access', technique: 'T1189 - Drive-by Compromise' },
  { type: 'Malware C2', severity: 'critical', weight: 6, port: 8443, protocol: 'HTTPS', tactic: 'Command and Control', technique: 'T1071 - Application Layer' },
  { type: 'DNS Tunneling', severity: 'high', weight: 4, port: 53, protocol: 'DNS', tactic: 'Exfiltration', technique: 'T1048 - Exfil Over Alt Protocol' },
  { type: 'Credential Stuffing', severity: 'high', weight: 10, port: 443, protocol: 'HTTPS', tactic: 'Credential Access', technique: 'T1110.004 - Credential Stuffing' },
];

function weightedRandom<T extends { weight: number }>(items: T[]): T {
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  let random = Math.random() * totalWeight;
  for (const item of items) {
    random -= item.weight;
    if (random <= 0) return item;
  }
  return items[items.length - 1];
}

function generateIp(): string {
  const octet = () => Math.floor(Math.random() * 254) + 1;
  return `${octet()}.${octet()}.${octet()}.${octet()}`;
}

let threatCounter = 0;

export function generateThreat(): ThreatEvent {
  const source = weightedRandom(ATTACK_SOURCES);
  const target = TARGETS[Math.floor(Math.random() * TARGETS.length)];
  const attack = weightedRandom(ATTACK_TYPES);
  
  threatCounter++;
  
  return {
    id: `THR-${Date.now()}-${threatCounter}`,
    timestamp: new Date(),
    attackType: attack.type,
    severity: attack.severity,
    sourceIp: generateIp(),
    sourceCountry: source.country,
    sourceCity: source.city,
    sourceLat: source.lat + (Math.random() - 0.5) * 2,
    sourceLng: source.lng + (Math.random() - 0.5) * 2,
    targetLat: target.lat,
    targetLng: target.lng,
    targetName: target.name,
    port: attack.port || Math.floor(Math.random() * 65535),
    protocol: attack.protocol,
    mitreTactic: attack.tactic,
    mitreTechnique: attack.technique,
  };
}

// MITRE ATT&CK Tactic categories for the heatmap
export const MITRE_TACTICS = [
  'Reconnaissance', 'Resource Development', 'Initial Access', 
  'Execution', 'Persistence', 'Privilege Escalation',
  'Defense Evasion', 'Credential Access', 'Discovery',
  'Lateral Movement', 'Collection', 'Command and Control',
  'Exfiltration', 'Impact'
];

export const MITRE_TECHNIQUES: Record<string, string[]> = {
  'Reconnaissance': ['Active Scanning', 'Gather Victim Info', 'Search Open Sources', 'Phishing for Info'],
  'Resource Development': ['Acquire Infrastructure', 'Compromise Accounts', 'Develop Capabilities', 'Stage Capabilities'],
  'Initial Access': ['Drive-by Compromise', 'Exploit Public App', 'Phishing', 'Supply Chain'],
  'Execution': ['Command/Script Interpreter', 'Exploitation for Execution', 'User Execution', 'Scheduled Task'],
  'Persistence': ['Account Manipulation', 'Boot Autostart', 'Create Account', 'Implant Container'],
  'Privilege Escalation': ['Abuse Elevation', 'Access Token Manipulation', 'Domain Policy Mod', 'Exploitation'],
  'Defense Evasion': ['Obfuscated Files', 'Masquerading', 'Rootkit', 'Indicator Removal'],
  'Credential Access': ['Brute Force', 'Credential Stuffing', 'OS Credential Dumping', 'Steal Tokens'],
  'Discovery': ['Account Discovery', 'Network Scanning', 'System Info Discovery', 'Permission Groups'],
  'Lateral Movement': ['Remote Services', 'Internal Spearphishing', 'Exploitation of Remote', 'Taint Shared Content'],
  'Collection': ['Archive Collected Data', 'Clipboard Data', 'Email Collection', 'Screen Capture'],
  'Command and Control': ['Application Layer', 'Encrypted Channel', 'Proxy', 'Web Service'],
  'Exfiltration': ['Automated Exfiltration', 'Exfil Over Alt Protocol', 'Exfil Over C2', 'Exfil Over Web'],
  'Impact': ['Data Destruction', 'Data Encrypted', 'Network DoS', 'Resource Hijacking'],
};
