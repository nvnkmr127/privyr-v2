"use server";

import { requireOrg, requirePermission } from "@/lib/rbac";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { LeadService } from "@/domains/leads/service";
import { OrgService } from "@/domains/organizations/service";
import { assertLeadInOrg } from "@/domains/leads/ownership";
import { CustomFieldService } from "@/domains/customFields/service";
import { AuditService } from "@/domains/audit/service";
import { PlanService } from "@/domains/billing/planService";
import { ActivityService } from "@/domains/activities/service";

const createLeadSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  company: z.string().optional().or(z.literal("")),
  customData: z.record(z.string(), z.unknown()).optional(),
});

export async function createLeadAction(input: z.infer<typeof createLeadSchema>) {
  const { userId, organizationId } = await requireOrg();

  const parsed = createLeadSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error("Invalid input");
  }

  // Pass empty strings as undefined
  const data = {
    name: parsed.data.name,
    email: parsed.data.email || undefined,
    phone: parsed.data.phone || undefined,
    company: parsed.data.company || undefined,
  };

  // Enforce this org's required-field configuration (name is always required by schema).
  const org = await OrgService.getOrganization(organizationId);
  const required = (org?.requiredLeadFields ?? ["name"]) as Array<keyof typeof data>;
  const missing = required.filter((f) => !data[f]);
  if (missing.length) {
    throw new Error(`Missing required field(s): ${missing.join(", ")}`);
  }

  await PlanService.assertCanAddLead(organizationId);

  // Validate + clean org-defined custom fields.
  const customData = await CustomFieldService.validate(organizationId, parsed.data.customData ?? {});

  const lead = await LeadService.createLead({ ...data, customData }, userId, organizationId);

  revalidatePath('/leads');
  return lead;
}

const updateLeadSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, "Name is required").max(255).optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  company: z.string().optional().or(z.literal("")),
});

export async function updateLeadAction(input: z.infer<typeof updateLeadSchema>) {
  const { userId, organizationId } = await requireOrg();

  const parsed = updateLeadSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error("Invalid input");
  }

  const { id, ...data } = parsed.data;

  // Cleanup empty strings to undefined
  const cleanData = {
    name: data.name,
    email: data.email || undefined,
    phone: data.phone || undefined,
    company: data.company || undefined,
  };

  const lead = await LeadService.updateLead(id, cleanData, userId, organizationId);

  revalidatePath('/leads');
  revalidatePath(`/leads/${id}`);
  return lead;
}

export async function updateCustomDataAction(leadId: string, data: Record<string, string>) {
  const { organizationId } = await requireOrg();
  const updated = await LeadService.updateCustomData(leadId, data, organizationId);
  revalidatePath(`/leads/${leadId}`);
  return updated;
}

export async function deleteLeadAction(id: string) {
  const { userId, organizationId } = await requirePermission("leads.delete");

  const deleted = await LeadService.deleteLead(id, userId, organizationId);

  if (deleted) {
    await AuditService.log({ organizationId, userId, action: "lead.delete", entityType: "lead", entityId: id });
    revalidatePath('/leads');
    revalidatePath('/leads/recycle-bin');
  }
  return deleted;
}

// Recycle bin: list, restore, and (super-admin only) permanent removal.
export async function listDeletedLeadsAction() {
  const { organizationId } = await requireOrg();
  return LeadService.listDeletedLeads(organizationId);
}

export async function restoreLeadAction(id: string) {
  const { userId, organizationId } = await requirePermission("leads.delete");
  const restored = await LeadService.restoreLead(id, organizationId);
  if (restored) {
    await AuditService.log({ organizationId, userId, action: "lead.restore", entityType: "lead", entityId: id });
    revalidatePath('/leads');
    revalidatePath('/leads/recycle-bin');
  }
  return restored;
}

export async function purgeLeadAction(id: string) {
  // leads.purge is admin-only by default — the "super" gate on permanent deletion.
  const { userId, organizationId } = await requirePermission("leads.purge");
  const purged = await LeadService.purgeLead(id, organizationId);
  if (purged) {
    await AuditService.log({ organizationId, userId, action: "lead.purge", entityType: "lead", entityId: id });
    revalidatePath('/leads/recycle-bin');
  }
  return purged;
}

export async function emptyRecycleBinAction() {
  const { userId, organizationId } = await requirePermission("leads.purge");
  const res = await LeadService.emptyRecycleBin(organizationId);
  await AuditService.log({ organizationId, userId, action: "lead.recycle_bin.empty", entityType: "organization", entityId: organizationId });
  revalidatePath('/leads/recycle-bin');
  return res;
}

export async function changeLeadStatusAction(id: string, status: string, reason?: string) {
  const { userId, organizationId } = await requireOrg();

  const lead = await LeadService.changeStatus(id, status, userId, organizationId, reason);

  revalidatePath('/leads');
  revalidatePath(`/leads/${id}`);
  return lead;
}

const bulkChangeStatusSchema = z.object({
  leadIds: z.array(z.string().uuid()).min(1),
  status: z.string(),
});

