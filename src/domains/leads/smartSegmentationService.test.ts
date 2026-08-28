import { describe, expect, it, vi } from "vitest";
import { SmartSegmentationService } from "./smartSegmentationService";

vi.mock("@/db", () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn().mockImplementation(() =>
          Promise.resolve([
            {
              id: "lead-hot",
              status: "active",
              score: 85,
              priority: "high",
              expectedValue: "15000",
              ownerId: "user-1",
              lastContactedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
              createdAt: new Date(),
            },
            {
              id: "lead-risk",
              status: "active",
              score: 40,
              priority: "medium",
              expectedValue: "20000",
              ownerId: "user-1",
              lastContactedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
              createdAt: new Date(),
            },
            {
              id: "lead-unassigned",
              status: "new",
              score: 20,
              priority: "medium",
              expectedValue: "1000",
              ownerId: null,
              lastContactedAt: null,
              createdAt: new Date(),
            },
          ])
        ),
      })),
    })),
  },
}));

describe("SmartSegmentationService", () => {
  it("should categorize leads into rule-based smart segments", async () => {
    const segments = await SmartSegmentationService.getSmartSegments("org-1");

    expect(segments.length).toBe(4);

    const hotSeg = segments.find((s) => s.key === "hot_leads");
    expect(hotSeg?.count).toBe(1);

    const riskSeg = segments.find((s) => s.key === "high_value_at_risk");
    expect(riskSeg?.count).toBe(1);

    const unassignedSeg = segments.find((s) => s.key === "unassigned_new");
    expect(unassignedSeg?.count).toBe(1);
  });
});
