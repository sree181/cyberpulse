/**
 * AI Models for CyberPulse
 * 
 * Three advanced modeling capabilities:
 * 1. Vulnerability Priority Scoring — LLM-powered risk ranking
 * 2. LLM Threat Narrative Generator — contextual analyst prose
 * 3. Attack-to-CVE Linkage — connects live attacks to exploited CVEs
 * 
 * All models use the same real data sources (DShield, CISA KEV, NVD)
 * and the built-in invokeLLM helper for inference.
 */
import { invokeLLM } from './_core/llm';
import { fetchThreatOfTheDay, type SpotlightCVE } from './cveApi';
import { fetchWeeklyBriefing } from './weeklyBriefingApi';
import { fetchRealThreatData } from './threatApi';

// ═══════════════════════════════════════════════════════════════════════════════
// MODEL 1: VULNERABILITY PRIORITY SCORING
// ═══════════════════════════════════════════════════════════════════════════════

export interface PriorityScoredCVE {
  cveId: string;
  title: string;
  vendor: string;
  product: string;
  riskScore: number; // 0-100
  urgency: 'immediate' | 'high' | 'moderate' | 'routine';
  reasoning: string;
  factors: {
    cvssWeight: number;
    exploitationWeight: number;
    ransomwareWeight: number;
    cweWeight: number;
    recencyWeight: number;
  };
  recommendedAction: string;
  estimatedExploitWindow: string;
}

export interface VulnPriorityResponse {
  prioritizedList: PriorityScoredCVE[];
  modelConfidence: number;
  analysisTimestamp: string;
  dataSource: string;
  totalCVEsAnalyzed: number;
  summary: string;
}

// Cache for priority scoring (expensive LLM call)
let vulnPriorityCache: VulnPriorityResponse | null = null;
let lastVulnPriorityFetch = 0;
const VULN_PRIORITY_CACHE_TTL = 30 * 60 * 1000; // 30 minutes

