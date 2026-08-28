import { describe, expect, it, vi } from "vitest";
import { LeadGeoAnalyticsService } from "./leadGeoAnalyticsService";

vi.mock("@/db", () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn().mockImplementation(() =>
          Promise.resolve([
            { id: "lead-1", status: "won", expectedValue: "15000", customData: { city: "New York" } },
            { id: "lead-2", status: "active", expectedValue: "5000", customData: { city: "New York" } },
            { id: "lead-3", status: "won", expectedValue: "25000", customData: { city: "San Francisco" } },
          ])
        ),
      })),
    })),
  },
}));

describe("LeadGeoAnalyticsService", () => {
  it("should aggregate lead volume, win rates, and revenue performance by territory", async () => {
    const locations = await LeadGeoAnalyticsService.getGeoAnalytics("org-1");

    expect(locations.length).toBe(2);

    // San Francisco should be Rank 1 by revenue ($25,000)
    expect(locations[0].locationName).toBe("San Francisco");
    expect(locations[0].totalRevenue).toBe(25000);
    expect(locations[0].winRatePercentage).toBe(100);

    // New York should be Rank 2 ($15,000 revenue)
    expect(locations[1].locationName).toBe("New York");
    expect(locations[1].totalLeads).toBe(2);
    expect(locations[1].winRatePercentage).toBe(50);
  });
});
