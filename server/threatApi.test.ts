import { describe, expect, it } from "vitest";
import { fetchRealThreatData } from "./threatApi";

describe("threatApi", () => {
  it("returns threat data with expected structure", { timeout: 30000 }, async () => {
    const data = await fetchRealThreatData();
    
    expect(data).toHaveProperty("topAttackers");
    expect(data).toHaveProperty("topPorts");
    expect(data).toHaveProperty("lastUpdated");
    expect(data).toHaveProperty("isLive");
    
    expect(Array.isArray(data.topAttackers)).toBe(true);
    expect(Array.isArray(data.topPorts)).toBe(true);
    expect(typeof data.lastUpdated).toBe("string");
    expect(typeof data.isLive).toBe("boolean");
  });

  it("returns geolocated attacker data when live", { timeout: 30000 }, async () => {
    const data = await fetchRealThreatData();
    
    if (data.isLive && data.topAttackers.length > 0) {
      const attacker = data.topAttackers[0];
      expect(attacker).toHaveProperty("ip");
      expect(attacker).toHaveProperty("reports");
      expect(attacker).toHaveProperty("lat");
      expect(attacker).toHaveProperty("lng");
      expect(attacker).toHaveProperty("country");
      expect(typeof attacker.lat).toBe("number");
      expect(typeof attacker.lng).toBe("number");
    }
  });

  it("returns port activity data when live", { timeout: 30000 }, async () => {
    const data = await fetchRealThreatData();
    
    if (data.isLive && data.topPorts.length > 0) {
      const port = data.topPorts[0];
      expect(port).toHaveProperty("port");
      expect(port).toHaveProperty("records");
      expect(typeof port.port).toBe("number");
      expect(typeof port.records).toBe("number");
    }
  });
});
