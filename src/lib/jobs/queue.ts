import { Queue, QueueEvents } from "bullmq";
import { createRedis, quietErrors } from "./redis";

const connection = createRedis({ maxRetriesPerRequest: null });

export const REMINDER_QUEUE_NAME = "follow-up-reminders";

export const reminderQueue = new Queue(REMINDER_QUEUE_NAME, {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 1000,
    },
    removeOnComplete: true,
    removeOnFail: false,
  },
});

export const reminderQueueEvents = new QueueEvents(REMINDER_QUEUE_NAME, { connection });
quietErrors(reminderQueueEvents);
