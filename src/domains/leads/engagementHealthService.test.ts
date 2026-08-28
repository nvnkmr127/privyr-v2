import { describe, expect, it, vi } from "vitest";
import { EngagementHealthService } from "./engagementHealthService";

vi.mock("@/db", () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn().mockImplementation(() =>
          Promise.resolve([
            { id: "lead-healthy", name: "Healthy Lead", status: "active", lastContactedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), createdAt: new Date() },
            { id: "lead-attention", name: "Attention Lead", status: "active", lastContactedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), createdAt: new Date() },
            { id: "lead-risk", name: "Risk Lead", status: "active", lastContactedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), createdAt: new Date() },
            { id: "lead-critical", name: "Critical Lead", status: "new", lastContactedAt: null, createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000) },
          ])
        ),
      })),
    })),
  },
}));

describe("EngagementHealthService", () => {
  it("should categorize active leads into health tiers correctly", async () => {
    const health = await EngagementHealthService.getEngagementHealthBreakdown("org-1");

    expect(health.totalActiveLeads).toBe(4);
    expect(health.healthyCount).toBe(1);
    expect(health.needsAttentionCount).toBe(1);
    expect(health.atRiskCount).toBe(1);
    expect(health.criticalCount).toBe(1);

    expect(health.criticalLeads.length).toBe(1);
    expect(health.criticalLeads[0].id).toBe("lead-critical");
    expect(health.healthScorePercentage).toBe(50); // (1 healthy + 1 attention) / 4 = 50%
  });
});
