import { describe, expect, it, vi } from "vitest";
import { CustomerLtvAnalyticsService } from "./customerLtvAnalyticsService";

vi.mock("@/db", () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn().mockImplementation(() =>
          Promise.resolve([
            { id: "lead-1", name: "Acme Corp", phone: "123456", email: "acme@example.com", expectedValue: "10000" },
            { id: "lead-2", name: "Acme Corp", phone: "123456", email: "acme@example.com", expectedValue: "15000" }, // Repeat customer!
            { id: "lead-3", name: "Beta LLC", phone: "987654", email: "beta@example.com", expectedValue: "5000" },
          ])
        ),
      })),
    })),
  },
}));

describe("CustomerLtvAnalyticsService", () => {
  it("should calculate Customer Lifetime Value (LTV) and repeat customer rate", async () => {
    const ltvData = await CustomerLtvAnalyticsService.getLtvAnalytics("org-1");

    expect(ltvData.totalUniqueCustomers).toBe(2);
    expect(ltvData.repeatCustomerCount).toBe(1);
    expect(ltvData.repeatRatePercentage).toBe(50);
    expect(ltvData.avgCustomerLtv).toBe(15000); // (25000 + 5000) / 2 = 15000

    expect(ltvData.topVipCustomers.length).toBe(2);
    // Acme Corp should be VIP #1 ($25,000 total LTV, 2 deals)
    expect(ltvData.topVipCustomers[0].clientName).toBe("Acme Corp");
    expect(ltvData.topVipCustomers[0].totalLtv).toBe(25000);
    expect(ltvData.topVipCustomers[0].totalWonDeals).toBe(2);
  });
});
