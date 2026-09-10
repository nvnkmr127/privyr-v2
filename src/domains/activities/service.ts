import { db } from "@/db";
import { activities } from "@/db/schema/activities";
import { eq, and, desc } from "drizzle-orm";

export class ActivityService {
  static async addActivity(data: { leadId: string; userId?: string; type: string; content?: string }) {
    const [activity] = await db.insert(activities).values({
      leadId: data.leadId,
      userId: data.userId,
      type: data.type,
      content: data.content,
    }).returning();
    return activity;
  }

  static async getLeadActivities(leadId: string) {
    return db.select().from(activities).where(eq(activities.leadId, leadId)).orderBy(desc(activities.createdAt));
  }

  static async deleteActivity(activityId: string, leadId: string) {
    const [deleted] = await db
      .delete(activities)
      .where(and(eq(activities.id, activityId), eq(activities.leadId, leadId)))
      .returning();
    return deleted;
  }

  static async updateActivity(activityId: string, leadId: string, content: string) {
    const [updated] = await db
      .update(activities)
      .set({ content, updatedAt: new Date() })
      .where(and(eq(activities.id, activityId), eq(activities.leadId, leadId)))
      .returning();
    return updated;
  }
}
