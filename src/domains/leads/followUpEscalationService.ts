import { db } from "@/db";
import { followUps, leads } from "@/db/schema";
import { and, eq, lt } from "drizzle-orm";
import { ActivityService } from "@/domains/activities/service";

export type EscalationSeverity = "medium" | "high" | "critical";

export interface OverdueFollowUpSummary {
  id: string;
  leadId: string;
  leadName: string;
  leadPhone: string | null;
  leadEmail: string | null;
  ownerId: string | null;
  dueAt: Date;
  hoursOverdue: number;
  severity: EscalationSeverity;
  description: string | null;
}

export class FollowUpEscalationService {
  /**
   * Detects pending follow-ups past their scheduled deadline and assigns escalation severity.
   */
  static async getOverdueFollowUps(organizationId: string): Promise<OverdueFollowUpSummary[]> {
    const now = new Date();

    const pendingFups = await db
      .select({
        id: followUps.id,
        leadId: followUps.leadId,
        dueAt: followUps.dueAt,
        description: followUps.description,
        userId: followUps.userId,
        leadName: leads.name,
        leadPhone: leads.phone,
        leadEmail: leads.email,
        leadOwnerId: leads.ownerId,
      })
      .from(followUps)
      .innerJoin(leads, eq(followUps.leadId, leads.id))
      .where(
        and(
          eq(leads.organizationId, organizationId),
          eq(followUps.status, "pending"),
          lt(followUps.dueAt, now)
        )
      );

    const nowMs = now.getTime();

    const results: OverdueFollowUpSummary[] = pendingFups.map((f) => {
      const scheduledMs = new Date(f.dueAt).getTime();
      const hoursOverdue = Math.floor((nowMs - scheduledMs) / (1000 * 60 * 60));

      let severity: EscalationSeverity = "medium";
      if (hoursOverdue >= 48) {
        severity = "critical";
      } else if (hoursOverdue >= 24) {
        severity = "high";
      }

      return {
        id: f.id,
        leadId: f.leadId,
        leadName: f.leadName,
        leadPhone: f.leadPhone,
        leadEmail: f.leadEmail,
        ownerId: f.userId || f.leadOwnerId,
        dueAt: new Date(f.dueAt),
        hoursOverdue,
        severity,
        description: f.description,
      };
    });

    results.sort((a, b) => b.hoursOverdue - a.hoursOverdue);
    return results;
  }

  /**
   * Escalates overdue follow-ups by logging urgency alerts in the lead activity timeline.
   */
  static async escalateOverdueFollowUps(
    organizationId: string,
    actorUserId?: string
  ): Promise<{ escalatedCount: number; criticalCount: number }> {
    const overdue = await this.getOverdueFollowUps(organizationId);
    if (overdue.length === 0) return { escalatedCount: 0, criticalCount: 0 };

    let criticalCount = 0;

    for (const f of overdue) {
      if (f.severity === "critical") criticalCount++;

      await ActivityService.addActivity({
        leadId: f.leadId,
        userId: actorUserId,
        type: "note",
        content: `ALERT: Scheduled follow-up is overdue by ${f.hoursOverdue} hours (Escalation level: ${f.severity.toUpperCase()}). Immediate contact required.`,
      });
    }

    return { escalatedCount: overdue.length, criticalCount };
  }
}
