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

const filterSchema = z.object({
  sourceId: z.string().uuid(),
  campaignFilter: z.array(z.string()).optional(),
});

export async function updateSourceFilterAction(input: z.infer<typeof filterSchema>) {
  const { organizationId } = await requirePermission("sources.manage");
  const parsed = filterSchema.safeParse(input);
  if (!parsed.success) return fail("VALIDATION", "Invalid filter data");

  try {
    const source = await LeadSourceService.getSource(parsed.data.sourceId);
    if (!source || source.organizationId !== organizationId) {
      return fail("NOT_FOUND", "Source not found");
    }

    const currentConfig = (source.config as Record<string, unknown>) ?? {};
    const newConfig = {
      ...currentConfig,
      campaignFilter: parsed.data.campaignFilter || [],
    };

    const updated = await LeadSourceService.updateSource(source.id, { config: newConfig }, organizationId);
    revalidatePath("/settings/sources");
    return ok(updated);
  } catch (e) {
    return actionFail(e);
  }
}

export async function syncPastFacebookLeadsAction(sourceId: string) {
  const { organizationId } = await requirePermission("sources.manage");
  try {
    const source = await LeadSourceService.getSource(sourceId);
    if (!source || source.organizationId !== organizationId) {
      return fail("NOT_FOUND", "Source not found");
    }

    if (source.type !== "facebook_lead_ads") {
      return fail("VALIDATION", "Past lead sync is only supported for Facebook Lead Ads.");
    }

    const config = (source.config as Record<string, any>) ?? {};
    const pageId = config.pageId;
    const pageAccessToken = config.pageAccessToken;

    if (!pageId || !pageAccessToken) {
      return fail("VALIDATION", "Missing Facebook Page ID or Access Token in source configuration.");
    }

    const { MetaTokenRefreshService } = await import("@/domains/leads/metaTokenRefreshService");
    const { FacebookLeadMappingService } = await import("@/domains/leads/facebookLeadMappingService");
    const { IngestionService } = await import("@/lib/leads/ingestion");

    // 1. Fetch active lead forms on this Page
    const forms = await MetaTokenRefreshService.listPageLeadForms(pageId, pageAccessToken);
    if (forms.length === 0) {
      return ok({ totalFetched: 0, importedCount: 0, deduplicatedCount: 0, message: "No lead forms found on this Page." });
    }

    // 2. Prepare campaign filter if configured
    const rawFilter = config.campaignFilter;
    const campaignFilter: string[] = Array.isArray(rawFilter)
      ? rawFilter.map((s) => String(s).trim().toLowerCase())
      : typeof rawFilter === "string" && rawFilter.trim()
      ? rawFilter.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean)
      : [];

    let totalFetched = 0;
    let importedCount = 0;
    let deduplicatedCount = 0;

    for (const form of forms) {
      const rawLeads = await MetaTokenRefreshService.fetchFormLeads(form.id, pageAccessToken, 100);
      totalFetched += rawLeads.length;

      for (const fbLead of rawLeads) {
        // Apply campaign filter if set
        if (campaignFilter.length > 0) {
          const leadCampaignId = String(fbLead.campaign_id || "").toLowerCase();
          const leadCampaignName = String(fbLead.campaign_name || "").toLowerCase();
          const matches = campaignFilter.some(
            (f) =>
              (leadCampaignId && leadCampaignId === f) ||
              (leadCampaignName && leadCampaignName.includes(f)) ||
              (f.includes(leadCampaignName) && leadCampaignName.length > 0)
          );
          if (!matches) continue;
        }

        const mapped = FacebookLeadMappingService.mapFacebookLeadToStandardLead(fbLead);
        if (!mapped.email && !mapped.phone) continue;

        const normalized = {
          name: mapped.name,
          email: mapped.email || undefined,
          phone: mapped.phone || undefined,
          sourceId: source.id,
          organizationId,
          externalId: mapped.facebookLeadgenId || fbLead.id,
          customData: {
            ...mapped.customData,
            expectedValue: mapped.expectedValue,
            leadSource: mapped.source,
            _syncedFromMetaGraph: true,
          },
        };

        const res = await IngestionService.processLead(normalized);
        if (res.status === "created") importedCount++;
        else if (res.status === "deduplicated") deduplicatedCount++;
      }
    }

    revalidatePath("/leads");
    revalidatePath("/settings/sources");

    return ok({
      totalFetched,
      importedCount,
      deduplicatedCount,
      formsProcessed: forms.length,
    });
  } catch (e) {
    return actionFail(e);
  }
}
