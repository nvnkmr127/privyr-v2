"use server";

import { requireOrg, requirePermission } from "@/lib/rbac";
import { LeadSourceService } from "@/domains/leads/sourceService";
import { revalidatePath } from "next/cache";
import { z } from "zod";

export async function listSourcesAction() {
  const { organizationId } = await requireOrg();
  return LeadSourceService.getSources(organizationId);
}

const createSchema = z.object({
  name: z.string().min(1).max(255),
  // Must match a provider the ingestion worker knows how to normalize.
  type: z.enum(["generic_webhook", "facebook_lead_ads", "webform"]),
});

export async function createSourceAction(input: z.infer<typeof createSchema>) {
  const { organizationId } = await requirePermission("sources.manage");
  const data = createSchema.parse(input);
  const row = await LeadSourceService.createSource({ ...data, organizationId });
  revalidatePath("/settings/sources");
  return row;
}

export async function toggleSourceAction(id: string, isActive: boolean) {
  const { organizationId } = await requirePermission("sources.manage");
  await LeadSourceService.updateSource(id, { isActive: isActive ? 1 : 0 }, organizationId);
  revalidatePath("/settings/sources");
}

export async function renameSourceAction(id: string, name: string) {
  const { organizationId } = await requirePermission("sources.manage");
  const clean = z.string().min(1).max(255).parse(name);
  const row = await LeadSourceService.updateSource(id, { name: clean }, organizationId);
  revalidatePath("/settings/sources");
  return row;
}

export async function deleteSourceAction(id: string) {
  const { organizationId } = await requirePermission("sources.manage");
  const res = await LeadSourceService.deleteSource(id, organizationId);
  revalidatePath("/settings/sources");
  return res;
}
