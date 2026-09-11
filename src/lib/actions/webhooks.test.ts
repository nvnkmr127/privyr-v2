import { describe, it, expect, vi, beforeEach } from "vitest";
import { testWebhookEndpointAction } from "./webhooks";
import { WebhookEndpointService } from "@/domains/integrations/webhookEndpointService";

vi.mock("@/lib/rbac", () => ({
  requirePermission: vi.fn().mockResolvedValue({ organizationId: "org-1", userId: "user-1" }),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/domains/integrations/webhookEndpointService", () => ({
  WebhookEndpointService: {
    test: vi.fn(),
  },
  WEBHOOK_EVENT_TYPES: ["lead.created", "lead.status_changed", "lead.hot_threshold", "lead.stagnant_alert"],
}));

describe("testWebhookEndpointAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns ok when test succeeds", async () => {
    (WebhookEndpointService.test as any).mockResolvedValue({
      success: true,
      statusCode: 200,
    });

    const res = await testWebhookEndpointAction("ep-1");
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.statusCode).toBe(200);
    }
  });

  it("returns failure when test endpoint delivery fails", async () => {
    (WebhookEndpointService.test as any).mockResolvedValue({
      success: false,
      statusCode: 500,
      error: "Endpoint responded with HTTP 500.",
    });

    const res = await testWebhookEndpointAction("ep-1");
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.message).toBe("Endpoint responded with HTTP 500.");
    }
  });
});
