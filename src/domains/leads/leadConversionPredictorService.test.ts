import { describe, it, expect, vi, beforeEach } from "vitest";
import { LeadConversionPredictorService } from "./leadConversionPredictorService";
import { db } from "@/db";

vi.mock("@/db", () => ({
  db: {
    select: vi.fn(),
  },
}));

describe("LeadConversionPredictorService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return zero metrics when organization has no active leads", async () => {
    const mockFrom = vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue([]),
    });
    (db.select as any).mockReturnValue({ from: mockFrom });

    const result = await LeadConversionPredictorService.getConversionPredictions("org-empty");

    expect(result).toEqual({
      totalActiveLeads: 0,
      averageConversionProbability: 0,
      totalHighProbabilityValue: 0,
      highProbabilityLeadsCount: 0,
      leads: [],
    });
  });

  it("should calculate conversion predictions and rank leads by probability", async () => {
    const mockLeads = [
      {
        id: "lead-1",
        name: "Acme High Priority",
        phone: "+1234567890",
        email: "contact@acme.com",
        company: "Acme Inc",
        status: "active",
        priority: "high",
        score: 90,
        expectedValue: "50000.00",
        nextFollowUpAt: new Date(Date.now() + 86400000),
        lastContactedAt: new Date(),
        createdAt: new Date(),
        ownerId: "user-1",
      },
      {
        id: "lead-2",
        name: "Cold Lead",
        phone: null,
        email: null,
        company: null,
        status: "new",
        priority: "low",
        score: 10,
        expectedValue: "1000.00",
        nextFollowUpAt: null,
        lastContactedAt: null,
        createdAt: new Date(Date.now() - 30 * 86400000),
        ownerId: null,
      },
    ];

    const mockFrom = vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(mockLeads),
    });
    (db.select as any).mockReturnValue({ from: mockFrom });

    const result = await LeadConversionPredictorService.getConversionPredictions("org-123");

    expect(result.totalActiveLeads).toBe(2);
    expect(result.leads.length).toBe(2);
    expect(result.leads[0].id).toBe("lead-1");
    expect(result.leads[0].likelihoodTier).toBe("very_high");
    expect(result.highProbabilityLeadsCount).toBe(1);
    expect(result.totalHighProbabilityValue).toBe(50000);
  });
});
