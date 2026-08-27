"use server";

import { requireAuth } from "@/lib/rbac";
import { TagService } from "@/domains/tags/service";
import { revalidatePath } from "next/cache";

export async function listTagsAction() {
  await requireAuth();
  return TagService.listAll();
}

export async function addTagAction(leadId: string, name: string) {
  await requireAuth();
  const tag = await TagService.addToLead(leadId, name);
  revalidatePath(`/leads/${leadId}`);
  return tag;
}

export async function removeTagAction(leadId: string, tagId: string) {
  await requireAuth();
  await TagService.removeFromLead(leadId, tagId);
  revalidatePath(`/leads/${leadId}`);
}
