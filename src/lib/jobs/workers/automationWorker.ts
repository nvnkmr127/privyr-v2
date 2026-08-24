import { Queue, Worker, Job } from "bullmq";
import Redis from "ioredis";
import { db } from "@/db";
import { automationRuns } from "@/db/schema";
import { eq } from "drizzle-orm";
import { AutomationEngine } from "@/lib/automation/engine";
import { EventPayload } from "@/lib/events/emitter";

const connection = new Redis(process.env.REDIS_URL || "redis://localhost:6379", { maxRetriesPerRequest: null });

export const AUTOMATION_QUEUE_NAME = "automations";
export const automationQueue = new Queue(AUTOMATION_QUEUE_NAME, { connection });

export interface AutomationJobData {
  automationId: string;
  leadId: string;
  triggerType: string;
  idempotencyKey: string;
  payload: EventPayload;
}

export const automationWorker = new Worker<AutomationJobData>(
  AUTOMATION_QUEUE_NAME,
  async (job: Job<AutomationJobData>) => {
    const { automationId, leadId, idempotencyKey, payload } = job.data;

    // 1. Check Idempotency (Prevent double runs)
    const [existingRun] = await db
      .select()
      .from(automationRuns)
      .where(eq(automationRuns.idempotencyKey, idempotencyKey))
      .limit(1);

    if (existingRun && existingRun.status === 'completed') {
      return { status: 'skipped', reason: 'already_run' };
    }

    // Register or get the run record
    let runId = existingRun?.id;
    if (!existingRun) {
      const [newRun] = await db.insert(automationRuns).values({
        automationId,
        leadId,
        idempotencyKey,
        status: 'running',
      }).returning();
      runId = newRun.id;
    } else {
      await db.update(automationRuns)
        .set({ status: 'running', retryCount: existingRun.retryCount + 1 })
        .where(eq(automationRuns.id, runId!));
    }

    try {
      // 2. Evaluate & Execute
      const result = await AutomationEngine.evaluateAndExecute(automationId, leadId, payload);

      if (result.skipped) {
        await db.update(automationRuns)
          .set({ status: 'skipped', error: 'Conditions not met', completedAt: new Date() })
          .where(eq(automationRuns.id, runId!));
        return { status: 'skipped', reason: 'conditions_not_met' };
      }

      await db.update(automationRuns)
        .set({ status: 'completed', completedAt: new Date() })
        .where(eq(automationRuns.id, runId!));

      return { status: 'completed', executedActions: result.executedCount };

    } catch (error: any) {
      await db.update(automationRuns)
        .set({ 
          status: 'failed', 
          error: error.stack || error.message,
          completedAt: new Date() 
        })
        .where(eq(automationRuns.id, runId!));
        
      throw error; // Let BullMQ handle the retry based on its config
    }
  },
  { connection, concurrency: 3 }
);
