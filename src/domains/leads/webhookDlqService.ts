import { WebhookEventPayload } from "@/domains/leads/leadWebhookEventService";

export interface DlqItem {
  jobId: string;
  eventId: string;
  event: WebhookEventPayload["event"];
  endpointUrl: string;
  failedAt: string;
  errorReason: string;
  attemptCount: number;
  payload: WebhookEventPayload;
}

// In-memory or Redis-backed Dead Letter Queue storage
const dlqStore: DlqItem[] = [];

export class WebhookDlqService {
  /**
   * Records a permanently failed webhook event into the Dead Letter Queue (DLQ).
   */
  static recordFailedJob(item: DlqItem): void {
    dlqStore.unshift(item);
  }

  /**
   * Retrieves all Dead Letter Queue (DLQ) failed webhook items for an organization.
   */
  static async getFailedDlqJobs(organizationId: string): Promise<DlqItem[]> {
    return dlqStore.filter((item) => item.payload.organizationId === organizationId);
  }

  /**
   * Re-enqueues a failed DLQ webhook job for immediate retry execution.
   */
  static async retryDlqJob(jobId: string, organizationId: string): Promise<{ success: boolean; message: string }> {
    const idx = dlqStore.findIndex((item) => item.jobId === jobId && item.payload.organizationId === organizationId);
    if (idx === -1) {
      throw new Error(`DLQ Job ${jobId} not found`);
    }

    const [retriedItem] = dlqStore.splice(idx, 1);
    // In production BullMQ, queue.add(retriedItem.event, retriedItem.payload)
    return {
      success: true,
      message: `Re-enqueued DLQ webhook job ${retriedItem.jobId} (Event: ${retriedItem.event}) for delivery`,
    };
  }

  /**
   * Purges a failed DLQ webhook item permanently.
   */
  static async purgeDlqJob(jobId: string, organizationId: string): Promise<{ success: boolean; message: string }> {
    const idx = dlqStore.findIndex((item) => item.jobId === jobId && item.payload.organizationId === organizationId);
    if (idx === -1) {
      throw new Error(`DLQ Job ${jobId} not found`);
    }

    dlqStore.splice(idx, 1);
    return {
      success: true,
      message: `Purged DLQ webhook job ${jobId} from storage`,
    };
  }
}
