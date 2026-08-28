import { describe, expect, it } from "vitest";
import { UniversalLeadMappingService } from "./universalLeadMappingService";

describe("UniversalLeadMappingService (All Major Sources)", () => {
  it("1. Maps Google Lead Form Ads payload correctly", () => {
    const googlePayload = {
      lead_id: "google_lead_123",
      form_id: "g_form_777",
      campaign_id: "g_cmp_888",
      user_column_data: [
        { column_id: "FULL_NAME", string_value: "Michael Scott" },
        { column_id: "EMAIL", string_value: "michael@dundermifflin.com" },
        { column_id: "PHONE_NUMBER", string_value: "+15551112222" },
        { column_id: "ESTIMATED_BUDGET", string_value: "$12000" },
      ],
    };

    const mapped = UniversalLeadMappingService.mapLeadByProvider("google", googlePayload);

    expect(mapped.name).toBe("Michael Scott");
    expect(mapped.email).toBe("michael@dundermifflin.com");
    expect(mapped.phone).toBe("+15551112222");
    expect(mapped.expectedValue).toBe(12000);
    expect(mapped.source).toBe("Google Lead Ads");
    expect(mapped.customData["google_campaign_id"]).toBe("g_cmp_888");
  });

  it("2. Maps LinkedIn Lead Gen Forms payload correctly", () => {
    const linkedInPayload = {
      leadId: "li_lead_456",
      formId: "li_form_333",
      campaignId: "li_cmp_222",
      answers: [
        { field: { id: "full_name" }, values: ["Pam Beesly"] },
        { field: { id: "email" }, values: ["pam@dundermifflin.com"] },
        { field: { id: "work_phone" }, values: ["+15553334444"] },
        { field: { id: "company_size" }, values: ["50-200 employees"] },
      ],
    };

    const mapped = UniversalLeadMappingService.mapLeadByProvider("linkedin", linkedInPayload);

    expect(mapped.name).toBe("Pam Beesly");
    expect(mapped.email).toBe("pam@dundermifflin.com");
    expect(mapped.phone).toBe("+15553334444");
    expect(mapped.source).toBe("LinkedIn Lead Gen");
    expect(mapped.customData["company_size"]).toBe("50-200 employees");
  });

  it("3. Maps WhatsApp Inbound Direct message payload correctly", () => {
    const waPayload = {
      from: "919876543210",
      profileName: "Jim Halpert",
      messageText: "Hi, I am interested in your Enterprise plan.",
    };

    const mapped = UniversalLeadMappingService.mapLeadByProvider("whatsapp", waPayload);

    expect(mapped.name).toBe("Jim Halpert");
    expect(mapped.phone).toBe("+919876543210");
    expect(mapped.source).toBe("WhatsApp Direct Inbound");
    expect(mapped.customData["inbound_message"]).toBe("Hi, I am interested in your Enterprise plan.");
  });

  it("4. Maps Custom Website Webhook payload correctly", () => {
    const webhookPayload = {
      name: "Dwight Schrute",
      email: "dwight@schrutefarms.com",
      phone: "+15559990000",
      budget: "$35000",
      source: "Beet Farm Landing Page",
      customData: { farm_location: "Scranton, PA" },
    };

    const mapped = UniversalLeadMappingService.mapLeadByProvider("webhook", webhookPayload);

    expect(mapped.name).toBe("Dwight Schrute");
    expect(mapped.email).toBe("dwight@schrutefarms.com");
    expect(mapped.phone).toBe("+15559990000");
    expect(mapped.expectedValue).toBe(35000);
    expect(mapped.source).toBe("Beet Farm Landing Page");
  });
});
