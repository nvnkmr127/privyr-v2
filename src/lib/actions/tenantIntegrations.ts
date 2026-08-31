"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/rbac";
import { TenantIntegrationsService } from "@/domains/organizations/tenantIntegrationsService";
import { ok, fail, actionFail, zodFieldErrors } from "@/lib/actions/result";

export async function getTenantIntegrationsAction() {
  const { organizationId } = await requirePermission("settings.manage");
  return TenantIntegrationsService.getView(organizationId);
}

const enrichmentSchema = z.object({
  apiUrl: z.string().trim().url("Enter a valid https URL").optional().or(z.literal("")),
  authHeader: z.string().trim().max(100).optional().or(z.literal("")),
  authValue: z.string().max(1024).optional(), // blank = keep existing
  timeoutMs: z.coerce.number().int().min(1000).max(60000).optional(),
  enabled: z.boolean().optional(),
});

export async function updateEnrichmentAction(input: z.infer<typeof enrichmentSchema>) {
  const { organizationId } = await requirePermission("settings.manage");
  const parsed = enrichmentSchema.safeParse(input);
  if (!parsed.success) return fail("VALIDATION", "Please check the highlighted fields.", zodFieldErrors(parsed.error));
  const d = parsed.data;

  // Turning it on requires a complete config.
  if (d.enabled) {
    const existing = await TenantIntegrationsService.getView(organizationId);
    const willHaveValue = (d.authValue && d.authValue.length > 0) || existing.hasEnrichmentAuthValue;
    const willHaveUrl = (d.apiUrl && d.apiUrl.length > 0) || existing.enrichmentApiUrl;
    if (!willHaveUrl || !willHaveValue) {
      return fail("VALIDATION", "To enable enrichment, provide the provider URL and auth header value.");
    }
  }

  try {
    const view = await TenantIntegrationsService.upsertEnrichment(organizationId, {
      apiUrl: d.apiUrl || null,
      authHeader: d.authHeader || null,
      authValue: d.authValue,
      timeoutMs: d.timeoutMs ?? null,
      enabled: d.enabled,
    });
    revalidatePath("/settings/lead-intelligence");
    return ok(view);
  } catch (e) {
    return actionFail(e);
  }
}

export async function setInboundEmailAction(enabled: boolean) {
  const { organizationId } = await requirePermission("settings.manage");
  try {
    const view = await TenantIntegrationsService.setInboundEmail(organizationId, Boolean(enabled));
    revalidatePath("/settings/lead-intelligence");
    return ok(view);
  } catch (e) {
    return actionFail(e);
  }
}

export async function rotateInboundTokenAction() {
  const { organizationId } = await requirePermission("settings.manage");
  try {
    const view = await TenantIntegrationsService.rotateInboundToken(organizationId);
    revalidatePath("/settings/lead-intelligence");
    return ok(view);
  } catch (e) {
    return actionFail(e);
  }
}
