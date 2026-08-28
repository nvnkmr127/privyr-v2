"use server";

import { requireOrg, requirePermission } from "@/lib/rbac";
import { DedupService } from "@/domains/leads/dedupService";
import { AuditService } from "@/domains/audit/service";
import { revalidatePath } from "next/cache";
import { z } from "zod";

export async function findDuplicatesAction() {
  const { organizationId } = await requireOrg();
  return DedupService.findDuplicateGroups(organizationId);
}

const mergeSchema = z.object({ primaryId: z.string().uuid(), duplicateId: z.string().uuid() });

export async function mergeLeadsAction(input: z.infer<typeof mergeSchema>) {
  const { organizationId, userId } = await requirePermission("leads.merge");
  const { primaryId, duplicateId } = mergeSchema.parse(input);
  await DedupService.merge(organizationId, primaryId, duplicateId);
  await AuditService.log({
    organizationId, userId, action: "lead.merge", entityType: "lead", entityId: primaryId, metadata: { duplicateId },
  });
  revalidatePath("/leads");
  revalidatePath("/leads/duplicates");
}
