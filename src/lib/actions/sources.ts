"use server";

import { requireAuth } from "@/lib/rbac";
import { LeadSourceService } from "@/domains/leads/sourceService";
import { revalidatePath } from "next/cache";
import { z } from "zod";

export async function listSourcesAction() {
  await requireAuth();
  return LeadSourceService.getSources();
}

const createSchema = z.object({
  name: z.string().min(1).max(255),
  // Must match a provider the ingestion worker knows how to normalize.
  type: z.enum(["generic_webhook", "facebook_lead_ads", "webform"]),
});

export async function createSourceAction(input: z.infer<typeof createSchema>) {
  await requireAuth();
  const data = createSchema.parse(input);
  const row = await LeadSourceService.createSource(data);
  revalidatePath("/settings/sources");
  return row;
}

export async function toggleSourceAction(id: string, isActive: boolean) {
  await requireAuth();
  await LeadSourceService.updateSource(id, { isActive: isActive ? 1 : 0 });
  revalidatePath("/settings/sources");
}
