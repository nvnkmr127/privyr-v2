import { describe, expect, it, vi } from "vitest";
import { DuplicateResolutionService } from "./duplicateResolutionService";

vi.mock("@/db", () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => Object.assign(
          Promise.resolve([{ id: "lead-1", name: "John Main", organizationId: "org-1" }]),
          { limit: () => Promise.resolve([{ id: "lead-1", name: "John Main", organizationId: "org-1" }]) }
        )),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn().mockResolvedValue([]),
      })),
    })),
    delete: vi.fn(() => ({
      where: vi.fn().mockResolvedValue([]),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        onConflictDoNothing: vi.fn().mockResolvedValue([]),
      })),
    })),
  },
}));

vi.mock("@/domains/activities/service", () => ({
  ActivityService: {
    addActivity: vi.fn().mockResolvedValue({ id: "act-merge" }),
  },
}));

describe("DuplicateResolutionService", () => {
  it("should detect duplicate groups by normalized phone and email", async () => {
    const { db } = await import("@/db");
    (db.select as any).mockImplementationOnce(() => ({
      from: () => ({
        where: () =>
          Promise.resolve([
            { id: "lead-1", phone: "987-654-3210", email: "john@example.com" },
            { id: "lead-2", phone: "(987) 654-3210", email: "other@example.com" },
            { id: "lead-3", phone: "555-123-4567", email: "john@example.com" },
          ]),
      }),
    }));

    const duplicates = await DuplicateResolutionService.detectDuplicates("org-1");

    expect(duplicates.length).toBe(2);
    const phoneMatch = duplicates.find((d) => d.type === "phone");
    const emailMatch = duplicates.find((d) => d.type === "email");

    expect(phoneMatch?.leadIds).toEqual(["lead-1", "lead-2"]);
    expect(emailMatch?.leadIds).toEqual(["lead-1", "lead-3"]);
  });

  it("should merge secondary lead into primary lead safely", async () => {
    const result = await DuplicateResolutionService.mergeLeads("lead-1", "lead-2", "org-1", "user-1");

    expect(result.success).toBe(true);
    expect(result.primaryLeadId).toBe("lead-1");
  });
});
