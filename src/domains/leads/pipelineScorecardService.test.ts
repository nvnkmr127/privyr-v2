import { describe, expect, it, vi } from "vitest";
import { PipelineScorecardService } from "./pipelineScorecardService";


vi.mock("@/domains/leads/engagementHealthService", () => ({
  EngagementHealthService: {
    getEngagementHealthBreakdown: vi.fn().mockResolvedValue({
      totalActiveLeads: 10,
      healthScorePercentage: 90,
    }),
  },
}));

vi.mock("@/domains/leads/slaAnalyticsService", () => ({
  SlaAnalyticsService: {
    getSlaMetrics: vi.fn().mockResolvedValue({
      complianceRatePercentage: 85,
    }),
  },
}));

vi.mock("@/domains/leads/stageStagnationService", () => ({
  StageStagnationService: {
    getStagnantLeads: vi.fn().mockResolvedValue([
      { id: "lead-stagnant-1" },
    ]),
  },
}));

vi.mock("@/domains/leads/engagementVelocityService", () => ({
  EngagementVelocityService: {
    getEngagementVelocity: vi.fn().mockResolvedValue({
      avgWeeklyTouchpoints: 3,
    }),
  },
}));

describe("PipelineScorecardService", () => {
  it("should calculate composite pipeline health scorecard and assign letter grade", async () => {
    const scorecard = await PipelineScorecardService.getPipelineScorecard("org-1");

    expect(scorecard.slaScore).toBe(85);
    expect(scorecard.healthScore).toBe(90);
    expect(scorecard.stagnationScore).toBe(90); // 1 - 1/10 = 90%
    expect(scorecard.velocityScore).toBe(75); // 3 * 25 = 75

    // Weighted Score: 85*0.3 + 90*0.3 + 90*0.2 + 75*0.2 = 25.5 + 27 + 18 + 15 = 85.5
    expect(scorecard.overallScore).toBe(85.5);
    expect(scorecard.grade).toBe("A");
    expect(scorecard.recommendations.length).toBeGreaterThan(0);
  });
});
