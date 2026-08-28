import { describe, it, expect, vi, beforeEach } from "vitest";
import { CustomStatusSchemaService, DEFAULT_SYSTEM_STATUSES } from "./customStatusSchemaService";
import { db } from "@/db";

vi.mock("@/db", () => ({
  db: {
    select: vi.fn(),
    update: vi.fn(),
    insert: vi.fn(),
    delete: vi.fn(),
  },
}));

describe("CustomStatusSchemaService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return default system statuses and seed when none exist", async () => {
    const mockFromSelect = vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        orderBy: vi.fn().mockResolvedValue([]),
      }),
    });
    (db.select as any).mockReturnValue({ from: mockFromSelect });

    const mockValuesInsert = vi.fn().mockResolvedValue(undefined);
    (db.insert as any).mockReturnValue({ values: mockValuesInsert });

    const result = await CustomStatusSchemaService.getTenantStatusSchema("org-seed");

    expect(result).toEqual(DEFAULT_SYSTEM_STATUSES);
    expect(db.insert).toHaveBeenCalled();
  });

  it("should add a new custom status for a tenant", async () => {
    const mockFromSelect = vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([]),
      }),
    });
    (db.select as any).mockReturnValue({ from: mockFromSelect });

    const mockCreated = {
      id: "status-1",
      key: "contacted",
      label: "Contacted",
      color: "#8B5CF6",
      category: "in_progress",
      orderIndex: 3,
      isSystemDefault: 0,
    };

    const mockReturningInsert = vi.fn().mockResolvedValue([mockCreated]);
    const mockValuesInsert = vi.fn().mockReturnValue({ returning: mockReturningInsert });
    (db.insert as any).mockReturnValue({ values: mockValuesInsert });

    const result = await CustomStatusSchemaService.addOrUpdateStatus("org-1", {
      key: "contacted",
      label: "Contacted",
      color: "#8B5CF6",
      category: "in_progress",
      orderIndex: 3,
    });

    expect(result.key).toBe("contacted");
    expect(result.label).toBe("Contacted");
    expect(result.isSystemDefault).toBe(false);
  });

  it("should throw error when deleting a system default status", async () => {
    const mockExisting = { id: "sys-1", key: "new", isSystemDefault: 1 };

    const mockFromSelect = vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([mockExisting]),
      }),
    });
    (db.select as any).mockReturnValue({ from: mockFromSelect });

    await expect(
      CustomStatusSchemaService.deleteCustomStatus("org-1", "new")
    ).rejects.toThrow("System default statuses cannot be deleted.");
  });
});
