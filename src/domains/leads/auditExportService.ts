import { db } from "@/db";
import { leads, activities, followUps, whatsappMessages, users } from "@/db/schema";
import { and, eq, desc } from "drizzle-orm";

export interface AuditEvent {
  timestamp: Date;
  category: "lead_created" | "activity" | "follow_up" | "whatsapp";
  description: string;
  actor: string;
}

export class AuditExportService {
  /**
   * Generates a complete chronological audit trail for a lead.
   */
  static async getLeadAuditTrail(leadId: string, organizationId: string): Promise<AuditEvent[]> {
    const [lead] = await db
      .select({
        id: leads.id,
        name: leads.name,
        createdAt: leads.createdAt,
        ownerId: leads.ownerId,
      })
      .from(leads)
      .where(and(eq(leads.id, leadId), eq(leads.organizationId, organizationId)))
      .limit(1);

    if (!lead) throw new Error(`Lead ${leadId} not found`);

    const events: AuditEvent[] = [];

    // 1. Lead Created Event
    events.push({
      timestamp: lead.createdAt,
      category: "lead_created",
      description: `Lead "${lead.name}" ingested/created`,
      actor: "System",
    });

    // 2. Activities (notes, status changes, assignments)
    const actRows = await db
      .select({
        id: activities.id,
        type: activities.type,
        content: activities.content,
        createdAt: activities.createdAt,
        userFirstName: users.firstName,
        userLastName: users.lastName,
      })
      .from(activities)
      .leftJoin(users, eq(activities.userId, users.id))
      .where(eq(activities.leadId, leadId))
      .orderBy(desc(activities.createdAt));

    for (const act of actRows) {
      const actorName = [act.userFirstName, act.userLastName].filter(Boolean).join(" ");
      events.push({
        timestamp: act.createdAt,
        category: "activity",
        description: `[${act.type}] ${act.content ?? "Activity logged"}`,
        actor: actorName || "System",
      });
    }

    // 3. Scheduled Follow-ups
    const fupRows = await db
      .select({
        id: followUps.id,
        title: followUps.title,
        status: followUps.status,
        createdAt: followUps.createdAt,
      })
      .from(followUps)
      .where(eq(followUps.leadId, leadId))
      .orderBy(desc(followUps.createdAt));

    for (const fup of fupRows) {
      events.push({
        timestamp: fup.createdAt,
        category: "follow_up",
        description: `Follow-up created: "${fup.title}" (Status: ${fup.status})`,
        actor: "System",
      });
    }

    // 4. WhatsApp Messages
    const msgRows = await db
      .select({
        id: whatsappMessages.id,
        direction: whatsappMessages.direction,
        body: whatsappMessages.body,
        status: whatsappMessages.status,
        createdAt: whatsappMessages.createdAt,
      })
      .from(whatsappMessages)
      .where(eq(whatsappMessages.leadId, leadId))
      .orderBy(desc(whatsappMessages.createdAt));

    for (const msg of msgRows) {
      events.push({
        timestamp: msg.createdAt,
        category: "whatsapp",
        description: `WhatsApp [${msg.direction}]: ${msg.body ?? ""} (Status: ${msg.status})`,
        actor: msg.direction === "inbound" ? "Lead" : "User/System",
      });
    }

    // Sort chronologically (newest first)
    events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return events;
  }
}
