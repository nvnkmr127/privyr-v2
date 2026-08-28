import { describe, expect, it } from "vitest";
import { WebhookDlqService } from "./webhookDlqService";

describe("WebhookDlqService", () => {
  it("should record, retrieve, retry, and purge DLQ failed webhook items", async () => {
    WebhookDlqService.recordFailedJob({
      jobId: "dlq-job-1",
      eventId: "evt_100",
      event: "lead.created",
      endpointUrl: "https://example.com/hooks",
      failedAt: new Date().toISOString(),
      errorReason: "HTTP 500 Server Error",
      attemptCount: 5,
      payload: {
        eventId: "evt_100",
        event: "lead.created",
        timestamp: new Date().toISOString(),
        organizationId: "org-1",
        data: { name: "John Doe" },
      },
    });

    const dlqJobs = await WebhookDlqService.getFailedDlqJobs("org-1");
    expect(dlqJobs.length).toBe(1);
    expect(dlqJobs[0].jobId).toBe("dlq-job-1");
    expect(dlqJobs[0].attemptCount).toBe(5);

    // Test Retry
    const retryRes = await WebhookDlqService.retryDlqJob("dlq-job-1", "org-1");
    expect(retryRes.success).toBe(true);

    const remainingAfterRetry = await WebhookDlqService.getFailedDlqJobs("org-1");
    expect(remainingAfterRetry.length).toBe(0);

    // Record another and test purge
    WebhookDlqService.recordFailedJob({
      jobId: "dlq-job-2",
      eventId: "evt_200",
      event: "lead.stagnant_alert",
      endpointUrl: "https://example.com/hooks",
      failedAt: new Date().toISOString(),
      errorReason: "Connection refused",
      attemptCount: 5,
      payload: {
        eventId: "evt_200",
        event: "lead.stagnant_alert",
        timestamp: new Date().toISOString(),
        organizationId: "org-1",
        data: { leadId: "lead-2" },
      },
    });

    const purgeRes = await WebhookDlqService.purgeDlqJob("dlq-job-2", "org-1");
    expect(purgeRes.success).toBe(true);

    const remainingAfterPurge = await WebhookDlqService.getFailedDlqJobs("org-1");
    expect(remainingAfterPurge.length).toBe(0);
  });
});
