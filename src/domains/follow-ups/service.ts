import { db } from "@/db";
import { followUps, reminders } from "@/db/schema";
import { eq } from "drizzle-orm";
import { reminderQueue } from "@/lib/jobs/queue";
import { eventBus } from "@/lib/events/emitter";

export class FollowUpService {
  static async createFollowUp(input: {
    leadId: string;
    type: string;
    title: string;
    description?: string;
    dueAt: Date;
    userId: string;
  }) {
    const [followUp] = await db.insert(followUps).values({
      leadId: input.leadId,
      type: input.type,
      title: input.title,
      description: input.description || null,
      dueAt: input.dueAt,
      userId: input.userId,
      status: "pending",
    }).returning();

    // Schedule a reminder 15 minutes before due date
    const remindAt = new Date(input.dueAt.getTime() - 15 * 60000);
    
    const [reminder] = await db.insert(reminders).values({
      followUpId: followUp.id,
      remindAt,
    }).returning();

    const delay = Math.max(0, remindAt.getTime() - Date.now());

    await reminderQueue.add(
      `reminder-${reminder.id}`,
      { followUpId: followUp.id, reminderId: reminder.id },
      { delay }
    );

    eventBus.emit('follow_up.scheduled', {
      leadId: followUp.leadId,
      userId: followUp.userId || undefined,
      followUpId: followUp.id,
      type: followUp.type,
      title: followUp.title,
    });

    return followUp;
  }

  static async completeFollowUp(id: string) {
    const [updated] = await db.update(followUps)
      .set({ 
        status: "completed", 
        completedAt: new Date(), 
        updatedAt: new Date() 
      })
      .where(eq(followUps.id, id))
      .returning();
      
    if (updated) {
      if (updated.type.toLowerCase() === 'task') {
        eventBus.emit('task.completed', {
          leadId: updated.leadId,
          userId: updated.userId || undefined,
          followUpId: updated.id,
          type: updated.type,
          title: updated.title,
        });
      } else {
        eventBus.emit('follow_up.completed', {
          leadId: updated.leadId,
          userId: updated.userId || undefined,
          followUpId: updated.id,
          type: updated.type,
          title: updated.title,
        });
      }
    }

    return updated;
  }

  static async cancelFollowUp(id: string) {
    const [updated] = await db.update(followUps)
      .set({ 
        status: "cancelled", 
        updatedAt: new Date() 
      })
      .where(eq(followUps.id, id))
      .returning();

    return updated;
  }

  static async snoozeFollowUp(id: string, snoozedUntil: Date) {
    const [updated] = await db.update(followUps)
      .set({ 
        snoozedUntil, 
        status: "pending", // Reset to pending
        updatedAt: new Date() 
      })
      .where(eq(followUps.id, id))
      .returning();

    return updated;
  }

  static async rescheduleFollowUp(id: string, dueAt: Date) {
    const [updated] = await db.update(followUps)
      .set({ 
        dueAt, 
        snoozedUntil: null, // clear snooze on reschedule
        updatedAt: new Date() 
      })
      .where(eq(followUps.id, id))
      .returning();

    if (updated) {
      eventBus.emit('follow_up.rescheduled', {
        leadId: updated.leadId,
        userId: updated.userId || undefined,
        followUpId: updated.id,
        type: updated.type,
        title: updated.title,
      });
    }

    return updated;
  }

  static async assignFollowUp(id: string, userId: string) {
    const [updated] = await db.update(followUps)
      .set({ 
        userId, 
        updatedAt: new Date() 
      })
      .where(eq(followUps.id, id))
      .returning();

    return updated;
  }
}
