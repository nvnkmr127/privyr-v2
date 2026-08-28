import { describe, it, expect, vi, beforeEach } from "vitest";
import { OrgService } from "./service";
import { db } from "@/db";

vi.mock("@/db", () => ({
  db: {
    select: vi.fn(),
    update: vi.fn(),
  },
}));

describe("OrgService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should retrieve organization details", async () => {
    const mockOrg = { id: "org-1", name: "Acme Corp", slug: "acme-corp", plan: "pro" };
    const mockFrom = vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([mockOrg]),
      }),
    });
    (db.select as any).mockReturnValue({ from: mockFrom });

    const result = await OrgService.getOrganization("org-1");
    expect(result).toEqual(mockOrg);
  });

  it("should update organization name", async () => {
    const mockUpdated = { id: "org-1", name: "Acme Enterprise", slug: "acme-corp", plan: "pro" };
    const mockSet = vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([mockUpdated]),
      }),
    });
    (db.update as any).mockReturnValue({ set: mockSet });

    const result = await OrgService.updateOrganization("org-1", { name: "Acme Enterprise" });
    expect(result.name).toBe("Acme Enterprise");
  });
});
