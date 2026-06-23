import { describe, it, expect, vi } from 'vitest';

// These tests call external APIs (CISA KEV, NVD, LLM) so they need longer timeouts
vi.setConfig({ testTimeout: 120_000 });
import { computeVulnPriorityScoring, generateThreatNarrative, computeAttackCVELinkage } from './aiModels';

describe('aiModels', () => {
  describe('computeVulnPriorityScoring', () => {
    it('returns a prioritized list with expected structure', async () => {
      const result = await computeVulnPriorityScoring();
      
      expect(result).toHaveProperty('prioritizedList');
      expect(result).toHaveProperty('modelConfidence');
      expect(result).toHaveProperty('totalCVEsAnalyzed');
      expect(result).toHaveProperty('dataSource');
      expect(result).toHaveProperty('summary');
      
      expect(Array.isArray(result.prioritizedList)).toBe(true);
      expect(typeof result.modelConfidence).toBe('number');
      expect(result.modelConfidence).toBeGreaterThanOrEqual(0);
      expect(result.modelConfidence).toBeLessThanOrEqual(100);
    });

    it('each priority item has required fields', async () => {
      const result = await computeVulnPriorityScoring();
      
      if (result.prioritizedList.length > 0) {
        const item = result.prioritizedList[0];
        expect(item).toHaveProperty('cveId');
        expect(item).toHaveProperty('riskScore');
        expect(item).toHaveProperty('urgency');
        expect(item).toHaveProperty('reasoning');
        expect(item).toHaveProperty('recommendedAction');
        expect(item).toHaveProperty('factors');
        expect(typeof item.riskScore).toBe('number');
        expect(['immediate', 'high', 'moderate', 'routine']).toContain(item.urgency);
      }
    });
  });

  describe('generateThreatNarrative', () => {
    it('returns a narrative with expected structure', async () => {
      const result = await generateThreatNarrative();
      
      expect(result).toHaveProperty('narrative');
      expect(result).toHaveProperty('tone');
      expect(result).toHaveProperty('keyFindings');
      expect(result).toHaveProperty('recommendations');
      expect(result).toHaveProperty('wordCount');
      
      expect(typeof result.narrative).toBe('string');
      expect(result.narrative.length).toBeGreaterThan(0);
      expect(['calm', 'cautious', 'urgent', 'critical']).toContain(result.tone);
      expect(Array.isArray(result.keyFindings)).toBe(true);
      expect(Array.isArray(result.recommendations)).toBe(true);
      expect(typeof result.wordCount).toBe('number');
      expect(result.wordCount).toBeGreaterThan(0);
    });
  });

  describe('computeAttackCVELinkage', () => {
    it('returns linkage data with expected structure', async () => {
      const result = await computeAttackCVELinkage();
      
      expect(result).toHaveProperty('linkages');
      expect(result).toHaveProperty('totalLinksFound');
      expect(result).toHaveProperty('coveragePercent');
      expect(result).toHaveProperty('methodology');
      
      expect(Array.isArray(result.linkages)).toBe(true);
      expect(typeof result.totalLinksFound).toBe('number');
      expect(typeof result.coveragePercent).toBe('number');
    });

    it('each linkage has attack type and linked CVEs', async () => {
      const result = await computeAttackCVELinkage();
      
      if (result.linkages.length > 0) {
        const link = result.linkages[0];
        expect(link).toHaveProperty('attackType');
        expect(link).toHaveProperty('port');
        expect(link).toHaveProperty('linkedCVEs');
        expect(link).toHaveProperty('mitreTactic');
        expect(link).toHaveProperty('mitreTechnique');
        expect(link).toHaveProperty('observedVolume');
        expect(Array.isArray(link.linkedCVEs)).toBe(true);
        
        if (link.linkedCVEs.length > 0) {
          const cve = link.linkedCVEs[0];
          expect(cve).toHaveProperty('cveId');
          expect(cve).toHaveProperty('confidence');
          expect(cve).toHaveProperty('linkReason');
          expect(typeof cve.confidence).toBe('number');
        }
      }
    });
  });
});
