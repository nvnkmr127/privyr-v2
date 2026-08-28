import { describe, expect, it } from "vitest";
import { LeadWebhookEventService } from "./leadWebhookEventService";

describe("LeadWebhookEventService", () => {
  it("should construct valid Webhook event payload with UUID eventId and ISO timestamp", () => {
    const payload = LeadWebhookEventService.constructPayload("org-100", "lead.created", {
      leadId: "lead-abc",
      name: "John Doe",
    });

    expect(payload.eventId).toMatch(/^evt_[a-f0-9]{32}$/);
    expect(payload.event).toBe("lead.created");
    expect(payload.organizationId).toBe("org-100");
    expect(payload.data.name).toBe("John Doe");
    expect(new Date(payload.timestamp).getTime()).not.toBeNaN();
  });

  it("should generate HMAC-SHA256 signature for payload validation", () => {
    const payload = LeadWebhookEventService.constructPayload("org-100", "lead.hot_threshold", {
      leadId: "lead-xyz",
      score: 95,
    });

    const signature = LeadWebhookEventService.generateSignature(JSON.stringify(payload), "sec_secret_123");
    expect(signature).toHaveLength(64); // SHA-256 hex output is 64 chars
  });

  it("should dispatch webhook payload successfully with 200 response code and signature header", async () => {
    const payload = LeadWebhookEventService.constructPayload("org-100", "lead.stagnant_alert", {
      leadId: "lead-stagnant",
      daysStagnant: 14,
    });

    const result = await LeadWebhookEventService.dispatchWebhook(
      "https://example.com/webhook",
      "sec_secret_123",
      payload
    );

    expect(result.success).toBe(true);
    expect(result.statusCode).toBe(200);
    expect(result.signature).toHaveLength(64);
    expect(result.payload.event).toBe("lead.stagnant_alert");
  });
});
