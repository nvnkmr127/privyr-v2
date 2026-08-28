import { describe, it, expect, vi, beforeEach } from "vitest";
import { DedupService } from "./dedupService";
import { db } from "@/db";

vi.mock("@/db", () => ({ db: { select: vi.fn() } }));

function mockLeads(rows: any[]) {
  (db.select as any).mockReturnValue({ from: () => ({ where: () => Promise.resolve(rows) }) });
}

describe("DedupService.findDuplicateGroups", () => {
  beforeEach(() => vi.clearAllMocks());

  it("groups by normalized email and phone, ignoring uniques", async () => {
    mockLeads([
      { id: "1", name: "A", email: "x@y.com", phone: null, createdAt: new Date() },
      { id: "2", name: "B", email: "X@Y.com", phone: null, createdAt: new Date() },     // same email, diff case
      { id: "3", name: "C", email: null, phone: "(555) 111-2222", createdAt: new Date() },
      { id: "4", name: "D", email: null, phone: "5551112222", createdAt: new Date() },  // same phone, punctuation differs
      { id: "5", name: "E", email: "solo@z.com", phone: "999", createdAt: new Date() }, // unique
    ]);

    const groups = await DedupService.findDuplicateGroups("org");
    const ids = groups.map((g) => g.leads.map((l) => l.id).sort().join(","));
    expect(ids).toContain("1,2"); // email match, case-insensitive
    expect(ids).toContain("3,4"); // phone match, punctuation-insensitive
    expect(groups.every((g) => !g.leads.some((l) => l.id === "5"))).toBe(true);
  });

  it("returns nothing when all leads are distinct", async () => {
    mockLeads([
      { id: "1", name: "A", email: "a@a.com", phone: "1", createdAt: new Date() },
      { id: "2", name: "B", email: "b@b.com", phone: "2", createdAt: new Date() },
    ]);
    expect(await DedupService.findDuplicateGroups("org")).toEqual([]);
  });
});
