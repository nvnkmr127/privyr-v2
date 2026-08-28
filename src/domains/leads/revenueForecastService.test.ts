import { describe, expect, it, vi } from "vitest";
import { RevenueForecastService } from "./revenueForecastService";

vi.mock("@/db", () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn().mockImplementation(() =>
          Promise.resolve([
            { id: "lead-1", status: "won", expectedValue: "10000" },
            { id: "lead-2", status: "active", expectedValue: "20000" }, // 50% = 10000
            { id: "lead-3", status: "new", expectedValue: "5000" },   // 10% = 500
          ])
        ),
      })),
    })),
  },
}));

describe("RevenueForecastService", () => {
  it("should calculate weighted revenue forecast and unweighted total value", async () => {
    const forecast = await RevenueForecastService.getRevenueForecast("org-1");

    expect(forecast.unweightedTotalValue).toBe(35000);
    expect(forecast.wonRevenue).toBe(10000);
    expect(forecast.weightedProjectedRevenue).toBe(20500); // 10000 + 10000 + 500
  });
});
