import { describe, expect, it, vi } from "vitest";
import { TagService } from "./service";
import { db } from "@/db";

vi.mock("@/db", () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn().mockResolvedValue([{ id: "tag-1", name: "VIP" }]),
        })),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        onConflictDoNothing: vi.fn().mockResolvedValue([]),
      })),
    })),
    delete: vi.fn(() => ({
      where: vi.fn().mockResolvedValue([]),
    })),
  },
}));

describe("TagService Bulk Operations", () => {
  it("should bulk add a tag to multiple leads cleanly", async () => {
    const result = await TagService.bulkAddToLeads(["lead-1", "lead-2"], "VIP");
    expect(result).toEqual({ id: "tag-1", name: "VIP" });
    expect(db.insert).toHaveBeenCalled();
  });

  it("should handle empty lead arrays gracefully", async () => {
    const result = await TagService.bulkAddToLeads([], "VIP");
    expect(result).toEqual([]);
  });

  it("should bulk remove tag from multiple leads cleanly", async () => {
    await TagService.bulkRemoveFromLeads(["lead-1", "lead-2"], "tag-1");
    expect(db.delete).toHaveBeenCalled();
  });
});
