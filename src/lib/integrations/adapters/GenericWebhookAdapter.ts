import { LeadSourceAdapter, NormalizedLeadPayload } from "../types";

export class GenericWebhookAdapter implements LeadSourceAdapter {
  providerName = "generic_webhook";

  async normalize(
    rawPayload: any, 
    sourceId: string, 
    teamId?: string, 
    ownerId?: string
  ): Promise<NormalizedLeadPayload> {
    
    // In a generic webhook, we attempt to guess or map common fields
    const name = rawPayload.name || rawPayload.fullName || rawPayload.first_name || "Unknown Lead";
    const email = rawPayload.email || rawPayload.emailAddress || rawPayload.email_address;
    const phone = rawPayload.phone || rawPayload.phoneNumber || rawPayload.phone_number;
    const company = rawPayload.company || rawPayload.organization;
    const externalId = rawPayload.id || rawPayload.leadId || rawPayload.externalId;

    // Everything else gets stuffed into customData
    const customData = { ...rawPayload };
    delete customData.name;
    delete customData.email;
    delete customData.phone;
    delete customData.company;
    delete customData.sourceId; // remove if it was passed in the body

    return {
      name,
      email,
      phone,
      company,
      externalId,
      sourceId,
      teamId,
      ownerId,
      customData,
    };
  }
}
