import { describe, expect, it } from "vitest";
import { fetchWeeklyBriefing } from "./weeklyBriefingApi";

describe("weeklyBriefingApi", () => {
  it("returns weekly briefing with expected structure", async () => {
    const result = await fetchWeeklyBriefing();

    expect(result).toHaveProperty("weekLabel");
    expect(result).toHaveProperty("slides");
    expect(result).toHaveProperty("generatedAt");
    expect(result).toHaveProperty("dataFreshness");

    // Should have 7 slides
    expect(result.slides.length).toBe(7);

    // Each slide should have required fields
    for (const slide of result.slides) {
      expect(slide).toHaveProperty("id");
      expect(slide).toHaveProperty("type");
      expect(slide).toHaveProperty("title");
      expect(slide).toHaveProperty("subtitle");
      expect(slide).toHaveProperty("data");
      expect(typeof slide.title).toBe("string");
      expect(slide.title.length).toBeGreaterThan(0);
    }

    // Verify slide types
    const types = result.slides.map(s => s.type);
    expect(types).toContain("overview");
    expect(types).toContain("top-vectors");
    expect(types).toContain("geo-trends");
    expect(types).toContain("port-analysis");
    expect(types).toContain("cve-summary");
    expect(types).toContain("severity-breakdown");
    expect(types).toContain("key-takeaway");
  }, 45000);

  it("overview slide contains valid weekly metrics", async () => {
    const result = await fetchWeeklyBriefing();
    const overview = result.slides.find(s => s.type === "overview");
    
    expect(overview).toBeDefined();
    expect(overview!.data).toHaveProperty("totalRecords");
    expect(overview!.data).toHaveProperty("trendDirection");
    expect(overview!.data).toHaveProperty("threatLevel");
    expect(["increasing", "decreasing", "stable"]).toContain(overview!.data.trendDirection);
    expect(typeof overview!.data.totalRecords).toBe("number");
  }, 45000);

  it("key takeaway slide contains insights and recommendation", async () => {
    const result = await fetchWeeklyBriefing();
    const takeaway = result.slides.find(s => s.type === "key-takeaway");
    
    expect(takeaway).toBeDefined();
    expect(takeaway!.data).toHaveProperty("insights");
    expect(takeaway!.data).toHaveProperty("recommendation");
    expect(Array.isArray(takeaway!.data.insights)).toBe(true);
    expect(takeaway!.data.insights.length).toBeGreaterThan(0);
    expect(typeof takeaway!.data.recommendation).toBe("string");
  }, 45000);

  it("week label follows expected format", async () => {
    const result = await fetchWeeklyBriefing();
    // Should be like "Apr 27 — May 3, 2026"
    expect(result.weekLabel).toMatch(/\w{3} \d{1,2} — \w{3} \d{1,2}, \d{4}/);
  }, 45000);
});
