"use server";

import { requireAuth, requireOrg } from "@/lib/rbac";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { LeadService } from "@/domains/leads/service";

const createLeadSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  company: z.string().optional().or(z.literal("")),
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

  const lead = await LeadService.createLead(data, userId, organizationId);

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
  const { userId, organizationId } = await requireOrg();

  const deleted = await LeadService.deleteLead(id, userId, organizationId);

  if (deleted) {
    revalidatePath('/leads');
  }
  return deleted;
}

import { ActivityService } from "@/domains/activities/service";

export async function changeLeadStatusAction(id: string, status: string) {
  const { userId, organizationId } = await requireOrg();

  const lead = await LeadService.changeStatus(id, status, userId, organizationId);

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
  const session = await requireAuth();
  
  const parsed = addNoteSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error("Invalid input");
  }

  const activity = await ActivityService.addActivity({
    leadId: parsed.data.leadId,
    userId: session.user.id,
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
