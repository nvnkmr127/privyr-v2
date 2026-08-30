import { describe, expect, it, vi } from "vitest";
import { WinLossAnalyticsService } from "./winLossAnalyticsService";

vi.mock("@/db", () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn().mockImplementation(() =>
          Promise.resolve([
            { id: "lead-won", status: "won", lostReason: null },
            { id: "lead-lost-1", status: "lost", lostReason: "Price / Budget Constraints" },
            { id: "lead-lost-2", status: "lost", lostReason: "Competitor Selected" },
          ])
        ),
      })),
    })),
  },
}));

describe("WinLossAnalyticsService", () => {
  it("should calculate win/loss ratio and categorize loss reasons", async () => {
    const { db } = await import("@/db");
    // Mock closed leads
    (db.select as any).mockImplementationOnce(() => ({
      from: () => ({
        where: () =>
          Promise.resolve([
            { id: "lead-won", status: "won", lostReason: null },
            { id: "lead-lost-1", status: "lost", lostReason: "Price / Budget Constraints" },
            { id: "lead-lost-2", status: "lost", lostReason: "Competitor Selected" },
          ]),
      }),
    }));

    const metrics = await WinLossAnalyticsService.getWinLossAnalytics("org-1");

    expect(metrics.totalClosedLeads).toBe(3);
    expect(metrics.wonCount).toBe(1);
    expect(metrics.lostCount).toBe(2);
    expect(metrics.winRatePercentage).toBe(33.3);

    expect(metrics.lossReasonBreakdown.length).toBe(2);
    expect(metrics.lossReasonBreakdown[0].reason).toContain("Price");
    expect(metrics.lossReasonBreakdown[1].reason).toContain("Competitor");
  });
});
