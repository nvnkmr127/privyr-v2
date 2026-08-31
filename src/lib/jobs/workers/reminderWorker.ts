import { Worker, Job } from "bullmq";
import { REMINDER_QUEUE_NAME } from "../queue";
import { createRedis, quietErrors } from "../redis";
import { db } from "@/db";
import { reminders, followUps, leads } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NotificationService } from "@/domains/notifications/service";
import { ActivityService } from "@/domains/activities/service";

const connection = createRedis({ maxRetriesPerRequest: null });

export interface ReminderJobData {
  followUpId: string;
  reminderId: string;
}

export async function processReminderJob(data: ReminderJobData, jobId?: string) {
  const { followUpId, reminderId } = data;

  console.log(`[REMINDER_WORKER] Processing reminder job ${jobId ?? 'direct'} for followUp: ${followUpId}`);

  // 1. Fetch the reminder to check idempotency
  const [reminder] = await db
    .select()
    .from(reminders)
    .where(eq(reminders.id, reminderId))
    .limit(1);

  if (!reminder) {
    console.warn(`[REMINDER_WORKER] Reminder ${reminderId} not found, skipping.`);
    return { status: "skipped", reason: "not_found" };
  }

  if (reminder.sentAt) {
    console.log(`[REMINDER_WORKER] Reminder ${reminderId} already sent at ${reminder.sentAt}, skipping.`);
    return { status: "skipped", reason: "already_sent" };
  }

  // 2. Fetch the FollowUp to verify it's still pending and not snoozed past now
  const [followUp] = await db
    .select()
    .from(followUps)
    .where(eq(followUps.id, followUpId))
    .limit(1);

  if (!followUp) {
    console.warn(`[REMINDER_WORKER] FollowUp ${followUpId} not found, skipping.`);
    return { status: "skipped", reason: "followup_not_found" };
  }

  if (followUp.status !== "pending") {
    console.log(`[REMINDER_WORKER] FollowUp ${followUpId} is ${followUp.status}, no reminder needed.`);
    return { status: "skipped", reason: `status_${followUp.status}` };
  }

  if (followUp.snoozedUntil && new Date() < new Date(followUp.snoozedUntil)) {
    console.log(`[REMINDER_WORKER] FollowUp ${followUpId} is snoozed until ${followUp.snoozedUntil}, skipping current reminder.`);
    return { status: "skipped", reason: "snoozed" };
  }

  // 3. Resolve associated Lead & Tenant Organization
  const [lead] = await db
    .select()
    .from(leads)
    .where(eq(leads.id, followUp.leadId))
    .limit(1);

  if (!lead) {
    console.warn(`[REMINDER_WORKER] Lead ${followUp.leadId} not found for followUp ${followUpId}, skipping.`);
    return { status: "skipped", reason: "lead_not_found" };
  }

  if (!lead.organizationId) {
    console.warn(`[REMINDER_WORKER] Lead ${lead.id} lacks organizationId, skipping.`);
    return { status: "skipped", reason: "missing_organization" };
  }

  // 4. Resolve Lead owner / target user
  const targetUserId = followUp.userId || lead.ownerId;
  if (!targetUserId) {
    console.warn(`[REMINDER_WORKER] No owner assigned for followUp ${followUpId} (lead ${lead.id}), skipping.`);
    return { status: "skipped", reason: "missing_owner" };
  }

  // 5. Create in-app notification & web push (via NotificationService)
  const notificationTitle = `Follow-up due: ${followUp.title}`;
  const notificationBody = `Follow up with ${lead.name} (${followUp.type})`;

  const notification = await NotificationService.create({
    userId: targetUserId,
    type: 'follow_up_due',
    title: notificationTitle,
    body: notificationBody,
    leadId: lead.id,
  });

  // 6. Record Activity timeline event
  await ActivityService.addActivity({
    leadId: lead.id,
    userId: targetUserId,
    type: 'note',
    content: `Reminder sent: ${followUp.title}`,
  });

  // 7. Mark reminder as sent (Idempotency protection)
  const deliveredAt = new Date();
  await db.update(reminders)
    .set({ sentAt: deliveredAt })
    .where(eq(reminders.id, reminderId));

  console.log(`[REMINDER_WORKER] Delivered reminder ${reminderId} to user ${targetUserId} for Lead ${lead.id} (Org: ${lead.organizationId}). NotificationId: ${notification.id}`);

  return {
    status: "success",
    deliveredAt,
    notificationId: notification.id,
    targetUserId,
    leadId: lead.id,
    organizationId: lead.organizationId,
  };
}

export const reminderWorker = new Worker<ReminderJobData>(
  REMINDER_QUEUE_NAME,
  async (job: Job<ReminderJobData>) => {
    return processReminderJob(job.data, job.id);
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
quietErrors(reminderWorker);