export async function computeVulnPriorityScoring(): Promise<VulnPriorityResponse> {
  const now = Date.now();
  if (vulnPriorityCache && now - lastVulnPriorityFetch < VULN_PRIORITY_CACHE_TTL) {
    return vulnPriorityCache;
  }

  // Fetch real CVE data
  const cveData = await fetchThreatOfTheDay();
  const cves = cveData.recentCVEs.slice(0, 8); // Top 8 for analysis

  if (cves.length === 0) {
    return {
      prioritizedList: [],
      modelConfidence: 0,
      analysisTimestamp: new Date().toISOString(),
      dataSource: 'No data available',
      totalCVEsAnalyzed: 0,
      summary: 'Unable to perform priority scoring — no CVE data available.',
    };
  }

  // Build structured input for the LLM
  const cveInput = cves.map(cve => ({
    id: cve.cveId,
    title: cve.title,
    vendor: cve.vendor,
    product: cve.product,
    cvss: cve.cvssScore,
    severity: cve.severity,
    cwes: cve.cwes,
    isRansomware: cve.isRansomwareRelated,
    isActivelyExploited: cve.isActivelyExploited,
    dateAdded: cve.dateAdded,
    description: cve.description.slice(0, 200),
  }));

  try {
    const response = await invokeLLM({
      messages: [
        {
          role: 'system',
          content: `You are a senior cybersecurity analyst performing vulnerability triage and priority scoring. 
Analyze the provided CVEs and assign each a risk score (0-100) based on:
- CVSS base score (weight: 25%)
- Active exploitation in the wild (weight: 30%)
- Ransomware campaign linkage (weight: 20%)
- CWE severity class (weight: 15%)
- Recency of disclosure (weight: 10%)

For each CVE, provide:
- riskScore: integer 0-100
- urgency: one of "immediate", "high", "moderate", "routine"
- reasoning: 1-2 sentence explanation of the score
- recommendedAction: specific remediation guidance
- estimatedExploitWindow: time estimate before widespread exploitation (e.g., "24-48 hours", "1-2 weeks")
- factors: breakdown of each weight component (0-100 each)

Also provide an overall summary (2-3 sentences) of the vulnerability landscape.
Return valid JSON matching the schema exactly.`,
        },
        {
          role: 'user',
          content: `Analyze and prioritize these ${cves.length} vulnerabilities:\n\n${JSON.stringify(cveInput, null, 2)}`,
        },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'vulnerability_priority_scoring',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              prioritizedList: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    cveId: { type: 'string' },
                    riskScore: { type: 'number' },
                    urgency: { type: 'string', enum: ['immediate', 'high', 'moderate', 'routine'] },
                    reasoning: { type: 'string' },
                    recommendedAction: { type: 'string' },
                    estimatedExploitWindow: { type: 'string' },
                    factors: {
                      type: 'object',
                      properties: {
                        cvssWeight: { type: 'number' },
                        exploitationWeight: { type: 'number' },
                        ransomwareWeight: { type: 'number' },
                        cweWeight: { type: 'number' },
                        recencyWeight: { type: 'number' },
                      },
                      required: ['cvssWeight', 'exploitationWeight', 'ransomwareWeight', 'cweWeight', 'recencyWeight'],
                      additionalProperties: false,
                    },
                  },
                  required: ['cveId', 'riskScore', 'urgency', 'reasoning', 'recommendedAction', 'estimatedExploitWindow', 'factors'],
                  additionalProperties: false,
                },
              },
              summary: { type: 'string' },
              modelConfidence: { type: 'number' },
            },
            required: ['prioritizedList', 'summary', 'modelConfidence'],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0]?.message?.content;
    const parsed = JSON.parse(typeof content === 'string' ? content : '{}');

    // Enrich with original CVE metadata
    const enriched: PriorityScoredCVE[] = (parsed.prioritizedList || []).map((item: any) => {
      const originalCve = cves.find(c => c.cveId === item.cveId);
      return {
        ...item,
        title: originalCve?.title || item.cveId,
        vendor: originalCve?.vendor || 'Unknown',
        product: originalCve?.product || 'Unknown',
      };
    });

    // Sort by risk score descending
    enriched.sort((a, b) => b.riskScore - a.riskScore);

    vulnPriorityCache = {
      prioritizedList: enriched,
      modelConfidence: parsed.modelConfidence || 85,
      analysisTimestamp: new Date().toISOString(),
      dataSource: cveData.source,
      totalCVEsAnalyzed: cves.length,
      summary: parsed.summary || 'Analysis complete.',
    };
    lastVulnPriorityFetch = now;
    return vulnPriorityCache;
  } catch (error) {
    console.error('[AI Models] Vulnerability Priority Scoring failed:', error);
    // Fallback: compute scores algorithmically without LLM
    return computeFallbackPriorityScoring(cves, cveData.source);
  }
}

