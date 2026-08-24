import { db } from "@/db";
import { activities } from "@/db/schema/activities";
import { eq, desc } from "drizzle-orm";

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
}
