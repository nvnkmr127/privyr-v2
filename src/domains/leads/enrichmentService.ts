import { db } from "@/db";
import { leads } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ActivityService } from "@/domains/activities/service";
import { TenantIntegrationsService, type EnrichmentConfig } from "@/domains/organizations/tenantIntegrationsService";

// Lead enrichment: fetch observed facts about a lead (company, title, socials …) from an external
// data provider and record them as EVIDENCE, not truth. The provider is configured PER TENANT
// (Settings → Lead Intelligence), not via env — a tenant with none set is an honest no-op.
//
// Evidence discipline (borrowed from the agentic-CRM approach): the provider reports what it
// *observed*, stored verbatim under `customData._enrichment`. A strong field (company) fills the
// real column ONLY when the human left it blank — an enriched guess never overwrites entered data.

export interface EnrichmentResult {
  source: string;
  attributes: Record<string, unknown>;
}

export interface EnrichmentInput {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
}

/**
 * Calls the tenant's configured enrichment provider. Returns null on no lookup data, error, or no
 * match, so callers skip rather than break. The request/response mapping below is the ONE place
 * to adapt to a specific vendor — reshape `attributes` here if their JSON differs.
 * ponytail: generic POST contract, swap for a vendor SDK's field mapping if one provider wins.
 */
export async function fetchFromProvider(input: EnrichmentInput, config: EnrichmentConfig): Promise<EnrichmentResult | null> {
  if (!input.email && !input.company) return null; // nothing to look up

  try {
    const res = await fetch(config.url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        [config.authHeader]: config.authValue,
      },
      body: JSON.stringify({ email: input.email, company: input.company, name: input.name }),
      signal: AbortSignal.timeout(config.timeoutMs),
    });
    if (!res.ok) return null; // 404 = no match; 4xx/5xx = skip honestly
    const attributes = (await res.json()) as Record<string, unknown>;
    if (!attributes || typeof attributes !== "object" || Object.keys(attributes).length === 0) return null;
    const source = new URL(config.url).host;
    return { source, attributes };
  } catch {
    return null;
  }
}

/**
 * Pure evidence-merge: attach the observation under customData._enrichment and fill `company`
 * only when it was blank. Never mutates its inputs. This is the part worth testing.
 */
export function mergeEnrichment(
  lead: { company: string | null; customData: unknown },
  result: EnrichmentResult,
  now: Date = new Date(),
): { company: string | null; customData: Record<string, unknown> } {
  const custom: Record<string, unknown> = { ...((lead.customData as Record<string, unknown>) ?? {}) };
  custom._enrichment = {
    source: result.source,
    fetchedAt: now.toISOString(),
    attributes: result.attributes,
  };

  const observed = result.attributes.company ?? result.attributes.companyName;
  const enrichedCompany = typeof observed === "string" ? observed.trim() : "";
  const hasHumanCompany = Boolean(lead.company && lead.company.trim());
  const company = hasHumanCompany ? lead.company : enrichedCompany || lead.company;

  return { company, customData: custom };
}

/** True when a lead is worth (re-)enriching: has something to look up and isn't already enriched. */
export function needsEnrichment(lead: { email: string | null; company: string | null; customData: unknown }): boolean {
  const already = Boolean((lead.customData as { _enrichment?: unknown } | null)?._enrichment);
  return !already && Boolean(lead.email || lead.company);
}

export class EnrichmentService {
  /** Enrich one lead in place. Safe to call for any lead; no-op when the tenant has no provider. */
  static async enrichLead(leadId: string): Promise<{ status: "enriched" | "skipped"; reason?: string }> {
    const [lead] = await db.select().from(leads).where(eq(leads.id, leadId)).limit(1);
    if (!lead) return { status: "skipped", reason: "lead_not_found" };

    const config = await TenantIntegrationsService.getEnrichmentConfig(lead.organizationId);
    if (!config) return { status: "skipped", reason: "provider_not_configured" };

    const result = await fetchFromProvider(
      { name: lead.name, email: lead.email, phone: lead.phone, company: lead.company },
      config,
    );
    if (!result) return { status: "skipped", reason: "no_match" };

    const merged = mergeEnrichment(lead, result);
    await db
      .update(leads)
      .set({ company: merged.company, customData: merged.customData, updatedAt: new Date() })
      .where(eq(leads.id, leadId));

    await ActivityService.addActivity({
      leadId,
      type: "note",
      content: `Lead enriched from ${result.source}.`,
    });

    return { status: "enriched" };
  }
}
