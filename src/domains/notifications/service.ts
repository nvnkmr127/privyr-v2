import { db } from "@/db";
import { notifications } from "@/db/schema";
import { and, desc, eq, isNull, inArray } from "drizzle-orm";

export class NotificationService {
  static async create(data: { userId: string; type: string; title: string; body?: string; leadId?: string }) {
    const [row] = await db.insert(notifications).values(data).returning();
    // Best-effort browser push for closed-tab delivery; the in-app bell is the source of truth.
    const { PushService } = await import("@/lib/push/service");
    void PushService.sendToUser(data.userId, {
      title: data.title,
      body: data.body,
      url: data.leadId ? `/leads/${data.leadId}` : "/",
    });
    return row;
  }

  static async listForUser(userId: string, opts: { unreadOnly?: boolean; limit?: number } = {}) {
    const where = opts.unreadOnly
      ? and(eq(notifications.userId, userId), isNull(notifications.readAt))
      : eq(notifications.userId, userId);
    return db.select().from(notifications)
      .where(where)
      .orderBy(desc(notifications.createdAt))
      .limit(opts.limit ?? 50);
  }

  static async unreadCount(userId: string) {
    const rows = await db.select({ id: notifications.id }).from(notifications)
      .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
    return rows.length;
  }

  // Mark specific ids read, or all of the user's if ids omitted. Scoped to userId either way.
  static async markRead(userId: string, ids?: string[]) {
    const scope = ids?.length
      ? and(eq(notifications.userId, userId), inArray(notifications.id, ids))
      : and(eq(notifications.userId, userId), isNull(notifications.readAt));
    await db.update(notifications).set({ readAt: new Date() }).where(scope);
  }
}
