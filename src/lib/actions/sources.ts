"use server";

import { requireOrg, requirePermission } from "@/lib/rbac";
import { LeadSourceService } from "@/domains/leads/sourceService";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ok, fail, actionFail } from "@/lib/actions/result";
import { sanitizeFields } from "@/lib/leads/formFields";

export async function listSourcesAction() {
  const { organizationId } = await requireOrg();
  return LeadSourceService.getSources(organizationId);
}

const createSchema = z.object({
  name: z.string().min(1).max(255),
  // Must match a provider the ingestion worker knows how to normalize.
  type: z.enum(["generic_webhook", "facebook_lead_ads", "webform", "google_lead_ads"]),
});

export async function createSourceAction(input: z.infer<typeof createSchema>) {
  const { organizationId } = await requirePermission("sources.manage");
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return fail("VALIDATION", "Please enter a name and choose a valid source type.");
  try {
    const row = await LeadSourceService.createSource({ ...parsed.data, organizationId });
    revalidatePath("/settings/sources");
    return ok(row);
  } catch (e) {
    return actionFail(e);
  }
}

export async function updateSourceFormAction(id: string, fields: unknown) {
  const { organizationId } = await requirePermission("sources.manage");
  const source = await LeadSourceService.getSource(id);
  if (!source || source.organizationId !== organizationId) return fail("NOT_FOUND", "This form no longer exists.");
  try {
    const clean = sanitizeFields(fields);
    const config = { ...((source.config as Record<string, unknown>) ?? {}), formFields: clean };
    await LeadSourceService.updateSource(id, { config }, organizationId);
    revalidatePath("/settings/sources");
    return ok({ fields: clean });
  } catch (e) {
    return actionFail(e);
  }
}

export async function toggleSourceAction(id: string, isActive: boolean) {
  const { organizationId } = await requirePermission("sources.manage");
  try {
    await LeadSourceService.updateSource(id, { isActive: isActive ? 1 : 0 }, organizationId);
    revalidatePath("/settings/sources");
    return ok({ id, isActive });
  } catch (e) {
    return actionFail(e);
  }
}

export async function renameSourceAction(id: string, name: string) {
  const { organizationId } = await requirePermission("sources.manage");
  const parsed = z.string().min(1).max(255).safeParse(name);
  if (!parsed.success) return fail("VALIDATION", "Please enter a source name.");
  try {
    const row = await LeadSourceService.updateSource(id, { name: parsed.data }, organizationId);
    revalidatePath("/settings/sources");
    return ok(row);
  } catch (e) {
    return actionFail(e);
  }
}

export async function deleteSourceAction(id: string) {
  const { organizationId } = await requirePermission("sources.manage");
  try {
    const res = await LeadSourceService.deleteSource(id, organizationId);
    revalidatePath("/settings/sources");
    return ok(res);
  } catch (e) {
    return actionFail(e);
  }
}

const facebookPagesSchema = z.array(
  z.object({
    pageId: z.string().min(1),
    name: z.string().min(1),
    pageAccessToken: z.string().min(1),
    expiresAt: z.string().optional().nullable(),
  })
).min(1);

export async function connectFacebookPagesAction(pages: z.infer<typeof facebookPagesSchema>) {
  const { organizationId } = await requirePermission("sources.manage");
  const parsed = facebookPagesSchema.safeParse(pages);
  if (!parsed.success) return fail("VALIDATION", "Please select at least one valid Facebook Page.");

  try {
    const connected = [];
    for (const p of parsed.data) {
      const source = await LeadSourceService.upsertFacebookPageSource(organizationId, {
        pageId: p.pageId,
        name: p.name,
        pageAccessToken: p.pageAccessToken,
        expiresAt: p.expiresAt ? new Date(p.expiresAt) : null,
      });
      connected.push(source);
    }
    revalidatePath("/settings/sources");
    return ok({ connected });
  } catch (e) {
    return actionFail(e);
  }
}
