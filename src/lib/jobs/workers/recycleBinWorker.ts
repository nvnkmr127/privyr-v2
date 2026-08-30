import { Worker, Queue } from "bullmq";
import Redis from "ioredis";
import { LeadService } from "@/domains/leads/service";

export const RECYCLE_BIN_QUEUE_NAME = "recycle-bin-purge";

export async function processRecycleBinJob() {
  const { purgedCount } = await LeadService.purgeExpired(30);
  if (purgedCount) console.log(`[RECYCLE_BIN_WORKER] Auto-purged ${purgedCount} leads deleted 30+ days ago`);
  return { purgedCount };
}

export function createRecycleBinWorker(redisUrl?: string) {
  const connection = new Redis(redisUrl || process.env.REDIS_URL || "redis://localhost:6379", { maxRetriesPerRequest: null });
  const worker = new Worker(RECYCLE_BIN_QUEUE_NAME, processRecycleBinJob, { connection });
  worker.on("failed", (job, err) => console.error(`[RECYCLE_BIN_WORKER] Job ${job?.id} failed:`, err));
  return worker;
}

// Daily scan that permanently removes leads soft-deleted more than 30 days ago.
export async function scheduleRecycleBinScan(redisUrl?: string) {
  const connection = new Redis(redisUrl || process.env.REDIS_URL || "redis://localhost:6379", { maxRetriesPerRequest: null });
  const queue = new Queue(RECYCLE_BIN_QUEUE_NAME, { connection });
  await queue.upsertJobScheduler("recycle-bin-scan", { every: 24 * 60 * 60 * 1000 }, { name: "scan", opts: { removeOnComplete: true, removeOnFail: 20 } });
  return queue;
}
