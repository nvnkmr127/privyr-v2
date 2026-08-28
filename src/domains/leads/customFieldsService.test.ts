import { describe, expect, it, vi } from "vitest";
import { CustomFieldsService } from "./customFieldsService";

vi.mock("@/db", () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn().mockResolvedValue([
            { id: "lead-1", customData: { budget: 5000, industry: "Tech" } },
          ]),
        })),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn().mockResolvedValue([]),
      })),
    })),
  },
}));

vi.mock("@/domains/activities/service", () => ({
  ActivityService: {
    addActivity: vi.fn().mockResolvedValue({ id: "act-cf" }),
  },
}));

describe("CustomFieldsService", () => {
  it("should sanitize keys and values into valid customData map", () => {
    const sanitized = CustomFieldsService.sanitizeCustomData({
      "  Budget (USD) ": 10000,
      "Is Enterprise?": true,
      tags_list: ["VIP", "High-Priority"],
    });

    expect(sanitized).toEqual({
      Budget__USD_: 10000,
      Is_Enterprise_: true,
      tags_list: ["VIP", "High-Priority"],
    });
  });

  it("should merge new custom data with existing attributes cleanly", async () => {
    const merged = await CustomFieldsService.updateLeadCustomFields(
      "lead-1",
      "org-1",
      { project_timeline: "Q3 2026" },
      "user-1"
    );

    expect(merged).toEqual({
      budget: 5000,
      industry: "Tech",
      project_timeline: "Q3 2026",
    });
  });
});
