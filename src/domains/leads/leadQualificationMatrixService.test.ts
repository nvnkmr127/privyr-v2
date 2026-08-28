import { describe, it, expect, vi, beforeEach } from "vitest";
import { LeadQualificationMatrixService } from "./leadQualificationMatrixService";
import { db } from "@/db";

vi.mock("@/db", () => ({
  db: {
    select: vi.fn(),
  },
}));

describe("LeadQualificationMatrixService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return empty report when organization has no active leads", async () => {
    const mockFrom = vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue([]),
    });
    (db.select as any).mockReturnValue({ from: mockFrom });

    const result = await LeadQualificationMatrixService.getQualificationReport("org-empty");

    expect(result).toEqual({
      totalActiveLeads: 0,
      sqlCount: 0,
      mqlCount: 0,
      unqualifiedCount: 0,
      averageQualificationScore: 0,
      leads: [],
    });
  });

  it("should evaluate BANT qualification criteria and categorize into SQL, MQL, and Unqualified", async () => {
    const mockLeads = [
      {
        id: "lead-sql",
        name: "Enterprise Buyer",
        phone: "+1999888777",
        email: "buyer@enterprise.com",
        company: "Tech Corp",
        status: "active",
        expectedValue: "25000.00",
        customData: {
          need: "CRM Migration",
          timeline: "Q3 2026",
        },
        nextFollowUpAt: new Date(),
        ownerId: "owner-1",
      },
      {
        id: "lead-unqualified",
        name: "Incomplete Lead",
        phone: null,
        email: null,
        company: null,
        status: "new",
        expectedValue: null,
        customData: {},
        nextFollowUpAt: null,
        ownerId: null,
      },
    ];

    const mockFrom = vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(mockLeads),
    });
    (db.select as any).mockReturnValue({ from: mockFrom });

    const result = await LeadQualificationMatrixService.getQualificationReport("org-456");

    expect(result.totalActiveLeads).toBe(2);
    expect(result.sqlCount).toBe(1);
    expect(result.unqualifiedCount).toBe(1);
    expect(result.leads[0].qualificationStatus).toBe("SQL");
    expect(result.leads[0].qualificationScore).toBe(100);
    expect(result.leads[0].missingCriteria.length).toBe(0);

    expect(result.leads[1].qualificationStatus).toBe("Unqualified");
    expect(result.leads[1].missingCriteria).toEqual(["Budget", "Authority", "Need", "Timeline"]);
  });
});
