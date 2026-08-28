"use server";

import { requireOrg, requirePermission } from "@/lib/rbac";
import { revalidatePath } from "next/cache";
import { OrgService } from "@/domains/organizations/service";
import { AuditService } from "@/domains/audit/service";
import { z } from "zod";

const LEAD_FIELDS = ["name", "email", "phone", "company"] as const;

const opt = (max: number) => z.string().trim().max(max).nullish().transform((v) => v || null);

const updateOrgSchema = z.object({
  name: z.string().trim().min(1, "Organization name is required").max(255),
  // Localisation
  timezone: z.string().trim().min(1).max(64),
  locale: z.string().trim().min(1).max(10),
  currency: z.string().trim().length(3),
  dateFormat: z.string().trim().min(1).max(20),
  // Company information
  industry: opt(120),
  phone: opt(30),
  website: opt(255),
  addressLine1: opt(255),
  city: opt(120),
  state: opt(120),
  postalCode: opt(20),
  country: z.string().trim().length(2).nullish().transform((v) => v || null),
  // SLA escalation window in hours; 0/empty turns it off (stored as null).
  slaHours: z.coerce.number().int().min(0).max(720).nullish().transform((v) => (v ? v : null)),
  // "name" is always required; keep only known fields and force-include name.
  requiredLeadFields: z
    .array(z.enum(LEAD_FIELDS))
    .default(["name"])
    .transform((arr) => Array.from(new Set(["name", ...arr]))),
});

export async function getOrganizationAction() {
  const { organizationId } = await requireOrg();
  return OrgService.getOrganization(organizationId);
}

export async function updateOrganizationAction(input: z.input<typeof updateOrgSchema>) {
  const { organizationId, userId } = await requirePermission("settings.manage");
  const parsed = updateOrgSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid settings");
  }

  const updated = await OrgService.updateOrganization(organizationId, parsed.data);
  await AuditService.log({ organizationId, userId, action: "org.settings_update", entityType: "organization", entityId: organizationId });
  revalidatePath("/settings");
  return updated;
}
