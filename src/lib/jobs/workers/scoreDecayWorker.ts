import { Worker, Queue, Job } from "bullmq";
import { createRedis, quietErrors } from "../redis";
import { ScoringService } from "@/domains/leads/scoringService";
import { db } from "@/db";
import { automationRuns } from "@/db/schema";
import { and, lt, inArray } from "drizzle-orm";

export const SCORE_DECAY_QUEUE_NAME = "score-decay";

// The automation_runs ledger grows with every trigger and is only ever read for the idempotency
// check (which the completed row satisfies) — terminal rows older than the window are dead weight.
// ponytail: piggybacked on the daily scan instead of a second scheduler; raise RETENTION_DAYS or
// split it out if run volume ever makes the single daily DELETE too heavy.
const RETENTION_DAYS = 30;
export async function pruneOldAutomationRuns(retentionDays = RETENTION_DAYS) {
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
  const deleted = await db
    .delete(automationRuns)
    .where(and(lt(automationRuns.startedAt, cutoff), inArray(automationRuns.status, ["completed", "skipped", "failed"])))
    .returning({ id: automationRuns.id });
  return deleted.length;
}

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
  // Daily housekeeping slot: trim the automation_runs ledger while we're here (all-orgs pass only).
  const prunedRuns = await pruneOldAutomationRuns().catch((e) => {
    console.error("[SCORE_DECAY_WORKER] automation_runs prune failed:", e);
    return 0;
  });
  console.log(`[SCORE_DECAY_WORKER] Processed score decay for ${count} leads (Org: ${job.data?.organizationId ?? "all"}); pruned ${prunedRuns} old automation runs`);
  return { processed: count, prunedRuns };
}

export function createScoreDecayWorker(redisUrl?: string) {
  const connection = createRedis({ maxRetriesPerRequest: null }, redisUrl);

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
  quietErrors(worker);

  return worker;
}

// Producer: a daily repeating job that recalculates scores across all orgs. Without this the
// worker has nothing to consume. Call once at startup alongside createScoreDecayWorker().
export async function scheduleScoreDecayScan(redisUrl?: string) {
  const connection = createRedis({ maxRetriesPerRequest: null }, redisUrl);
  const queue = new Queue(SCORE_DECAY_QUEUE_NAME, { connection });
  await queue.upsertJobScheduler("score-decay-daily", { every: 24 * 60 * 60 * 1000 }, { name: "decay", opts: { removeOnComplete: true, removeOnFail: 20 } });
  return queue;
}
