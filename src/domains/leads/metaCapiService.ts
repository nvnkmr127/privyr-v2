import { LeadService } from "./service";
import { TenantIntegrationsService } from "@/domains/organizations/tenantIntegrationsService";
import { buildEvent, postEvents, postEventsDetailed } from "@/lib/integrations/metaCapi";

// Sends a lead conversion event to the lead's tenant Meta CAPI destination. Best-effort: no config
// = no-op, and it never throws into the caller (fired from event handlers).
// ponytail: fire-once, no retry queue — add one if delivery guarantees matter.
export class MetaCapiService {
  static async track(leadId: string, eventName: string): Promise<void> {
    try {
      const lead = await LeadService.getLeadById(leadId);
      if (!lead?.organizationId) return;

      const config = await TenantIntegrationsService.getCapiConfig(lead.organizationId);
      if (!config) return;

      const event = buildEvent(eventName, {
        id: lead.id,
        email: lead.email,
        phone: lead.phone,
        name: lead.name,
        value: lead.expectedValue != null ? Number(lead.expectedValue) : null,
      });
      await postEvents(config, [event]);
    } catch {
      // best-effort; a CAPI failure must never affect lead processing
    }
  }

  /** Send a sample event using the saved config (even if not enabled) so a tenant can verify setup. */
  static async sendTest(organizationId: string): Promise<{ ok: boolean; error?: string }> {
    const config = await TenantIntegrationsService.getCapiConfig(organizationId, false);
    if (!config) return { ok: false, error: "Save your Pixel/Dataset ID and access token first." };
    const event = buildEvent("Lead", {
      id: `test-${Date.now()}`,
      email: "test@example.com",
      name: "Test Lead",
    });
    return postEventsDetailed(config, [event]);
  }
}
