import { describe, expect, it, vi } from "vitest";
import { PipelineAgingService } from "./pipelineAgingService";

vi.mock("@/db", () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn().mockImplementation(() =>
          Promise.resolve([
            { id: "lead-fresh", status: "active", expectedValue: "5000", createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) }, // 3d ago => fresh
            { id: "lead-moderate", status: "active", expectedValue: "10000", createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) }, // 10d ago => moderate
            { id: "lead-stale", status: "new", expectedValue: "25000", createdAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000) }, // 40d ago => stale
          ])
        ),
      })),
    })),
  },
}));

describe("PipelineAgingService", () => {
  it("should evaluate deal age distribution across fresh, moderate, aging, and stale buckets", async () => {
    const aging = await PipelineAgingService.getPipelineAgingMatrix("org-1");

    expect(aging.totalActiveLeads).toBe(3);
    expect(aging.staleValueAtRisk).toBe(25000);
    expect(aging.avgLeadAgeDays).toBeGreaterThanOrEqual(17);

    expect(aging.buckets.length).toBe(4);
    const freshBucket = aging.buckets.find((b) => b.bucketKey === "fresh");
    expect(freshBucket?.count).toBe(1);
    expect(freshBucket?.totalValue).toBe(5000);

    const staleBucket = aging.buckets.find((b) => b.bucketKey === "stale");
    expect(staleBucket?.count).toBe(1);
    expect(staleBucket?.totalValue).toBe(25000);
  });
});
