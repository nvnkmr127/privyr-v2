import { describe, it, expect, vi, beforeEach } from "vitest";
import { RoleService } from "./service";
import { db } from "@/db";

vi.mock("@/db", () => ({ db: { insert: vi.fn() } }));

describe("RoleService permission whitelist", () => {
  beforeEach(() => vi.clearAllMocks());

  it("strips unknown permission keys on create", async () => {
    const values = vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([{ id: "r1" }]) });
    (db.insert as any).mockReturnValue({ values });

    await RoleService.create("org-1", "Sales", ["users.manage", "hackme", "settings.manage"]);

    const arg = values.mock.calls[0][0];
    expect(arg.permissions).toEqual(["users.manage", "settings.manage"]);
    expect(arg.organizationId).toBe("org-1");
  });
});
