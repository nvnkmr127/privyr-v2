"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireOrg } from "@/lib/rbac";
import { ContentSharingService } from "@/domains/leads/contentSharingService";

const createSchema = z.object({
  leadId: z.string().uuid(),
  title: z.string().min(1).max(255),
  targetUrl: z.string().min(1).max(2048),
});

export async function createShareAction(data: unknown) {
  const { organizationId, userId } = await requireOrg();
  const { leadId, title, targetUrl } = createSchema.parse(data);

  const normalized = ContentSharingService.normalizeUrl(targetUrl);
  if (!normalized) throw new Error("Enter a valid web link (http:// or https://).");

  const share = await ContentSharingService.createShare({
    organizationId,
    leadId,
    ownerId: userId,
    title,
    targetUrl: normalized,
  });
  revalidatePath(`/leads/${leadId}`);
  return share;
}

export async function listSharesAction(leadId: string) {
  await requireOrg();
  return ContentSharingService.listForLead(leadId);
}
