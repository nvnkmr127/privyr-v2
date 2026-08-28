import { FacebookLeadMappingService, FacebookLeadDetails, MappedLeadResult } from "@/domains/leads/facebookLeadMappingService";

export type LeadSourceProvider = "facebook" | "google" | "linkedin" | "webhook" | "whatsapp";

export interface GoogleLeadColumn {
  column_id: string;
  string_value?: string;
}

export interface GoogleLeadPayload {
  lead_id: string;
  form_id: string;
  campaign_id?: string;
  user_column_data: GoogleLeadColumn[];
}

export interface LinkedInAnswer {
  field: { id: string; name?: string };
  values: string[];
}

export interface LinkedInLeadPayload {
  leadId: string;
  formId: string;
  campaignId?: string;
  answers: LinkedInAnswer[];
}

export interface WhatsAppLeadPayload {
  from: string;
  profileName?: string;
  messageText?: string;
}

export class UniversalLeadMappingService {
  /**
   * Universal mapper for Google Lead Form Ads payload.
   */
  static mapGoogleLeadToStandardLead(googleLead: GoogleLeadPayload): MappedLeadResult {
    let name = "Google Lead";
    let email: string | null = null;
    let phone: string | null = null;
    let expectedValue: number | null = null;
    const customData: Record<string, any> = {};

    for (const col of googleLead.user_column_data) {
      const val = col.string_value?.trim();
      if (!val) continue;

      const colIdUpper = col.column_id.toUpperCase();

      if (colIdUpper.includes("FULL_NAME") || colIdUpper.includes("NAME") || colIdUpper.includes("FIRST_NAME")) {
        if (name === "Google Lead") name = val;
      } else if (colIdUpper.includes("EMAIL")) {
        email = val;
      } else if (colIdUpper.includes("PHONE")) {
        phone = val;
      } else if (colIdUpper.includes("BUDGET")) {
        const num = Number(val.replace(/[^0-9.]/g, ""));
        if (!isNaN(num) && num > 0) expectedValue = num;
      } else {
        customData[col.column_id] = val;
      }
    }

    customData["google_form_id"] = googleLead.form_id;
    if (googleLead.campaign_id) customData["google_campaign_id"] = googleLead.campaign_id;

    return {
      name,
      email,
      phone,
      expectedValue,
      customData,
      source: "Google Lead Ads",
      facebookLeadgenId: googleLead.lead_id,
      facebookFormId: googleLead.form_id,
    };
  }

  /**
   * Universal mapper for LinkedIn Lead Gen Forms payload.
   */
  static mapLinkedInLeadToStandardLead(linkedInLead: LinkedInLeadPayload): MappedLeadResult {
    let name = "LinkedIn Lead";
    let email: string | null = null;
    let phone: string | null = null;
    let expectedValue: number | null = null;
    const customData: Record<string, any> = {};

    for (const ans of linkedInLead.answers) {
      const val = ans.values && ans.values.length > 0 ? ans.values[0] : "";
      if (!val) continue;

      const keyName = (ans.field.name || ans.field.id).toLowerCase();

      if (keyName.includes("name") || keyName.includes("full_name") || keyName.includes("first_name")) {
        if (name === "LinkedIn Lead") name = val;
      } else if (keyName.includes("email")) {
        email = val;
      } else if (keyName.includes("phone") || keyName.includes("mobile")) {
        phone = val;
      } else if (keyName.includes("budget")) {
        const num = Number(val.replace(/[^0-9.]/g, ""));
        if (!isNaN(num) && num > 0) expectedValue = num;
      } else {
        customData[keyName] = val;
      }
    }

    customData["linkedin_form_id"] = linkedInLead.formId;
    if (linkedInLead.campaignId) customData["linkedin_campaign_id"] = linkedInLead.campaignId;

    return {
      name,
      email,
      phone,
      expectedValue,
      customData,
      source: "LinkedIn Lead Gen",
      facebookLeadgenId: linkedInLead.leadId,
      facebookFormId: linkedInLead.formId,
    };
  }

  /**
   * Universal mapper for Inbound WhatsApp Message leads.
   */
  static mapWhatsAppLeadToStandardLead(waLead: WhatsAppLeadPayload): MappedLeadResult {
    const phone = waLead.from.startsWith("+") ? waLead.from : `+${waLead.from}`;
    const name = waLead.profileName?.trim() || `WhatsApp (${phone})`;

    return {
      name,
      email: null,
      phone,
      expectedValue: null,
      customData: {
        inbound_message: waLead.messageText || "",
        channel: "whatsapp",
      },
      source: "WhatsApp Direct Inbound",
      facebookLeadgenId: `wa_${Date.now()}`,
      facebookFormId: "whatsapp_inbound",
    };
  }

  /**
   * Router to parse and map lead payload based on provider type.
   */
  static mapLeadByProvider(provider: LeadSourceProvider, payload: any): MappedLeadResult {
    switch (provider) {
      case "facebook":
        return FacebookLeadMappingService.mapFacebookLeadToStandardLead(payload as FacebookLeadDetails);
      case "google":
        return this.mapGoogleLeadToStandardLead(payload as GoogleLeadPayload);
      case "linkedin":
        return this.mapLinkedInLeadToStandardLead(payload as LinkedInLeadPayload);
      case "whatsapp":
        return this.mapWhatsAppLeadToStandardLead(payload as WhatsAppLeadPayload);
      case "webhook":
      default:
        return {
          name: payload.name || payload.full_name || "Webhook Lead",
          email: payload.email || payload.user_email || null,
          phone: payload.phone || payload.phone_number || null,
          expectedValue: payload.budget ? Number(String(payload.budget).replace(/[^0-9.]/g, "")) : null,
          customData: payload.customData || payload,
          source: payload.source || "Website Custom Webhook",
          facebookLeadgenId: payload.id || `wh_${Date.now()}`,
          facebookFormId: payload.formId || "custom_webhook",
        };
    }
  }
}
