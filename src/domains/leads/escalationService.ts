import { db } from "@/db";
import { leads, organizations } from "@/db/schema";
import { and, eq, isNull, isNotNull, lt } from "drizzle-orm";
import { NotificationService } from "@/domains/notifications/service";
import { AuditService } from "@/domains/audit/service";

// Escalates leads that have sat in "new" past the org's SLA window. Idempotent per lead via
// leads.escalatedAt, so re-running the scan never double-alerts.
export class EscalationService {
  static async runForOrg(organizationId: string): Promise<number> {
    const [org] = await db.select({ slaHours: organizations.slaHours }).from(organizations).where(eq(organizations.id, organizationId)).limit(1);
    const hours = org?.slaHours;
    if (!hours || hours <= 0) return 0;

    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    const stale = await db
      .select({ id: leads.id, name: leads.name, ownerId: leads.ownerId })
      .from(leads)
      .where(and(
        eq(leads.organizationId, organizationId),
        eq(leads.status, "new"),
        isNull(leads.escalatedAt),
        lt(leads.createdAt, cutoff),
      ));

    for (const lead of stale) {
      await db.update(leads).set({ escalatedAt: new Date() }).where(eq(leads.id, lead.id));
      if (lead.ownerId) {
        await NotificationService.create({
          userId: lead.ownerId,
          type: "sla_escalation",
          title: "Lead needs attention",
          body: `${lead.name} has been waiting longer than your ${hours}h SLA.`,
          leadId: lead.id,
        });
      }
      await AuditService.log({ organizationId, action: "lead.sla_escalated", entityType: "lead", entityId: lead.id, metadata: { hours } });
    }
    return stale.length;
  }

  // Sweep every org that has an SLA configured. Call this from a periodic worker job.
  static async runAll(): Promise<number> {
    const orgs = await db.select({ id: organizations.id }).from(organizations).where(isNotNull(organizations.slaHours));
    let total = 0;
    for (const o of orgs) total += await this.runForOrg(o.id);
    return total;
  }
}
