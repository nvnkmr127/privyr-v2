import { Queue, Worker, Job } from "bullmq";
import { createRedis, quietErrors } from "../redis";
import { EnrichmentService } from "@/domains/leads/enrichmentService";

const connection = createRedis({ maxRetriesPerRequest: null });

export const ENRICHMENT_QUEUE_NAME = "lead-enrichment";

export const enrichmentQueue = new Queue(ENRICHMENT_QUEUE_NAME, {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: true,
    removeOnFail: 100,
  },
});

export interface EnrichmentJobData {
  leadId: string;
}

// Consumer for the enrichment queue. Producer is the event bus (lead.created). Enrichment is a
// slow external call, so it runs here off the ingestion path — a provider outage never blocks
// lead creation, and BullMQ retries transient failures.
export function createEnrichmentWorker() {
  const worker = new Worker<EnrichmentJobData>(
    ENRICHMENT_QUEUE_NAME,
    async (job: Job<EnrichmentJobData>) => EnrichmentService.enrichLead(job.data.leadId),
    { connection, concurrency: 5 },
  );
  quietErrors(worker);
  return worker;
}
