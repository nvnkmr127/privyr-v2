import { Worker, Queue, Job } from "bullmq";
import Redis from "ioredis";
import { ScoringService } from "@/domains/leads/scoringService";

export const SCORE_DECAY_QUEUE_NAME = "score-decay";

export interface ScoreDecayJobData {
  organizationId?: string;
  leadId?: string;
}

export async function processScoreDecayJob(job: Job<ScoreDecayJobData>) {
  console.log(`[SCORE_DECAY_WORKER] Processing score decay job ${job.id}`);

  if (job.data?.leadId) {
    const score = await ScoringService.updateLeadScore(job.data.leadId);
    console.log(`[SCORE_DECAY_WORKER] Recalculated score for lead ${job.data.leadId}: ${score}`);
    return { leadId: job.data.leadId, score };
  }

  const count = await ScoringService.recalculateAllScores(job.data?.organizationId);
  console.log(`[SCORE_DECAY_WORKER] Processed score decay for ${count} leads (Org: ${job.data?.organizationId ?? "all"})`);
  return { processed: count };
}

export function createScoreDecayWorker(redisUrl?: string) {
  const connection = new Redis(redisUrl || process.env.REDIS_URL || "redis://localhost:6379", {
    maxRetriesPerRequest: null,
  });

  const worker = new Worker<ScoreDecayJobData>(
    SCORE_DECAY_QUEUE_NAME,
    async (job) => {
      return processScoreDecayJob(job);
    },
    { connection }
  );

  worker.on("failed", (job, err) => {
    console.error(`[SCORE_DECAY_WORKER] Job ${job?.id} failed with error:`, err);
  });

  return worker;
}

// Producer: a daily repeating job that recalculates scores across all orgs. Without this the
// worker has nothing to consume. Call once at startup alongside createScoreDecayWorker().
export async function scheduleScoreDecayScan(redisUrl?: string) {
  const connection = new Redis(redisUrl || process.env.REDIS_URL || "redis://localhost:6379", { maxRetriesPerRequest: null });
  const queue = new Queue(SCORE_DECAY_QUEUE_NAME, { connection });
  await queue.upsertJobScheduler("score-decay-daily", { every: 24 * 60 * 60 * 1000 }, { name: "decay", opts: { removeOnComplete: true, removeOnFail: 20 } });
  return queue;
}
