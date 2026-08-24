import { Queue, QueueEvents } from "bullmq";
import Redis from "ioredis";

// Use singleton pattern for Redis connection to avoid too many connections in dev
const connection = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

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
