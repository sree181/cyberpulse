/**
 * CVE / Threat of the Day API
 * Fetches real CVE data from:
 *   1. CISA Known Exploited Vulnerabilities (KEV) catalog — actively exploited CVEs
 *   2. NVD CVE API 2.0 — recent critical/high severity CVEs with CVSS scores
 * 
 * Combines both sources and rotates a "Threat of the Day" spotlight.
 */
import axios from 'axios';

const CISA_KEV_URL = 'https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json';
const NVD_API_URL = 'https://services.nvd.nist.gov/rest/json/cves/2.0';

// CWE to MITRE ATT&CK tactic mapping for educational context
const CWE_TO_TACTIC: Record<string, string> = {
  'CWE-79': 'Initial Access — Cross-Site Scripting',
  'CWE-89': 'Initial Access — SQL Injection',
  'CWE-94': 'Execution — Code Injection',
  'CWE-78': 'Execution — OS Command Injection',
  'CWE-434': 'Initial Access — Unrestricted File Upload',
  'CWE-502': 'Execution — Deserialization of Untrusted Data',
  'CWE-287': 'Initial Access — Improper Authentication',
  'CWE-522': 'Credential Access — Hard-Coded Credentials',
  'CWE-306': 'Initial Access — Missing Authentication',
  'CWE-269': 'Privilege Escalation — Improper Privilege Management',
  'CWE-77': 'Execution — Command Injection',
  'CWE-22': 'Initial Access — Path Traversal',
  'CWE-20': 'Defense Evasion — Improper Input Validation',
  'CWE-119': 'Execution — Buffer Overflow',
  'CWE-416': 'Execution — Use After Free',
  'CWE-862': 'Privilege Escalation — Missing Authorization',
  'CWE-918': 'Lateral Movement — Server-Side Request Forgery',
  'CWE-400': 'Impact — Resource Exhaustion (DoS)',
  'CWE-611': 'Initial Access — XML External Entity',
  'CWE-798': 'Credential Access — Hard-Coded Credentials',
};

// Severity color mapping
const SEVERITY_COLORS: Record<string, string> = {
  'CRITICAL': '#FF0040',
  'HIGH': '#FF6600',
  'MEDIUM': '#FFD700',
  'LOW': '#00FF88',
};

export interface SpotlightCVE {
  cveId: string;
  title: string;
  description: string;
  vendor: string;
  product: string;
  cvssScore: number | null;
  severity: string;
  severityColor: string;
  dateAdded: string;
  mitreTactic: string;
  cwes: string[];
  isRansomwareRelated: boolean;
  isActivelyExploited: boolean;
  nvdUrl: string;
  educationalNote: string;
}

// Cache
let kevCache: SpotlightCVE[] = [];
let nvdCache: SpotlightCVE[] = [];
let lastKevFetch = 0;
let lastNvdFetch = 0;
const KEV_CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours
const NVD_CACHE_TTL = 2 * 60 * 60 * 1000; // 2 hours

function generateEducationalNote(cve: Partial<SpotlightCVE>): string {
  const notes: string[] = [];

  if (cve.isRansomwareRelated) {
    notes.push('This vulnerability has been used in ransomware campaigns. Organizations should prioritize patching immediately.');
  }
  if (cve.isActivelyExploited) {
    notes.push('CISA confirms this vulnerability is actively exploited in the wild.');
  }
  if (cve.cvssScore && cve.cvssScore >= 9.0) {
    notes.push(`With a CVSS score of ${cve.cvssScore}, this is a critical-severity vulnerability requiring immediate remediation.`);
  } else if (cve.cvssScore && cve.cvssScore >= 7.0) {
    notes.push(`A CVSS score of ${cve.cvssScore} indicates high severity. Patch within your organization's SLA for high-risk vulnerabilities.`);
  }
  if (cve.cwes && cve.cwes.length > 0) {
    const tactic = CWE_TO_TACTIC[cve.cwes[0]];
    if (tactic) {
      notes.push(`MITRE ATT&CK mapping: ${tactic}.`);
    }
  }

  if (notes.length === 0) {
    notes.push('Review vendor advisories and apply patches according to your vulnerability management policy.');
  }

  return notes.join(' ');
}