function computeFallbackPriorityScoring(cves: SpotlightCVE[], source: string): VulnPriorityResponse {
  const scored: PriorityScoredCVE[] = cves.map(cve => {
    const cvssWeight = ((cve.cvssScore || 5) / 10) * 100;
    const exploitationWeight = cve.isActivelyExploited ? 100 : 20;
    const ransomwareWeight = cve.isRansomwareRelated ? 100 : 0;
    const cweWeight = cve.cwes.length > 0 ? 70 : 30;
    const daysSinceAdded = Math.max(1, Math.floor((Date.now() - new Date(cve.dateAdded).getTime()) / 86400000));
    const recencyWeight = Math.max(0, 100 - daysSinceAdded * 5);

    const riskScore = Math.round(
      cvssWeight * 0.25 + exploitationWeight * 0.30 + ransomwareWeight * 0.20 + cweWeight * 0.15 + recencyWeight * 0.10
    );

    let urgency: 'immediate' | 'high' | 'moderate' | 'routine' = 'routine';
    if (riskScore >= 85) urgency = 'immediate';
    else if (riskScore >= 70) urgency = 'high';
    else if (riskScore >= 50) urgency = 'moderate';

    return {
      cveId: cve.cveId,
      title: cve.title,
      vendor: cve.vendor,
      product: cve.product,
      riskScore,
      urgency,
      reasoning: `${cve.isActivelyExploited ? 'Actively exploited. ' : ''}${cve.isRansomwareRelated ? 'Ransomware-linked. ' : ''}CVSS ${cve.cvssScore || 'N/A'}.`,
      factors: { cvssWeight, exploitationWeight, ransomwareWeight, cweWeight, recencyWeight },
      recommendedAction: cve.isRansomwareRelated
        ? 'Immediate patching required. Isolate vulnerable systems until patched.'
        : cve.isActivelyExploited
          ? 'Patch within 24-48 hours. Monitor for indicators of compromise.'
          : 'Schedule patching per standard vulnerability management SLA.',
      estimatedExploitWindow: cve.isActivelyExploited ? 'Already exploited' : riskScore > 70 ? '1-7 days' : '2-4 weeks',
    };
  });

  scored.sort((a, b) => b.riskScore - a.riskScore);

  return {
    prioritizedList: scored,
    modelConfidence: 72,
    analysisTimestamp: new Date().toISOString(),
    dataSource: source,
    totalCVEsAnalyzed: cves.length,
    summary: `Algorithmic scoring applied to ${cves.length} CVEs. ${scored.filter(s => s.urgency === 'immediate').length} require immediate attention.`,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODEL 2: LLM THREAT NARRATIVE GENERATOR
// ═══════════════════════════════════════════════════════════════════════════════

export interface ThreatNarrativeResponse {
  narrative: string; // Markdown-formatted analyst brief
  tone: 'calm' | 'cautious' | 'urgent' | 'critical';
  keyFindings: string[];
  recommendations: string[];
  generatedAt: string;
  dataFreshness: string;
  wordCount: number;
}

let narrativeCache: ThreatNarrativeResponse | null = null;
let lastNarrativeFetch = 0;
const NARRATIVE_CACHE_TTL = 15 * 60 * 1000; // 15 minutes

export async function generateThreatNarrative(): Promise<ThreatNarrativeResponse> {
  const now = Date.now();
  if (narrativeCache && now - lastNarrativeFetch < NARRATIVE_CACHE_TTL) {
    return narrativeCache;
  }

  // Gather all available data
  const [briefingData, threatData, cveData] = await Promise.all([
    fetchWeeklyBriefing(),
    fetchRealThreatData(),
    fetchThreatOfTheDay(),
  ]);

  // Build context for the LLM
  const overviewSlide = briefingData.slides.find(s => s.type === 'overview');
  const geoSlide = briefingData.slides.find(s => s.type === 'geo-trends');
  const portSlide = briefingData.slides.find(s => s.type === 'port-analysis');
  const cveSlide = briefingData.slides.find(s => s.type === 'cve-summary');

  const contextData = {
    weekLabel: briefingData.weekLabel,
    threatLevel: threatData.isLive ? 'active monitoring' : 'degraded visibility',
    overview: overviewSlide?.data || {},
    topCountries: geoSlide?.data?.countries?.slice(0, 5) || [],
    topPorts: portSlide?.data?.ports?.slice(0, 5) || [],
    recentKEVs: cveSlide?.data?.recentCVEs?.slice(0, 3) || [],
    totalNewVulns: cveSlide?.data?.totalNew || 0,
    ransomwareCount: cveSlide?.data?.ransomwareCount || 0,
    topAttackers: threatData.topAttackers.slice(0, 5).map(a => ({
      ip: a.ip,
      country: a.country,
      city: a.city,
      reports: a.reports,
    })),
    spotlightCVE: {
      id: cveData.spotlight.cveId,
      vendor: cveData.spotlight.vendor,
      product: cveData.spotlight.product,
      cvss: cveData.spotlight.cvssScore,
      isRansomware: cveData.spotlight.isRansomwareRelated,
    },
  };

  try {
    const response = await invokeLLM({
      messages: [
        {
          role: 'system',
          content: `You are a senior SOC analyst writing a concise threat intelligence brief for executive leadership and the security operations team. 

Your writing style:
- Professional, authoritative, and measured
- Use specific data points and metrics from the provided intelligence
- Adapt tone to the threat landscape (calm when stable, urgent when critical)
- Structure: Opening assessment → Key findings → Actionable recommendations
- Keep the narrative to 3-4 paragraphs (150-250 words total)
- Do NOT use bullet points in the narrative — write in flowing prose
- Reference specific CVE IDs, country codes, and port numbers when relevant
- End with a clear, actionable recommendation

Return valid JSON matching the schema.`,
        },
        {
          role: 'user',
          content: `Generate a threat intelligence narrative brief based on this week's data:\n\n${JSON.stringify(contextData, null, 2)}`,
        },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'threat_narrative',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              narrative: { type: 'string', description: 'The full narrative in markdown prose (3-4 paragraphs)' },
              tone: { type: 'string', enum: ['calm', 'cautious', 'urgent', 'critical'] },
              keyFindings: {
                type: 'array',
                items: { type: 'string' },
                description: '3-5 key findings as short sentences',
              },
              recommendations: {
                type: 'array',
                items: { type: 'string' },
                description: '2-3 actionable recommendations',
              },
            },
            required: ['narrative', 'tone', 'keyFindings', 'recommendations'],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0]?.message?.content;
    const parsed = JSON.parse(typeof content === 'string' ? content : '{}');

    narrativeCache = {
      narrative: parsed.narrative || 'Narrative generation failed.',
      tone: parsed.tone || 'cautious',
      keyFindings: parsed.keyFindings || [],
      recommendations: parsed.recommendations || [],
      generatedAt: new Date().toISOString(),
      dataFreshness: briefingData.dataFreshness,
      wordCount: (parsed.narrative || '').split(/\s+/).length,
    };
    lastNarrativeFetch = now;
    return narrativeCache;
  } catch (error) {
    console.error('[AI Models] Threat Narrative generation failed:', error);
    return generateFallbackNarrative(contextData);
  }
}

function generateFallbackNarrative(data: any): ThreatNarrativeResponse {
  const totalEvents = data.overview?.totalRecords || 0;
  const trend = data.overview?.trendDirection || 'stable';
  const topCountry = data.topCountries?.[0]?.code || 'Unknown';
  const ransomwareCount = data.ransomwareCount || 0;

  const narrative = `The threat landscape for ${data.weekLabel || 'this period'} remains ${trend === 'increasing' ? 'elevated with upward pressure' : trend === 'decreasing' ? 'moderating with declining volume' : 'within established baselines'}. Total observed events reached ${totalEvents.toLocaleString()}, with primary attack traffic originating from ${topCountry} and targeting critical infrastructure services.${ransomwareCount > 0 ? ` Notably, ${ransomwareCount} new ransomware-linked vulnerabilities were added to the CISA KEV catalog, requiring immediate attention from patch management teams.` : ''}\n\nNetwork defenders should maintain heightened awareness of ${data.topPorts?.[0]?.service || 'SSH'} targeting activity and ensure perimeter controls are current. The overall posture recommendation is to continue standard monitoring with emphasis on timely patch application.`;

  return {
    narrative,
    tone: trend === 'increasing' ? 'cautious' : 'calm',
    keyFindings: [
      `Total events: ${totalEvents.toLocaleString()}`,
      `Trend: ${trend}`,
      `Top source: ${topCountry}`,
    ],
    recommendations: [
      'Maintain standard monitoring posture',
      'Prioritize patch management for actively exploited CVEs',
    ],
    generatedAt: new Date().toISOString(),
    dataFreshness: 'partial',
    wordCount: narrative.split(/\s+/).length,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODEL 3: ATTACK-TO-CVE LINKAGE
// ═══════════════════════════════════════════════════════════════════════════════

export interface AttackCVELink {
  attackType: string;
  port: number;
  protocol: string;
  linkedCVEs: Array<{
    cveId: string;
    title: string;
    vendor: string;
    product: string;
    cvssScore: number | null;
    confidence: number; // 0-100
    linkReason: string;
  }>;
  observedVolume: string; // e.g., "High", "Moderate"
  mitreTactic: string;
  mitreTechnique: string;
}

export interface AttackCVELinkageResponse {
  linkages: AttackCVELink[];
  totalLinksFound: number;
  coveragePercent: number; // % of active attacks linked to a CVE
  analysisTimestamp: string;
  methodology: string;
}

// Port/attack type to CWE mapping for rule-based linkage
const ATTACK_TO_CWE: Record<string, string[]> = {
  'SSH Brute Force': ['CWE-287', 'CWE-522', 'CWE-306'],
  'SQL Injection': ['CWE-89', 'CWE-94'],
  'XSS': ['CWE-79'],
  'Ransomware': ['CWE-502', 'CWE-434', 'CWE-78'],
  'DDoS': ['CWE-400'],
  'Credential Stuffing': ['CWE-287', 'CWE-798', 'CWE-522'],
  'Phishing': ['CWE-79', 'CWE-20'],
  'Port Scan': ['CWE-200'],
  'Malware C2': ['CWE-94', 'CWE-502'],
  'DNS Tunneling': ['CWE-611', 'CWE-918'],
};

const PORT_TO_ATTACK: Record<number, string[]> = {
  22: ['SSH Brute Force', 'Credential Stuffing'],
  80: ['SQL Injection', 'XSS', 'DDoS'],
  443: ['SQL Injection', 'Credential Stuffing', 'Phishing'],
  445: ['Ransomware'],
  3389: ['Credential Stuffing', 'SSH Brute Force'],
  3306: ['SQL Injection'],
  5432: ['SQL Injection'],
  53: ['DNS Tunneling'],
  25: ['Phishing'],
  8443: ['Malware C2'],
};

let linkageCache: AttackCVELinkageResponse | null = null;
let lastLinkageFetch = 0;
const LINKAGE_CACHE_TTL = 15 * 60 * 1000; // 15 minutes

export async function computeAttackCVELinkage(): Promise<AttackCVELinkageResponse> {
  const now = Date.now();
  if (linkageCache && now - lastLinkageFetch < LINKAGE_CACHE_TTL) {
    return linkageCache;
  }

  // Fetch real data
  const [threatData, cveData] = await Promise.all([
    fetchRealThreatData(),
    fetchThreatOfTheDay(),
  ]);

  const activePorts = threatData.topPorts.slice(0, 10);
  const allCVEs = cveData.recentCVEs;

  const linkages: AttackCVELink[] = [];

  for (const portData of activePorts) {
    const attackTypes = PORT_TO_ATTACK[portData.port] || [`Port ${portData.port} Activity`];

    for (const attackType of attackTypes) {
      const relevantCWEs = ATTACK_TO_CWE[attackType] || [];
      
      // Find CVEs that match the CWE pattern
      const linkedCVEs = allCVEs
        .filter(cve => {
          // Match by CWE overlap
          const cweMatch = cve.cwes.some(cwe => relevantCWEs.includes(cwe));
          // Match by description keywords
          const descMatch = matchDescriptionToAttack(cve.description, attackType);
          return cweMatch || descMatch;
        })
        .map(cve => {
          const cweMatch = cve.cwes.some(cwe => relevantCWEs.includes(cwe));
          const descMatch = matchDescriptionToAttack(cve.description, attackType);
          const confidence = calculateLinkConfidence(cve, attackType, cweMatch, descMatch);

          return {
            cveId: cve.cveId,
            title: cve.title,
            vendor: cve.vendor,
            product: cve.product,
            cvssScore: cve.cvssScore,
            confidence,
            linkReason: cweMatch
              ? `CWE match: ${cve.cwes.filter(c => relevantCWEs.includes(c)).join(', ')}`
              : `Semantic match: attack vector aligns with vulnerability description`,
          };
        })
        .filter(link => link.confidence >= 40)
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 3);

      if (linkedCVEs.length > 0) {
        // Determine MITRE mapping
        const mitreMap: Record<string, { tactic: string; technique: string }> = {
          'SSH Brute Force': { tactic: 'Credential Access', technique: 'T1110 - Brute Force' },
          'SQL Injection': { tactic: 'Initial Access', technique: 'T1190 - Exploit Public App' },
          'XSS': { tactic: 'Initial Access', technique: 'T1189 - Drive-by Compromise' },
          'Ransomware': { tactic: 'Impact', technique: 'T1486 - Data Encrypted' },
          'DDoS': { tactic: 'Impact', technique: 'T1498 - Network DoS' },
          'Credential Stuffing': { tactic: 'Credential Access', technique: 'T1110.004 - Credential Stuffing' },
          'Phishing': { tactic: 'Initial Access', technique: 'T1566 - Phishing' },
          'Port Scan': { tactic: 'Reconnaissance', technique: 'T1046 - Network Scanning' },
          'Malware C2': { tactic: 'Command and Control', technique: 'T1071 - Application Layer' },
          'DNS Tunneling': { tactic: 'Exfiltration', technique: 'T1048 - Exfil Over Alt Protocol' },
        };

        const mitre = mitreMap[attackType] || { tactic: 'Unknown', technique: 'Unknown' };

        linkages.push({
          attackType,
          port: portData.port,
          protocol: portData.protocol || 'TCP',
          linkedCVEs,
          observedVolume: portData.records > 10000 ? 'High' : portData.records > 1000 ? 'Moderate' : 'Low',
          mitreTactic: mitre.tactic,
          mitreTechnique: mitre.technique,
        });
      }
    }
  }

  // Deduplicate by attack type (keep highest confidence linkage)
  const deduped = new Map<string, AttackCVELink>();
  for (const link of linkages) {
    const existing = deduped.get(link.attackType);
    if (!existing || (link.linkedCVEs[0]?.confidence || 0) > (existing.linkedCVEs[0]?.confidence || 0)) {
      deduped.set(link.attackType, link);
    }
  }

  const finalLinkages = Array.from(deduped.values())
    .sort((a, b) => (b.linkedCVEs[0]?.confidence || 0) - (a.linkedCVEs[0]?.confidence || 0));

  const totalLinks = finalLinkages.reduce((sum, l) => sum + l.linkedCVEs.length, 0);
  const coverage = activePorts.length > 0
    ? Math.round((finalLinkages.length / activePorts.length) * 100)
    : 0;

  linkageCache = {
    linkages: finalLinkages,
    totalLinksFound: totalLinks,
    coveragePercent: Math.min(coverage, 100),
    analysisTimestamp: new Date().toISOString(),
    methodology: 'Rule-based CWE mapping + semantic description matching + confidence scoring',
  };
  lastLinkageFetch = now;
  return linkageCache;
}

function matchDescriptionToAttack(description: string, attackType: string): boolean {
  const keywords: Record<string, string[]> = {
    'SSH Brute Force': ['authentication', 'ssh', 'login', 'credential', 'password', 'brute'],
    'SQL Injection': ['sql', 'injection', 'query', 'database', 'input validation'],
    'XSS': ['cross-site', 'xss', 'script', 'javascript', 'html injection'],
    'Ransomware': ['ransomware', 'encrypt', 'ransom', 'file system', 'malware'],
    'DDoS': ['denial of service', 'dos', 'resource exhaustion', 'flood', 'amplification'],
    'Credential Stuffing': ['credential', 'authentication bypass', 'unauthorized access', 'login'],
    'Phishing': ['phishing', 'social engineering', 'email', 'redirect', 'spoofing'],
    'Malware C2': ['command and control', 'c2', 'backdoor', 'remote code', 'rce'],
    'DNS Tunneling': ['dns', 'tunnel', 'exfiltration', 'covert channel'],
    'Port Scan': ['scan', 'enumeration', 'discovery', 'reconnaissance'],
  };

  const terms = keywords[attackType] || [];
  const lowerDesc = description.toLowerCase();
  return terms.some(term => lowerDesc.includes(term));
}

function calculateLinkConfidence(
  cve: SpotlightCVE,
  attackType: string,
  cweMatch: boolean,
  descMatch: boolean
): number {
  let confidence = 0;

  // CWE match is strongest signal
  if (cweMatch) confidence += 50;
  
  // Description keyword match
  if (descMatch) confidence += 25;

  // Active exploitation boosts confidence
  if (cve.isActivelyExploited) confidence += 15;

  // High CVSS means more likely to be targeted
  if (cve.cvssScore && cve.cvssScore >= 9.0) confidence += 10;
  else if (cve.cvssScore && cve.cvssScore >= 7.0) confidence += 5;

  // Ransomware linkage for ransomware attacks
  if (attackType === 'Ransomware' && cve.isRansomwareRelated) confidence += 20;

  return Math.min(confidence, 99);
}
