import { db } from "@/db";
import { auditLogs, users } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";

export class AuditService {
  // Best-effort: an audit write must never break the action it records.
  static async log(input: {
    organizationId: string;
    userId?: string | null;
    action: string;
    entityType?: string;
    entityId?: string | null;
    metadata?: Record<string, unknown>;
  }) {
    try {
      await db.insert(auditLogs).values({
        organizationId: input.organizationId,
        userId: input.userId ?? null,
        action: input.action,
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
        metadata: input.metadata ?? {},
      });
    } catch (e) {
      console.error("[audit] failed to record", input.action, e);
    }
  }

  static async list(organizationId: string, limit = 100) {
    return db
      .select({
        id: auditLogs.id,
        action: auditLogs.action,
        entityType: auditLogs.entityType,
        entityId: auditLogs.entityId,
        metadata: auditLogs.metadata,
        createdAt: auditLogs.createdAt,
        actorEmail: users.email,
        actorFirst: users.firstName,
        actorLast: users.lastName,
      })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.userId, users.id))
      .where(eq(auditLogs.organizationId, organizationId))
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit);
  }
}