async function fetchKEVData(): Promise<SpotlightCVE[]> {
  const now = Date.now();
  if (now - lastKevFetch < KEV_CACHE_TTL && kevCache.length > 0) {
    return kevCache;
  }

  try {
    const resp = await axios.get(CISA_KEV_URL, { timeout: 15000 });
    const vulns = resp.data?.vulnerabilities || [];

    // Take the most recently added 50 CVEs (sorted by dateAdded descending)
    const sorted = [...vulns].sort((a: any, b: any) =>
      new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime()
    );

    kevCache = sorted.slice(0, 50).map((v: any) => {
      const cve: SpotlightCVE = {
        cveId: v.cveID,
        title: v.vulnerabilityName || v.cveID,
        description: v.shortDescription || 'No description available.',
        vendor: v.vendorProject || 'Unknown',
        product: v.product || 'Unknown',
        cvssScore: null, // KEV doesn't include CVSS; we'll enrich from NVD if possible
        severity: 'HIGH', // All KEV entries are high priority by definition
        severityColor: SEVERITY_COLORS['HIGH'],
        dateAdded: v.dateAdded,
        mitreTactic: v.cwes?.[0] ? (CWE_TO_TACTIC[v.cwes[0]] || 'Unknown') : 'Unknown',
        cwes: v.cwes || [],
        isRansomwareRelated: v.knownRansomwareCampaignUse === 'Known',
        isActivelyExploited: true, // All KEV entries are actively exploited
        nvdUrl: `https://nvd.nist.gov/vuln/detail/${v.cveID}`,
        educationalNote: '',
      };
      cve.educationalNote = generateEducationalNote(cve);
      return cve;
    });

    lastKevFetch = now;
    return kevCache;
  } catch (error) {
    console.error('[CVE API] Failed to fetch CISA KEV:', error);
    return kevCache;
  }
}

async function fetchNVDData(): Promise<SpotlightCVE[]> {
  const now = Date.now();
  if (now - lastNvdFetch < NVD_CACHE_TTL && nvdCache.length > 0) {
    return nvdCache;
  }

  try {
    // Fetch recent critical CVEs from the last 30 days
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    const params = new URLSearchParams({
      resultsPerPage: '20',
      cvssV3Severity: 'CRITICAL',
      pubStartDate: startDate.toISOString().replace('Z', ''),
      pubEndDate: endDate.toISOString().replace('Z', ''),
    });

    const resp = await axios.get(`${NVD_API_URL}?${params}`, { timeout: 15000 });
    const vulns = resp.data?.vulnerabilities || [];

    nvdCache = vulns.map((v: any) => {
      const cveData = v.cve || {};
      const descriptions = cveData.descriptions || [];
      const enDesc = descriptions.find((d: any) => d.lang === 'en');

      // Extract CVSS score (prefer v3.1, fallback to v3.0)
      let cvssScore: number | null = null;
      let severity = 'UNKNOWN';
      const metrics = cveData.metrics || {};
      for (const key of ['cvssMetricV31', 'cvssMetricV30']) {
        if (metrics[key]?.[0]) {
          const cvssData = metrics[key][0].cvssData;
          cvssScore = cvssData?.baseScore || null;
          severity = cvssData?.baseSeverity || 'UNKNOWN';
          break;
        }
      }

      // Extract CWEs
      const cwes: string[] = [];
      const weaknesses = cveData.weaknesses || [];
      for (const w of weaknesses) {
        for (const desc of w.description || []) {
          if (desc.value && desc.value.startsWith('CWE-')) {
            cwes.push(desc.value);
          }
        }
      }

      const cve: SpotlightCVE = {
        cveId: cveData.id,
        title: cveData.id,
        description: enDesc?.value || 'No description available.',
        vendor: 'Various',
        product: 'Various',
        cvssScore,
        severity,
        severityColor: SEVERITY_COLORS[severity] || '#8899aa',
        dateAdded: cveData.published?.slice(0, 10) || 'Unknown',
        mitreTactic: cwes[0] ? (CWE_TO_TACTIC[cwes[0]] || 'Unknown') : 'Unknown',
        cwes,
        isRansomwareRelated: false,
        isActivelyExploited: false,
        nvdUrl: `https://nvd.nist.gov/vuln/detail/${cveData.id}`,
        educationalNote: '',
      };
      cve.educationalNote = generateEducationalNote(cve);
      return cve;
    });

    lastNvdFetch = now;
    return nvdCache;
  } catch (error) {
    console.error('[CVE API] Failed to fetch NVD data:', error);
    return nvdCache;
  }
}

