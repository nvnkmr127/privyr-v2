"use server";

import { requireOrg } from "@/lib/rbac";
import { revalidatePath } from "next/cache";
import { CustomStatusSchemaService, StatusCategory } from "@/domains/leads/customStatusSchemaService";
import { LeadStatusService, LeadStatus } from "@/domains/leads/leadStatusService";
import { z } from "zod";
import { ok, fail, actionFail, zodFieldErrors } from "@/lib/actions/result";

const addStatusSchema = z.object({
  key: z.string().min(1).max(50),
  label: z.string().min(1).max(100),
  color: z.string().min(1).max(50),
  category: z.enum(["open", "in_progress", "won", "lost", "unqualified"]),
  orderIndex: z.number().optional(),
});

export async function getTenantStatusSchemaAction() {
  const { organizationId } = await requireOrg();
  return CustomStatusSchemaService.getTenantStatusSchema(organizationId);
}

export async function addOrUpdateStatusAction(input: {
  key: string;
  label: string;
  color: string;
  category: StatusCategory;
  orderIndex?: number;
}) {
  const { organizationId } = await requireOrg();
  const parsed = addStatusSchema.safeParse(input);
  if (!parsed.success) {
    return fail("VALIDATION", "Please provide a key, label, color, and category for the status.", zodFieldErrors(parsed.error));
  }

  try {
    const result = await CustomStatusSchemaService.addOrUpdateStatus(organizationId, parsed.data);
    revalidatePath("/leads");
    return ok(result);
  } catch (e) {
    return actionFail(e);
  }
}

export async function deleteCustomStatusAction(statusKey: string) {
  const { organizationId } = await requireOrg();
  if (!statusKey) return fail("VALIDATION", "No status was specified.");

  try {
    const success = await CustomStatusSchemaService.deleteCustomStatus(organizationId, statusKey);
    revalidatePath("/leads");
    return ok({ success });
  } catch (e) {
    return actionFail(e);
  }
}

export async function bulkUpdateLeadStatusAction(leadIds: string[], newStatus: LeadStatus) {
  const { userId, organizationId } = await requireOrg();
  if (!leadIds || leadIds.length === 0) throw new Error("No lead IDs provided");

  const result = await LeadStatusService.bulkChangeStatus(leadIds, newStatus, userId, organizationId);
  revalidatePath("/leads");
  return result;
}

export async function getLeadStatusHistoryAction(leadId: string) {
  const { organizationId } = await requireOrg();
  if (!leadId) throw new Error("Lead ID required");
  return LeadStatusService.getStatusHistory(leadId, organizationId);
}

export async function getStatusDurationAnalyticsAction() {
  const { organizationId } = await requireOrg();
  return LeadStatusService.getStatusDurationAnalytics(organizationId);
}
