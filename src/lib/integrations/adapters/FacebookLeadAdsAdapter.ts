import { LeadSourceAdapter, NormalizedLeadPayload } from "../types";

export class FacebookLeadAdsAdapter implements LeadSourceAdapter {
  providerName = "facebook_lead_ads";

  async normalize(
    rawPayload: any, 
    sourceId: string, 
    teamId?: string, 
    ownerId?: string
  ): Promise<NormalizedLeadPayload> {
    
    // Facebook Lead Ads usually send field_data array
    const fieldData = rawPayload.field_data || [];
    
    let name = "Unknown Lead";
    let email = undefined;
    let phone = undefined;
    
    // Facebook has multiple ways of sending name
    const firstName = fieldData.find((f: any) => f.name === 'first_name')?.values[0];
    const lastName = fieldData.find((f: any) => f.name === 'last_name')?.values[0];
    const fullName = fieldData.find((f: any) => f.name === 'full_name')?.values[0];
    
    if (fullName) {
      name = fullName;
    } else if (firstName || lastName) {
      name = [firstName, lastName].filter(Boolean).join(" ");
    }

    email = fieldData.find((f: any) => f.name === 'email')?.values[0];
    phone = fieldData.find((f: any) => f.name === 'phone_number')?.values[0];

    return {
      name,
      email,
      phone,
      externalId: rawPayload.id,
      sourceId,
      teamId,
      ownerId,
      customData: {
        formId: rawPayload.form_id,
        adId: rawPayload.ad_id,
        campaignId: rawPayload.campaign_id,
        rawFacebookData: rawPayload
      },
    };
  }
}
