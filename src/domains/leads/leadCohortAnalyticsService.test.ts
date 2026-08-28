import { describe, expect, it, vi } from "vitest";
import { LeadCohortAnalyticsService } from "./leadCohortAnalyticsService";

vi.mock("@/db", () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn().mockImplementation(() =>
          Promise.resolve([
            { id: "lead-1", status: "won", createdAt: new Date("2026-08-01") },
            { id: "lead-2", status: "lost", createdAt: new Date("2026-08-10") },
            { id: "lead-3", status: "active", createdAt: new Date("2026-08-15") },
            { id: "lead-4", status: "won", createdAt: new Date("2026-07-05") },
          ])
        ),
      })),
    })),
  },
}));

describe("LeadCohortAnalyticsService", () => {
  it("should group leads by monthly cohort and calculate retention and churn rates", async () => {
    const cohorts = await LeadCohortAnalyticsService.getCohortAnalytics("org-1");

    expect(cohorts.length).toBe(2);

    const augCohort = cohorts.find((c) => c.cohortMonth === "2026-08");
    expect(augCohort?.totalLeads).toBe(3);
    expect(augCohort?.wonCount).toBe(1);
    expect(augCohort?.lostCount).toBe(1);
    expect(augCohort?.activeCount).toBe(1);
    expect(augCohort?.conversionRate).toBe(33.3);
    expect(augCohort?.churnRate).toBe(33.3);

    const julCohort = cohorts.find((c) => c.cohortMonth === "2026-07");
    expect(julCohort?.totalLeads).toBe(1);
    expect(julCohort?.conversionRate).toBe(100);
  });
});
