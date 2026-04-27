import { describe, expect, it } from "vitest";
import { fetchThreatOfTheDay } from "./cveApi";

describe("cveApi", () => {
  it("returns threat of the day with expected structure", async () => {
    const result = await fetchThreatOfTheDay();

    // Should have a spotlight CVE
    expect(result).toHaveProperty("spotlight");
    expect(result).toHaveProperty("recentCVEs");
    expect(result).toHaveProperty("source");
    expect(result).toHaveProperty("lastUpdated");

    // Spotlight should have required fields
    const spotlight = result.spotlight;
    expect(spotlight).toHaveProperty("cveId");
    expect(spotlight).toHaveProperty("title");
    expect(spotlight).toHaveProperty("description");
    expect(spotlight).toHaveProperty("severity");
    expect(spotlight).toHaveProperty("severityColor");
    expect(spotlight).toHaveProperty("educationalNote");
    expect(spotlight).toHaveProperty("nvdUrl");

    // CVE ID should match pattern
    expect(spotlight.cveId).toMatch(/^CVE-\d{4}-\d+$/);

    // Description should not be empty
    expect(spotlight.description.length).toBeGreaterThan(0);

    // Educational note should be generated
    expect(spotlight.educationalNote.length).toBeGreaterThan(0);

    // recentCVEs should be an array with items
    expect(Array.isArray(result.recentCVEs)).toBe(true);
    expect(result.recentCVEs.length).toBeGreaterThan(0);
    expect(result.recentCVEs.length).toBeLessThanOrEqual(10);

    // Each recent CVE should have required fields
    for (const cve of result.recentCVEs) {
      expect(cve.cveId).toMatch(/^CVE-\d{4}-\d+$/);
      expect(cve.nvdUrl).toContain("nvd.nist.gov");
    }
  }, 30000);

  it("returns actively exploited CVEs from CISA KEV", async () => {
    const result = await fetchThreatOfTheDay();
    
    // At least some CVEs should be marked as actively exploited (from KEV)
    const exploited = result.recentCVEs.filter(c => c.isActivelyExploited);
    expect(exploited.length).toBeGreaterThan(0);
  }, 30000);

  it("generates educational notes for CVEs", async () => {
    const result = await fetchThreatOfTheDay();
    
    // All CVEs should have educational notes
    for (const cve of result.recentCVEs) {
      expect(cve.educationalNote).toBeTruthy();
      expect(typeof cve.educationalNote).toBe("string");
    }
  }, 30000);
});
