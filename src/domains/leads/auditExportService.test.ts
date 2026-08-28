import { describe, expect, it, vi } from "vitest";
import { AuditExportService } from "./auditExportService";

vi.mock("@/db", () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn().mockResolvedValue([
            { id: "lead-1", name: "John Doe", createdAt: new Date("2026-08-01"), ownerId: "user-1" },
          ]),
          orderBy: vi.fn().mockResolvedValue([]),
        })),
        leftJoin: vi.fn(() => ({
          where: vi.fn(() => ({
            orderBy: vi.fn().mockResolvedValue([
              { id: "act-1", type: "note", content: "Called lead", createdAt: new Date("2026-08-02"), userFirstName: "Alice", userLastName: "Smith" },
            ]),
          })),
        })),
      })),
    })),
  },
}));

describe("AuditExportService", () => {
  it("should compile chronological lead audit trail", async () => {
    const trail = await AuditExportService.getLeadAuditTrail("lead-1", "org-1");
    expect(trail.length).toBeGreaterThan(0);
    expect(trail.some((e) => e.category === "lead_created")).toBe(true);
    expect(trail.some((e) => e.category === "activity")).toBe(true);
  });
});
