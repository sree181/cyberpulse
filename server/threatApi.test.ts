import { describe, expect, it } from "vitest";
import { fetchRealThreatData } from "./threatApi";

describe("threatApi — blocklist.de + ip-api.com", () => {
  it("returns threat data with expected structure", { timeout: 30000 }, async () => {
    const data = await fetchRealThreatData();
    
    expect(data).toHaveProperty("topAttackers");
    expect(data).toHaveProperty("topPorts");
    expect(data).toHaveProperty("lastUpdated");
    expect(data).toHaveProperty("isLive");
    expect(data).toHaveProperty("threatLevel");
    
    expect(Array.isArray(data.topAttackers)).toBe(true);
    expect(Array.isArray(data.topPorts)).toBe(true);
    expect(typeof data.lastUpdated).toBe("string");
    expect(typeof data.isLive).toBe("boolean");
    expect(data.threatLevel).toHaveProperty("current");
    expect(data.threatLevel).toHaveProperty("color");
  });

  it("returns live data from blocklist.de with geolocated attackers", { timeout: 30000 }, async () => {
    const data = await fetchRealThreatData();
    
    // blocklist.de should always have data (it's a very active feed)
    expect(data.isLive).toBe(true);
    expect(data.topAttackers.length).toBeGreaterThan(0);
    
    const attacker = data.topAttackers[0];
    expect(attacker).toHaveProperty("ip");
    expect(attacker).toHaveProperty("reports");
    expect(attacker).toHaveProperty("lat");
    expect(attacker).toHaveProperty("lng");
    expect(attacker).toHaveProperty("country");
    expect(attacker).toHaveProperty("city");
    expect(attacker).toHaveProperty("org");
    expect(typeof attacker.lat).toBe("number");
    expect(typeof attacker.lng).toBe("number");
    // Should have valid geolocation (not 0,0 fallback for at least some)
    const hasValidGeo = data.topAttackers.some(a => a.lat !== 0 || a.lng !== 0);
    expect(hasValidGeo).toBe(true);
  });

  it("returns port activity categorized by service", { timeout: 30000 }, async () => {
    const data = await fetchRealThreatData();
    
    expect(data.topPorts.length).toBeGreaterThan(0);
    
    const port = data.topPorts[0];
    expect(port).toHaveProperty("port");
    expect(port).toHaveProperty("records");
    expect(port).toHaveProperty("protocol");
    expect(port).toHaveProperty("service");
    expect(typeof port.port).toBe("number");
    expect(typeof port.records).toBe("number");
    
    // SSH is typically the most attacked service
    const sshPort = data.topPorts.find(p => p.service === 'SSH');
    expect(sshPort).toBeDefined();
    expect(sshPort!.port).toBe(22);
  });

  it("computes threat level from attack volume", { timeout: 30000 }, async () => {
    const data = await fetchRealThreatData();
    
    expect(['green', 'yellow', 'orange', 'red']).toContain(data.threatLevel.current);
    expect(data.threatLevel.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });

  it("uses cache on second call within TTL", { timeout: 30000 }, async () => {
    // First call fetches fresh data
    const data1 = await fetchRealThreatData();
    const ts1 = data1.lastUpdated;
    
    // Second call should use cache (same lastUpdated)
    const data2 = await fetchRealThreatData();
    expect(data2.lastUpdated).toBe(ts1);
    expect(data2.isLive).toBe(true);
  });
});
