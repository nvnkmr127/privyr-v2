import { Worker, Job } from "bullmq";
import { REMINDER_QUEUE_NAME } from "../queue";
import Redis from "ioredis";
import { db } from "@/db";
import { reminders, followUps } from "@/db/schema";
import { eq } from "drizzle-orm";

const connection = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

export interface ReminderJobData {
  followUpId: string;
  reminderId: string;
}

export const reminderWorker = new Worker<ReminderJobData>(
  REMINDER_QUEUE_NAME,
  async (job: Job<ReminderJobData>) => {
    const { followUpId, reminderId } = job.data;

    console.log(`Processing reminder job ${job.id} for followUp: ${followUpId}`);

    // 1. Fetch the reminder to check idempotency
    const [reminder] = await db
      .select()
      .from(reminders)
      .where(eq(reminders.id, reminderId))
      .limit(1);

    if (!reminder) {
      console.warn(`Reminder ${reminderId} not found, skipping.`);
      return { status: "skipped", reason: "not_found" };
    }

    if (reminder.sentAt) {
      console.log(`Reminder ${reminderId} already sent at ${reminder.sentAt}, skipping.`);
      return { status: "skipped", reason: "already_sent" };
    }

    // 2. Fetch the FollowUp to verify it's still pending and not snoozed past now
    const [followUp] = await db
      .select()
      .from(followUps)
      .where(eq(followUps.id, followUpId))
      .limit(1);

    if (!followUp) {
      console.warn(`FollowUp ${followUpId} not found, skipping.`);
      return { status: "skipped", reason: "followup_not_found" };
    }

    if (followUp.status !== "pending") {
      console.log(`FollowUp ${followUpId} is ${followUp.status}, no reminder needed.`);
      return { status: "skipped", reason: `status_${followUp.status}` };
    }

    if (followUp.snoozedUntil && new Date() < new Date(followUp.snoozedUntil)) {
      console.log(`FollowUp ${followUpId} is snoozed until ${followUp.snoozedUntil}, skipping current reminder.`);
      // In a robust system, the snooze action itself should schedule a NEW reminder.
      return { status: "skipped", reason: "snoozed" };
    }

    // 3. Process Reminder Delivery (e.g., Email, In-app notification, Push)
    // For now, we mock delivery
    console.log(`[DELIVERY] Sending reminder to user ${followUp.userId} for Lead ${followUp.leadId}: ${followUp.title}`);
    
    // 4. Mark as sent (Idempotency protection)
    await db.update(reminders)
      .set({ sentAt: new Date() })
      .where(eq(reminders.id, reminderId));

    return { status: "success", deliveredAt: new Date() };
  },
  {
    connection,
    concurrency: 5,
  }
);

reminderWorker.on("completed", (job) => {
  console.log(`Job ${job.id} completed! Result:`, job.returnvalue);
});

reminderWorker.on("failed", (job, err) => {
  console.error(`Job ${job?.id} failed with error ${err.message}`);
});
