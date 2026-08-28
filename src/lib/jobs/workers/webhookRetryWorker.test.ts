import { describe, expect, it, vi } from "vitest";
import {
  calculateBackoffDelayMs,
  processWebhookDeliveryJob,
  WebhookRetryJobData,
} from "./webhookRetryWorker";
import { LeadWebhookEventService } from "@/domains/leads/leadWebhookEventService";

vi.mock("@/domains/leads/leadWebhookEventService", () => ({
  LeadWebhookEventService: {
    dispatchWebhook: vi.fn(),
  },
}));

describe("Webhook Retry Worker & Exponential Backoff Architecture", () => {
  it("should calculate exponential backoff delay correctly with cap", () => {
    expect(calculateBackoffDelayMs(1)).toBe(1000); // 1s
    expect(calculateBackoffDelayMs(2)).toBe(2000); // 2s
    expect(calculateBackoffDelayMs(3)).toBe(4000); // 4s
    expect(calculateBackoffDelayMs(4)).toBe(8000); // 8s
    expect(calculateBackoffDelayMs(7)).toBe(60000); // Capped at 60s max
  });

  it("should deliver webhook payload on first attempt successfully", async () => {
    (LeadWebhookEventService.dispatchWebhook as any).mockResolvedValueOnce({
      success: true,
      statusCode: 200,
    });

    const mockJob: any = {
      id: "job-wh-1",
      data: {
        endpointUrl: "https://example.com/hooks",
        webhookSecret: "secret123",
        payload: {
          eventId: "evt_123",
          event: "lead.created",
          timestamp: new Date().toISOString(),
          organizationId: "org-1",
          data: { name: "Test Lead" },
        },
        maxRetries: 5,
        currentAttempt: 1,
      } as WebhookRetryJobData,
    };

    const result = await processWebhookDeliveryJob(mockJob);

    expect(result.delivered).toBe(true);
    expect(result.statusCode).toBe(200);
    expect(result.attempt).toBe(1);
  });

  it("should calculate exponential retry delay when HTTP delivery fails", async () => {
    (LeadWebhookEventService.dispatchWebhook as any).mockRejectedValueOnce(
      new Error("ETIMEDOUT Server connection failed")
    );

    const mockJob: any = {
      id: "job-wh-2",
      data: {
        endpointUrl: "https://example.com/hooks",
        webhookSecret: "secret123",
        payload: {
          eventId: "evt_456",
          event: "lead.hot_threshold",
          timestamp: new Date().toISOString(),
          organizationId: "org-1",
          data: { score: 90 },
        },
        maxRetries: 5,
        currentAttempt: 2,
      } as WebhookRetryJobData,
    };

    const result = await processWebhookDeliveryJob(mockJob);

    expect(result.delivered).toBe(false);
    expect(result.attempt).toBe(2);
    expect(result.nextRetryDelayMs).toBe(2000); // Attempt 2 = 2s delay
    expect(result.error).toContain("ETIMEDOUT");
  });

  it("should throw error when max retries are exhausted", async () => {
    (LeadWebhookEventService.dispatchWebhook as any).mockRejectedValueOnce(
      new Error("500 Internal Server Error")
    );

    const mockJob: any = {
      id: "job-wh-3",
      data: {
        endpointUrl: "https://example.com/hooks",
        webhookSecret: "secret123",
        payload: {
          eventId: "evt_789",
          event: "lead.stagnant_alert",
          timestamp: new Date().toISOString(),
          organizationId: "org-1",
          data: { leadId: "lead-1" },
        },
        maxRetries: 3,
        currentAttempt: 3,
      } as WebhookRetryJobData,
    };

    await expect(processWebhookDeliveryJob(mockJob)).rejects.toThrow(
      "Webhook delivery failed permanently after 3 attempts"
    );
  });
});
