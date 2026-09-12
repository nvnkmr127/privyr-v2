import { describe, it, expect, vi, beforeEach } from "vitest";
import { createLeadAction } from "./leads";
import { LeadService } from "@/domains/leads/service";
import { OrgService } from "@/domains/organizations/service";
import { PlanService } from "@/domains/billing/planService";
import { CustomFieldService } from "@/domains/customFields/service";

vi.mock("@/lib/rbac", () => ({
  requireOrg: vi.fn().mockResolvedValue({ organizationId: "org-1", userId: "user-1" }),
  requirePermission: vi.fn().mockResolvedValue({ organizationId: "org-1", userId: "user-1" }),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/domains/leads/service", () => ({
  LeadService: {
    createLead: vi.fn(),
  },
}));

vi.mock("@/domains/organizations/service", () => ({
  OrgService: {
    getOrganization: vi.fn(),
  },
}));

vi.mock("@/domains/billing/planService", () => ({
  PlanService: {
    assertCanAddLead: vi.fn(),
  },
}));

vi.mock("@/domains/customFields/service", () => ({
  CustomFieldService: {
    validate: vi.fn(),
  },
}));

describe("createLeadAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (OrgService.getOrganization as any).mockResolvedValue({
      id: "org-1",
      requiredLeadFields: ["name"],
    });
    (PlanService.assertCanAddLead as any).mockResolvedValue(undefined);
    (CustomFieldService.validate as any).mockResolvedValue({});
  });

  it("trims fields and creates lead successfully", async () => {
    (LeadService.createLead as any).mockResolvedValue({
      id: "lead-1",
      name: "John Doe",
      email: "john@example.com",
    });

    const res = await createLeadAction({
      name: "  John Doe  ",
      email: "  john@example.com  ",
      phone: "  +123456789  ",
      company: "  Acme Corp  ",
    });

    expect(res.ok).toBe(true);
    expect(LeadService.createLead).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "John Doe",
        email: "john@example.com",
        phone: "+123456789",
        company: "Acme Corp",
      }),
      "user-1",
      "org-1",
    );
  });

  it("passes ownerId to LeadService.createLead when specified", async () => {
    (LeadService.createLead as any).mockResolvedValue({
      id: "lead-2",
      name: "Assigned Lead",
      ownerId: "11111111-1111-4111-8111-111111111111",
    });

    const res = await createLeadAction({
      name: "Assigned Lead",
      ownerId: "11111111-1111-4111-8111-111111111111",
    });

    expect(res.ok).toBe(true);
    expect(LeadService.createLead).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Assigned Lead",
        ownerId: "11111111-1111-4111-8111-111111111111",
      }),
      "user-1",
      "org-1",
    );
  });

  it("fails when name is missing or only whitespace", async () => {
    const res = await createLeadAction({
      name: "   ",
      email: "john@example.com",
    });

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.code).toBe("VALIDATION");
      expect(res.fieldErrors?.name).toBeDefined();
    }
  });

  it("returns validation error when org required field is missing", async () => {
    (OrgService.getOrganization as any).mockResolvedValue({
      id: "org-1",
      requiredLeadFields: ["name", "company"],
    });

    const res = await createLeadAction({
      name: "Jane Doe",
      email: "jane@example.com",
    });

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.code).toBe("VALIDATION");
      expect(res.message).toContain("company");
    }
  });
});
