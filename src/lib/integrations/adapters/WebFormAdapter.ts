import { LeadSourceAdapter, NormalizedLeadPayload } from "../types";

export class WebFormAdapter implements LeadSourceAdapter {
  providerName = "webform";

  async normalize(rawPayload: any, sourceId: string, teamId?: string, ownerId?: string): Promise<NormalizedLeadPayload> {
    // Assuming a simple webform payload: { name, email, phone, custom_fields: {...} }
    if (!rawPayload.name) {
      throw new Error("WebFormAdapter: 'name' is required");
    }

    return {
      name: rawPayload.name,
      email: rawPayload.email,
      phone: rawPayload.phone,
      company: rawPayload.company,
      sourceId,
      teamId,
      ownerId,
      customData: rawPayload.custom_fields || {},
    };
  }
}