export async function bulkChangeLeadStatusAction(input: z.infer<typeof bulkChangeStatusSchema>) {
  const { userId, organizationId } = await requireOrg();

  const parsed = bulkChangeStatusSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error("Invalid input");
  }

  // Basic sequential bulk operation. A real system might optimize this to a single query if event logs aren't strictly required.
  const results = [];
  for (const id of parsed.data.leadIds) {
    const lead = await LeadService.changeStatus(id, parsed.data.status, userId, organizationId);
    results.push(lead);
  }

  revalidatePath('/leads');
  return results;
}

const addNoteSchema = z.object({
  leadId: z.string().uuid(),
  content: z.string().min(1, "Note content cannot be empty"),
});

export async function addNoteAction(input: z.infer<typeof addNoteSchema>) {
  const { userId, organizationId } = await requireOrg();

  const parsed = addNoteSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error("Invalid input");
  }

  // The note attaches to a lead — make sure it's one this org owns.
  await assertLeadInOrg(parsed.data.leadId, organizationId);

  const activity = await ActivityService.addActivity({
    leadId: parsed.data.leadId,
    userId,
    type: 'note',
    content: parsed.data.content,
  });

  revalidatePath(`/leads/${parsed.data.leadId}`);
  return activity;
}

export const assignLeadAction = async (input: { leadId: string, ownerId: string | null, teamId: string | null }) => {
  const { userId, organizationId } = await requireOrg();

  if (!input.leadId) throw new Error("Lead ID is required");
  if (!input.ownerId && !input.teamId) throw new Error("Must provide ownerId or teamId");

  const { AssignmentService } = await import("@/domains/leads/assignmentService");

  const updatedLead = await AssignmentService.assignLead({
    leadId: input.leadId,
    ownerId: input.ownerId,
    teamId: input.teamId,
    assignedById: userId,
    organizationId,
  });

  revalidatePath(`/leads/${input.leadId}`);
  revalidatePath("/leads");

  return { success: true, lead: updatedLead };
};

export const bulkAssignLeadAction = async (input: { leadIds: string[], ownerId: string | null, teamId: string | null }) => {
  const { userId, organizationId } = await requireOrg();

  if (!input.leadIds || input.leadIds.length === 0) throw new Error("Lead IDs are required");
  if (!input.ownerId && !input.teamId) throw new Error("Must provide ownerId or teamId");

  const { AssignmentService } = await import("@/domains/leads/assignmentService");

  const updatedLeads = await AssignmentService.bulkAssignLeads({
    leadIds: input.leadIds,
    ownerId: input.ownerId,
    teamId: input.teamId,
    assignedById: userId,
    organizationId,
  });

  revalidatePath("/leads");

  return { success: true, count: updatedLeads.length };
};

export async function listStageLeadsAction(status: string, page: number = 1, limit: number = 20) {
  const { organizationId } = await requireOrg();
  return LeadService.listLeads({
    organizationId,
    status,
    page,
    limit,
  });
}

export async function checkLeadDuplicatesAction(leadId: string) {
  try {
    const { organizationId } = await requireOrg();
    const lead = await LeadService.getLead(leadId, organizationId);
    if (!lead) return { count: 0 };

    const email = lead.email?.trim();
    const phone = lead.phone?.trim();

    if (!email && !phone) return { count: 0 };

    const { db } = await import("@/db");
    const { leads } = await import("@/db/schema");
    const { eq, and, or, ne } = await import("drizzle-orm");

    const conds = [];
    if (email) conds.push(eq(leads.email, email));
    if (phone) conds.push(eq(leads.phone, phone));

    if (conds.length === 0) return { count: 0 };

    const dupes = await db.select({ id: leads.id }).from(leads).where(
      and(
        eq(leads.organizationId, organizationId),
        ne(leads.id, leadId),
        or(...conds)
      )
    );

    return { count: dupes.length };
  } catch {
    return { count: 0 };
  }
}

export async function updateLeadFollowUpAction(leadId: string, nextFollowUpAt: string | null) {
  const { organizationId } = await requireOrg();
  const { db } = await import("@/db");
  const { leads } = await import("@/db/schema");
  const { eq, and } = await import("drizzle-orm");

  const [updated] = await db.update(leads)
    .set({ nextFollowUpAt: nextFollowUpAt ? new Date(nextFollowUpAt) : null, updatedAt: new Date() })
    .where(and(eq(leads.id, leadId), eq(leads.organizationId, organizationId)))
    .returning();

  revalidatePath(`/leads/${leadId}`);
  revalidatePath('/leads');
  return updated;
}

export async function updateLeadStageAndValueAction(leadId: string, input: { stageId?: string | null; expectedValue?: string | null }) {
  const { organizationId } = await requireOrg();
  const { db } = await import("@/db");
  const { leads } = await import("@/db/schema");
  const { eq, and } = await import("drizzle-orm");

  const [updated] = await db.update(leads)
    .set({
      ...(input.stageId !== undefined ? { stageId: input.stageId || null } : {}),
      ...(input.expectedValue !== undefined ? { expectedValue: input.expectedValue || null } : {}),
      updatedAt: new Date(),
    })
    .where(and(eq(leads.id, leadId), eq(leads.organizationId, organizationId)))
    .returning();

  revalidatePath(`/leads/${leadId}`);
  revalidatePath('/leads');
  return updated;
}
