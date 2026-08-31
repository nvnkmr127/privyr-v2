import { Worker, Queue } from "bullmq";
import { createRedis, quietErrors } from "../redis";
import { EscalationService } from "@/domains/leads/escalationService";

export const ESCALATION_QUEUE_NAME = "sla-escalation";

export async function processEscalationJob() {
  const count = await EscalationService.runAll();
  console.log(`[ESCALATION_WORKER] Escalated ${count} stale leads`);
  return { escalated: count };
}

export function createEscalationWorker(redisUrl?: string) {
  const connection = createRedis({ maxRetriesPerRequest: null }, redisUrl);
  const worker = new Worker(ESCALATION_QUEUE_NAME, processEscalationJob, { connection });
  worker.on("failed", (job, err) => console.error(`[ESCALATION_WORKER] Job ${job?.id} failed:`, err));
  quietErrors(worker);
  return worker;
}

// Register a repeating scan (every 15 min). Call once from your worker runner alongside the others.
export async function scheduleEscalationScan(redisUrl?: string) {
  const connection = createRedis({ maxRetriesPerRequest: null }, redisUrl);
  const queue = new Queue(ESCALATION_QUEUE_NAME, { connection });
  // BullMQ v6 job scheduler — a single repeating "scan" job every 15 minutes.
  await queue.upsertJobScheduler("sla-scan", { every: 15 * 60 * 1000 }, { name: "scan", opts: { removeOnComplete: true, removeOnFail: 20 } });
  return queue;
}
