import { describe, expect, it, vi } from "vitest";
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

  it("should generate HMAC-SHA256 signature for payload validation", async () => {
    const payload = LeadWebhookEventService.constructPayload("org-100", "lead.hot_threshold", {
      leadId: "lead-xyz",
      score: 95,
    });

    const signature = await LeadWebhookEventService.generateSignature(JSON.stringify(payload), "sec_secret_123");
    expect(signature).toHaveLength(64); // SHA-256 hex output is 64 chars
  });

  it("POSTs the signed payload and reports success on a 2xx", async () => {
    const payload = LeadWebhookEventService.constructPayload("org-100", "lead.stagnant_alert", {
      leadId: "lead-stagnant",
      daysStagnant: 14,
    });
    const fetchMock = vi.fn().mockResolvedValue({ status: 202 });
    vi.stubGlobal("fetch", fetchMock);

    const result = await LeadWebhookEventService.dispatchWebhook("https://example.com/webhook", "sec_secret_123", payload);

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://example.com/webhook");
    expect(init.method).toBe("POST");
    expect(init.headers["X-Privyr-Signature"]).toHaveLength(64);
    expect(result.success).toBe(true);
    expect(result.statusCode).toBe(202);
    vi.unstubAllGlobals();
  });

  it("reports failure on a non-2xx and on a network error", async () => {
    const payload = LeadWebhookEventService.constructPayload("org-100", "lead.created", { leadId: "l1" });

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ status: 500 }));
    let result = await LeadWebhookEventService.dispatchWebhook("https://x/y", "s", payload);
    expect(result.success).toBe(false);
    expect(result.statusCode).toBe(500);

    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("ECONNREFUSED")));
    result = await LeadWebhookEventService.dispatchWebhook("https://x/y", "s", payload);
    expect(result.success).toBe(false);
    expect(result.statusCode).toBe(0);
    vi.unstubAllGlobals();
  });
});
