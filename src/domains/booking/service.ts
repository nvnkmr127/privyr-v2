import { db } from "@/db";
import { organizations, leads, activities } from "@/db/schema";
import { and, eq, or } from "drizzle-orm";
import { LeadService } from "@/domains/leads/service";
import { NotificationService } from "@/domains/notifications/service";
import { GoogleCalendarService } from "@/domains/integrations/googleCalendarService";

export class BookingService {
  // Public info for the booking page — just the org name, resolved by slug.
  static async getOrgBySlug(slug: string) {
    const [org] = await db.select({ id: organizations.id, name: organizations.name }).from(organizations).where(eq(organizations.slug, slug)).limit(1);
    return org ?? null;
  }

  // A prospect requests a meeting. Creates the lead (or reuses an existing match), records the
  // request on the timeline, and sets the next follow-up. Queue-free so it works on the public path.
  static async request(slug: string, input: { name: string; email?: string; phone?: string; when: Date; message?: string }) {
    const org = await this.getOrgBySlug(slug);
    if (!org) throw new Error("Unknown booking link");

    // Reuse an existing lead with the same email/phone; otherwise create one.
    let leadId: string | null = null;
    let ownerId: string | null = null;
    if (input.email || input.phone) {
      const conds = [];
      if (input.email) conds.push(eq(leads.email, input.email));
      if (input.phone) conds.push(eq(leads.phone, input.phone));
      const [existing] = await db.select({ id: leads.id, ownerId: leads.ownerId }).from(leads)
        .where(and(eq(leads.organizationId, org.id), or(...conds))).limit(1);
      if (existing) { leadId = existing.id; ownerId = existing.ownerId; }
    }

    if (!leadId) {
      const lead = await LeadService.createLead(
        { name: input.name, email: input.email, phone: input.phone },
        null,
        org.id,
      );
      leadId = lead.id;
      ownerId = lead.ownerId;
    }

    await db.insert(activities).values({
      leadId,
      type: "meeting",
      content: `Meeting requested for ${input.when.toLocaleString()}${input.message ? ` — "${input.message}"` : ""}`,
    });
    await db.update(leads).set({ nextFollowUpAt: input.when, updatedAt: new Date() }).where(eq(leads.id, leadId));

    if (ownerId) {
      await NotificationService.create({
        userId: ownerId, type: "lead_assigned", leadId,
        title: "New meeting request", body: `${input.name} requested a meeting for ${input.when.toLocaleString()}.`,
      });
      // Sync to the owner's Google Calendar if they've connected it (best-effort, 30-min slot).
      void GoogleCalendarService.createEvent(ownerId, {
        summary: `Meeting with ${input.name}`,
        description: input.message,
        start: input.when,
        end: new Date(input.when.getTime() + 30 * 60 * 1000),
        attendeeEmail: input.email,
      });
    }
    return { ok: true };
  }
}
