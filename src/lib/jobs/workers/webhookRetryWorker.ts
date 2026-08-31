import { Queue, Worker, Job } from "bullmq";
import { createRedis, quietErrors } from "../redis";
import { LeadWebhookEventService, WebhookEventPayload } from "@/domains/leads/leadWebhookEventService";
import { WebhookDlqService } from "@/domains/leads/webhookDlqService";

export const WEBHOOK_DELIVERY_QUEUE_NAME = "webhook-delivery";
export const WEBHOOK_MAX_ATTEMPTS = 5;

export interface WebhookRetryJobData {
  endpointId?: string;
  endpointUrl: string;
  webhookSecret: string;
  payload: WebhookEventPayload;
}

const connection = createRedis({ maxRetriesPerRequest: null });

// Deliveries retry with exponential backoff via BullMQ's own attempts/backoff. Failed jobs are
// kept in Redis (removeOnFail:false) and mirrored into the DLQ service for the settings UI.
export const webhookDeliveryQueue = new Queue<WebhookRetryJobData>(WEBHOOK_DELIVERY_QUEUE_NAME, {
  connection,
  defaultJobOptions: {
    attempts: WEBHOOK_MAX_ATTEMPTS,
    backoff: { type: "exponential", delay: 1000 },
    removeOnComplete: 1000,
    removeOnFail: false,
  },
});

// Exposed for reference/tests; BullMQ applies the same exponential curve via `backoff` above.
export function calculateBackoffDelayMs(attempt: number, baseDelayMs = 1000, maxDelayMs = 60000): number {
  return Math.min(baseDelayMs * Math.pow(2, attempt - 1), maxDelayMs);
}

// Delivers one webhook. THROWS on failure so BullMQ retries per the queue's backoff policy.
export async function processWebhookDeliveryJob(job: Job<WebhookRetryJobData>) {
  const { endpointUrl, webhookSecret, payload } = job.data;
  const result = await LeadWebhookEventService.dispatchWebhook(endpointUrl, webhookSecret, payload);
  if (!result.success || result.statusCode < 200 || result.statusCode >= 300) {
    throw new Error(`Endpoint returned status ${result.statusCode}`);
  }
  return { delivered: true, statusCode: result.statusCode };
}

let worker: Worker<WebhookRetryJobData> | undefined;

export function createWebhookRetryWorker(): Worker<WebhookRetryJobData> {
  if (worker) return worker;
  worker = new Worker<WebhookRetryJobData>(WEBHOOK_DELIVERY_QUEUE_NAME, processWebhookDeliveryJob, {
    connection,
    concurrency: 5,
  });
  worker.on("failed", (job, err) => {
    if (!job) return;
    const exhausted = job.attemptsMade >= (job.opts.attempts ?? WEBHOOK_MAX_ATTEMPTS);
    if (!exhausted) return; // still has retries left
    const p = job.data.payload;
    WebhookDlqService.recordFailedJob({
      jobId: String(job.id),
      eventId: p.eventId,
      event: p.event,
      endpointUrl: job.data.endpointUrl,
      failedAt: new Date().toISOString(),
      errorReason: err.message,
      attemptCount: job.attemptsMade,
      payload: p,
    });
  });
  quietErrors(worker);
  return worker;
}
