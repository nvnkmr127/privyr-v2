import { Worker, Job } from "bullmq";
import Redis from "ioredis";
import { LeadWebhookEventService, WebhookEventPayload } from "@/domains/leads/leadWebhookEventService";

export const WEBHOOK_DELIVERY_QUEUE_NAME = "webhook-delivery";

export interface WebhookRetryJobData {
  endpointUrl: string;
  webhookSecret: string;
  payload: WebhookEventPayload;
  maxRetries?: number;
  currentAttempt?: number;
}

export function calculateBackoffDelayMs(attempt: number, baseDelayMs: number = 1000, maxDelayMs: number = 60000): number {
  const delay = baseDelayMs * Math.pow(2, attempt - 1);
  return Math.min(delay, maxDelayMs);
}

export async function processWebhookDeliveryJob(job: Job<WebhookRetryJobData>) {
  const { endpointUrl, webhookSecret, payload } = job.data;
  const maxRetries = job.data.maxRetries ?? 5;
  const currentAttempt = job.data.currentAttempt ?? 1;

  console.log(
    `[WEBHOOK_RETRY_WORKER] Attempt ${currentAttempt}/${maxRetries} delivering event ${payload.event} (id: ${payload.eventId}) to ${endpointUrl}`
  );

  try {
    const result = await LeadWebhookEventService.dispatchWebhook(endpointUrl, webhookSecret, payload);

    if (result.success && result.statusCode >= 200 && result.statusCode < 300) {
      console.log(
        `[WEBHOOK_RETRY_WORKER] Successfully delivered webhook ${payload.eventId} to ${endpointUrl} (Status: ${result.statusCode})`
      );
      return { delivered: true, statusCode: result.statusCode, attempt: currentAttempt };
    } else {
      throw new Error(`Endpoint returned non-2xx status code: ${result.statusCode}`);
    }
  } catch (err: any) {
    const backoffDelay = calculateBackoffDelayMs(currentAttempt);
    console.warn(
      `[WEBHOOK_RETRY_WORKER] Webhook ${payload.eventId} failed on attempt ${currentAttempt}/${maxRetries}: ${err.message}. Retrying in ${backoffDelay}ms`
    );

    if (currentAttempt >= maxRetries) {
      console.error(`[WEBHOOK_RETRY_WORKER] Exhausted all ${maxRetries} retries for webhook ${payload.eventId}`);
      throw new Error(`Webhook delivery failed permanently after ${maxRetries} attempts: ${err.message}`);
    }

    return {
      delivered: false,
      attempt: currentAttempt,
      nextRetryDelayMs: backoffDelay,
      error: err.message,
    };
  }
}

export function createWebhookRetryWorker(redisUrl?: string) {
  const connection = new Redis(redisUrl || process.env.REDIS_URL || "redis://localhost:6379", {
    maxRetriesPerRequest: null,
  });

  const worker = new Worker<WebhookRetryJobData>(
    WEBHOOK_DELIVERY_QUEUE_NAME,
    async (job) => {
      return processWebhookDeliveryJob(job);
    },
    { connection }
  );

  worker.on("failed", (job, err) => {
    console.error(`[WEBHOOK_RETRY_WORKER] Webhook Job ${job?.id} failed permanently:`, err);
  });

  return worker;
}
