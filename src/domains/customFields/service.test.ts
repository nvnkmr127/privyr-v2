import { describe, it, expect, vi, beforeEach } from "vitest";
import { CustomFieldService } from "./service";
import { db } from "@/db";

vi.mock("@/db", () => ({ db: { select: vi.fn() } }));

function mockDefs(defs: any[]) {
  (db.select as any).mockReturnValue({
    from: () => ({ where: () => ({ orderBy: () => Promise.resolve(defs) }) }),
  });
}

describe("CustomFieldService.validate", () => {
  beforeEach(() => vi.clearAllMocks());

  it("throws when a required field is missing", async () => {
    mockDefs([{ key: "budget", label: "Budget", type: "number", required: true, options: [] }]);
    await expect(CustomFieldService.validate("org", {})).rejects.toThrow(/Budget/);
  });

  it("coerces numbers and rejects non-numeric", async () => {
    mockDefs([{ key: "budget", label: "Budget", type: "number", required: false, options: [] }]);
    expect(await CustomFieldService.validate("org", { budget: "42" })).toEqual({ budget: 42 });
    await expect(CustomFieldService.validate("org", { budget: "abc" })).rejects.toThrow(/number/);
  });

  it("enforces select options", async () => {
    mockDefs([{ key: "tier", label: "Tier", type: "select", required: false, options: ["A", "B"] }]);
    expect(await CustomFieldService.validate("org", { tier: "A" })).toEqual({ tier: "A" });
    await expect(CustomFieldService.validate("org", { tier: "Z" })).rejects.toThrow(/one of/);
  });

  it("drops unknown keys not defined for the org", async () => {
    mockDefs([{ key: "budget", label: "Budget", type: "text", required: false, options: [] }]);
    expect(await CustomFieldService.validate("org", { budget: "x", evil: "y" })).toEqual({ budget: "x" });
  });
});