export interface ThreatOfTheDayResponse {
  spotlight: SpotlightCVE;
  recentCVEs: SpotlightCVE[];
  source: string;
  lastUpdated: string;
}

export async function fetchThreatOfTheDay(): Promise<ThreatOfTheDayResponse> {
  // Fetch both sources in parallel
  const [kevData, nvdData] = await Promise.all([
    fetchKEVData(),
    fetchNVDData(),
  ]);

  // Build NVD lookup map for CVSS enrichment
  const nvdLookup = new Map<string, SpotlightCVE>();
  for (const cve of nvdData) {
    nvdLookup.set(cve.cveId, cve);
  }

  // Enrich KEV entries with NVD CVSS scores where available
  for (const kevCve of kevData) {
    const nvdMatch = nvdLookup.get(kevCve.cveId);
    if (nvdMatch && nvdMatch.cvssScore !== null) {
      kevCve.cvssScore = nvdMatch.cvssScore;
      kevCve.severity = nvdMatch.severity;
      kevCve.severityColor = SEVERITY_COLORS[nvdMatch.severity] || kevCve.severityColor;
      // Re-generate educational note with CVSS data
      kevCve.educationalNote = generateEducationalNote(kevCve);
    }
  }

  // Combine and deduplicate
  const allCVEs = new Map<string, SpotlightCVE>();
  
  // KEV entries take priority (actively exploited)
  for (const cve of kevData) {
    allCVEs.set(cve.cveId, cve);
  }
  for (const cve of nvdData) {
    if (!allCVEs.has(cve.cveId)) {
      allCVEs.set(cve.cveId, cve);
    }
  }

  const combined = Array.from(allCVEs.values());
  
  // Prioritize ransomware-related and actively exploited
  const prioritized = [...combined].sort((a, b) => {
    if (a.isRansomwareRelated && !b.isRansomwareRelated) return -1;
    if (!a.isRansomwareRelated && b.isRansomwareRelated) return 1;
    if (a.isActivelyExploited && !b.isActivelyExploited) return -1;
    if (!a.isActivelyExploited && b.isActivelyExploited) return 1;
    if ((a.cvssScore || 0) > (b.cvssScore || 0)) return -1;
    return 1;
  });

  // Select the "Threat of the Day" — rotate daily through top prioritized CVEs
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  const spotlightPool = prioritized.slice(0, 30); // Top 30 most critical
  const spotlightIndex = spotlightPool.length > 0 ? dayOfYear % spotlightPool.length : 0;

  const spotlight = spotlightPool[spotlightIndex] || {
    cveId: 'CVE-0000-0000',
    title: 'No Data Available',
    description: 'Unable to fetch CVE data. Check network connectivity.',
    vendor: 'N/A',
    product: 'N/A',
    cvssScore: null,
    severity: 'UNKNOWN',
    severityColor: '#8899aa',
    dateAdded: 'N/A',
    mitreTactic: 'Unknown',
    cwes: [],
    isRansomwareRelated: false,
    isActivelyExploited: false,
    nvdUrl: '#',
    educationalNote: 'No data available.',
  };

  // recentCVEs excludes the spotlight to avoid duplication
  const recentCVEs = prioritized.filter(c => c.cveId !== spotlight.cveId).slice(0, 9);

  return {
    spotlight,
    recentCVEs: [spotlight, ...recentCVEs], // Spotlight is always first
    source: kevData.length > 0 ? 'CISA KEV + NVD' : nvdData.length > 0 ? 'NVD' : 'Cached',
    lastUpdated: new Date().toISOString(),
  };
}
